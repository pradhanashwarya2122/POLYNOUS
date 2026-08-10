"""
app/routes/report_chat.py — "Chat with your report".

A follow-up Q&A endpoint that answers questions about a research report using
ONLY the material already fetched for that run (the synthesized report + the
per-source summaries the client received in the final stream frame). It never
touches the web and never re-runs the agent pipeline, so it is cheap and fast
and provably grounded in what the user already saw.

Strict BYO-key policy, identical to the streaming research endpoints: an
authenticated user must answer on their own key; there is no silent system-key
charge.
"""
import json

from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.encryption import decrypt_api_key
from app.utils.sanitizer import sanitize_query, is_safe_input
from app.llm_providers import LLM_PROVIDERS
from app.routes.auth import decode_token

router = APIRouter()

_STYLE_HINT = {
    "academic": "Use precise, formal, academic language.",
    "technical": "Be technical and specific; assume an expert reader.",
    "eli5": "Explain simply, as if to a curious 12-year-old. Short sentences, everyday words.",
    "casual": "Be friendly and conversational.",
}


def _resolve_user_key(request: Request, db: Session):
    """Return (user, provider, api_key). Mirrors ask_visual's matched-pair
    resolution so provider and key always travel together."""
    user, provider, api_key = None, "anthropic", None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            payload = decode_token(token, expected_type="access")
            user = db.query(User).filter(User.id == int(payload.get("sub", 0))).first()
            if user:
                preferred = getattr(user, "preferred_provider", "anthropic") or "anthropic"
                for p in [preferred] + [x for x in LLM_PROVIDERS if x != preferred]:
                    enc = getattr(user, f"{p}_api_key", None)
                    if enc:
                        dec = decrypt_api_key(enc, user.encryption_key)
                        if dec:
                            provider, api_key = p, dec
                            break
        except Exception:
            pass
    return user, provider, api_key


def _build_context(report_answer: str, source_summaries: list, citations: list) -> str:
    parts = []
    if report_answer:
        parts.append("=== RESEARCH REPORT ===\n" + str(report_answer)[:6000])
    if source_summaries:
        parts.append("=== SOURCE SUMMARIES (the only evidence you may use) ===")
        for i, s in enumerate(source_summaries[:12], 1):
            title = (s.get("title") or "").strip()
            url = (s.get("url") or "").strip()
            summ = (s.get("summary") or "").strip()
            if not summ:
                continue
            parts.append(f"[{i}] {title}\n{url}\n{summ[:1200]}")
    elif citations:
        # Fallback: only titles/urls available (older run) — still constrain scope.
        parts.append("=== CITED SOURCES ===")
        for i, c in enumerate(citations[:12], 1):
            parts.append(f"[{i}] {(c.get('title') or '')} — {(c.get('url') or '')}")
    return "\n\n".join(parts)


@router.post("/report/chat")
async def report_chat(request: Request, db: Session = Depends(get_db)):
    """Answer a follow-up question grounded strictly in a completed report."""
    body = await request.json()
    question = (body.get("question") or "").strip()
    report_answer = body.get("report_answer") or ""
    source_summaries = body.get("source_summaries") or []
    citations = body.get("citations") or []
    response_style = (body.get("response_style") or "").lower()

    if not question or not is_safe_input(question):
        raise HTTPException(400, "Invalid or empty question")
    question = sanitize_query(question)

    context = _build_context(report_answer, source_summaries, citations)
    if not context.strip():
        raise HTTPException(400, "No report context provided to ground the answer")

    user, provider, api_key = _resolve_user_key(request, db)
    if user is not None and not api_key:
        raise HTTPException(
            400,
            "No API key configured for your account. Add your key in Settings to "
            "chat with your report.",
        )
    if user is None:
        raise HTTPException(401, "Sign in to chat with your report")

    style_hint = _STYLE_HINT.get(response_style, "")
    system_prompt = (
        "You are POLYNOUS's report assistant. Answer the user's follow-up question "
        "using ONLY the research report and source summaries provided below. "
        "You must NOT use outside knowledge or invent facts. If the answer is not "
        "supported by the provided material, say so plainly (e.g. \"The report "
        "doesn't cover that\") and, if useful, suggest running a fresh research query. "
        "Cite sources inline as [n] using the numbered summaries when you draw on them. "
        f"{style_hint}\n\n{context}"
    )

    # Provider-complete call: build the client from the resolved (provider,
    # api_key) so this works with EVERY key the Settings page allows — not just
    # OpenAI/Anthropic. OpenAI-compatible gateways (Groq/Mistral/NVIDIA/
    # DeepSeek/Gemini) go through the OpenAI client with their base_url, the
    # user's chosen model, and openai_compat's param self-healing.
    from app.llm_providers import resolve_provider, resolve_model
    client_type, base_url = resolve_provider(provider)
    used_model = resolve_model(user, provider)
    try:
        if client_type == "openai":
            from openai import OpenAI
            from app.utils.openai_compat import openai_chat
            oc = OpenAI(api_key=api_key, **({"base_url": base_url} if base_url else {}))
            resp = openai_chat(
                oc, model=used_model,
                messages=[{"role": "system", "content": system_prompt},
                          {"role": "user", "content": question}],
                max_tokens=700, temperature=0.3,
            )
            answer = resp.choices[0].message.content
        else:
            from anthropic import Anthropic
            ac = Anthropic(api_key=api_key)
            msg = ac.messages.create(
                model=used_model, max_tokens=700, temperature=0.3,
                system=system_prompt,
                messages=[{"role": "user", "content": question}],
            )
            answer = msg.content[0].text
    except Exception as e:
        raise HTTPException(502, f"Report chat failed: {e}")

    return {"answer": (answer or "").strip(), "grounded": True, "provider": provider}


@router.post("/report/verify-claim")
async def verify_claim(request: Request, db: Session = Depends(get_db)):
    """Phase F — NLI faithfulness. Judge whether a source ENTAILS, CONTRADICTS,
    or is NEUTRAL toward a claim (real entailment, beyond citation counting)."""
    body = await request.json()
    claim = (body.get("claim") or "").strip()
    evidence = (body.get("evidence") or "").strip()
    if not claim or not evidence:
        raise HTTPException(400, "claim and evidence are required")

    user, provider, api_key = _resolve_user_key(request, db)
    if user is None:
        raise HTTPException(401, "Sign in to verify claims.")
    if not api_key:
        raise HTTPException(400, "No API key configured for your account. Add your key in Settings.")

    system_prompt = (
        "You are a natural-language-inference judge. Given EVIDENCE and a CLAIM, decide whether the "
        "evidence entails, contradicts, or is neutral toward the claim. Return ONLY raw JSON: "
        '{"label": "entailment|contradiction|neutral", "confidence": 0..1, "why": "one short sentence"}.'
    )
    question = f"EVIDENCE:\n{evidence[:2000]}\n\nCLAIM:\n{claim[:600]}"

    from app.llm_providers import resolve_provider, resolve_model
    client_type, base_url = resolve_provider(provider)
    used_model = resolve_model(user, provider)
    try:
        if client_type == "openai":
            from openai import OpenAI
            from app.utils.openai_compat import openai_chat
            oc = OpenAI(api_key=api_key, **({"base_url": base_url} if base_url else {}))
            resp = openai_chat(oc, model=used_model,
                               messages=[{"role": "system", "content": system_prompt},
                                         {"role": "user", "content": question}],
                               max_tokens=200, temperature=0.0)
            raw = resp.choices[0].message.content
        else:
            from anthropic import Anthropic
            ac = Anthropic(api_key=api_key)
            msg = ac.messages.create(model=used_model, max_tokens=200, temperature=0.0,
                                     system=system_prompt, messages=[{"role": "user", "content": question}])
            raw = msg.content[0].text
    except Exception as e:
        raise HTTPException(502, f"Claim verification failed: {e}")

    import re as _re
    label, conf, why = "neutral", 0.5, ""
    try:
        m = _re.search(r"\{.*\}", raw or "", _re.DOTALL)
        data = json.loads(m.group(0)) if m else {}
        lb = str(data.get("label", "neutral")).lower()
        label = lb if lb in ("entailment", "contradiction", "neutral") else "neutral"
        conf = max(0.0, min(1.0, float(data.get("confidence", 0.5))))
        why = str(data.get("why", ""))[:240]
    except Exception:
        pass
    return {"label": label, "confidence": round(conf, 2), "why": why, "provider": provider}
