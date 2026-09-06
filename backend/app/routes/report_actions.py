"""
app/routes/report_actions.py — post-report interactive actions.

Three grounded, BYO-key endpoints:

- POST /report/debate-against    Devil's-advocate rebuttal of the report.
- POST /report/perspective       Reframe the report through a chosen lens.
- POST /debate/cross-exam        User poses a question to both advocates and
                                 the judge scores the two answers.

All endpoints reuse the same key-resolution and provider-completion pattern as
report_chat.py, so they work with any provider the Settings page allows.
"""
import json

from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.sanitizer import sanitize_query, is_safe_input
from app.routes.report_chat import _resolve_user_key, _build_context


router = APIRouter()


def _call_llm(user, provider, api_key, system_prompt, user_prompt,
              max_tokens=700, temperature=0.4):
    """Provider-agnostic single-turn completion. Mirrors report_chat."""
    from app.llm_providers import resolve_provider, resolve_model
    client_type, base_url = resolve_provider(provider)
    used_model = resolve_model(user, provider)
    if client_type == "openai":
        from openai import OpenAI
        from app.utils.openai_compat import openai_chat
        oc = OpenAI(api_key=api_key, **({"base_url": base_url} if base_url else {}))
        resp = openai_chat(
            oc, model=used_model,
            messages=[{"role": "system", "content": system_prompt},
                      {"role": "user", "content": user_prompt}],
            max_tokens=max_tokens, temperature=temperature,
        )
        return (resp.choices[0].message.content or "").strip()
    from anthropic import Anthropic
    ac = Anthropic(api_key=api_key)
    msg = ac.messages.create(
        model=used_model, max_tokens=max_tokens, temperature=temperature,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return (msg.content[0].text or "").strip()


def _require_key(user, api_key):
    if user is None:
        raise HTTPException(401, "Sign in to use this action.")
    if not api_key:
        raise HTTPException(
            400,
            "No API key configured for your account. Add your key in Settings.",
        )


PERSPECTIVE_LENSES = {
    "skeptic": "a rigorous, evidence-first skeptic who challenges assumptions and demands proof",
    "contrarian": "a thoughtful contrarian who argues the strongest opposite case in good faith",
    "futurist": "a long-horizon futurist reading second-order and 10-year effects",
    "practitioner": "a hands-on practitioner focused on what actually ships and works in the field",
    "historian": "a historian who anchors the topic in precedent and long-run patterns",
    "ethicist": "an ethicist weighing harm, fairness, consent, and downstream impact",
}


@router.post("/report/debate-against")
async def debate_against(request: Request, db: Session = Depends(get_db)):
    """Return a structured devil's-advocate rebuttal of the report."""
    body = await request.json()
    report_answer = body.get("report_answer") or ""
    source_summaries = body.get("source_summaries") or []
    citations = body.get("citations") or []
    user_argument = (body.get("user_argument") or "").strip()

    if user_argument and not is_safe_input(user_argument):
        raise HTTPException(400, "Invalid input.")
    if user_argument:
        user_argument = sanitize_query(user_argument)

    context = _build_context(report_answer, source_summaries, citations)
    if not context.strip():
        raise HTTPException(400, "No report context provided.")

    user, provider, api_key = _resolve_user_key(request, db)
    _require_key(user, api_key)

    system_prompt = (
        "You are a rigorous devil's-advocate. Argue AGAINST the report's central "
        "conclusion using only the material below. Return ONLY raw JSON with keys: "
        "\"thesis\" (one strong counter-claim, <= 24 words), "
        "\"points\" (array of 3-4 objects with keys \"point\" and \"why\", each <= 42 words), "
        "\"weakest_link\" (the report's weakest claim + one line why), "
        "\"steelman\" (one line acknowledging the report's strongest point).\n\n"
        + context
    )
    user_prompt = (
        "Push back hard but fairly. Cite [n] when you draw on a source summary."
        + (f"\n\nThe user's own counter-argument to consider:\n{user_argument}" if user_argument else "")
    )

    try:
        raw = _call_llm(user, provider, api_key, system_prompt, user_prompt,
                        max_tokens=900, temperature=0.55)
    except Exception as e:
        raise HTTPException(502, f"Debate action failed: {e}")

    import re as _re
    data = {"thesis": "", "points": [], "weakest_link": "", "steelman": ""}
    try:
        m = _re.search(r"\{.*\}", raw or "", _re.DOTALL)
        parsed = json.loads(m.group(0)) if m else {}
        data["thesis"] = str(parsed.get("thesis", ""))[:400]
        pts = parsed.get("points") or []
        data["points"] = [
            {"point": str(p.get("point", ""))[:300], "why": str(p.get("why", ""))[:400]}
            for p in pts if isinstance(p, dict)
        ][:4]
        data["weakest_link"] = str(parsed.get("weakest_link", ""))[:400]
        data["steelman"] = str(parsed.get("steelman", ""))[:400]
    except Exception:
        data["thesis"] = (raw or "")[:400]
    return {"result": data, "provider": provider}


@router.post("/report/perspective")
async def perspective(request: Request, db: Session = Depends(get_db)):
    """Reframe the report through a chosen lens."""
    body = await request.json()
    report_answer = body.get("report_answer") or ""
    source_summaries = body.get("source_summaries") or []
    citations = body.get("citations") or []
    lens = str(body.get("lens") or "skeptic").lower()
    if lens not in PERSPECTIVE_LENSES:
        lens = "skeptic"

    context = _build_context(report_answer, source_summaries, citations)
    if not context.strip():
        raise HTTPException(400, "No report context provided.")

    user, provider, api_key = _resolve_user_key(request, db)
    _require_key(user, api_key)

    lens_desc = PERSPECTIVE_LENSES[lens]
    system_prompt = (
        f"You are {lens_desc}. Re-read the material below and return ONLY raw JSON "
        "with keys: \"headline\" (how the topic reads through this lens, <= 22 words), "
        "\"reframe\" (2-3 sentences summarising the shift in emphasis), "
        "\"agreements\" (array of up to 3 short bullets the lens accepts), "
        "\"objections\" (array of up to 3 short bullets the lens raises), "
        "\"question\" (one probing question the lens would ask next).\n\n"
        + context
    )
    try:
        raw = _call_llm(user, provider, api_key, system_prompt,
                        "Reframe now. Cite [n] when you rely on a source.",
                        max_tokens=800, temperature=0.5)
    except Exception as e:
        raise HTTPException(502, f"Perspective action failed: {e}")

    import re as _re
    out = {"lens": lens, "headline": "", "reframe": "",
           "agreements": [], "objections": [], "question": ""}
    try:
        m = _re.search(r"\{.*\}", raw or "", _re.DOTALL)
        parsed = json.loads(m.group(0)) if m else {}
        out["headline"] = str(parsed.get("headline", ""))[:300]
        out["reframe"] = str(parsed.get("reframe", ""))[:800]
        out["agreements"] = [str(x)[:220] for x in (parsed.get("agreements") or [])][:3]
        out["objections"] = [str(x)[:220] for x in (parsed.get("objections") or [])][:3]
        out["question"] = str(parsed.get("question", ""))[:280]
    except Exception:
        out["reframe"] = (raw or "")[:800]
    return {"result": out, "provider": provider}


@router.post("/debate/cross-exam")
async def cross_exam(request: Request, db: Session = Depends(get_db)):
    """User poses a question to both advocates; judge scores their answers."""
    body = await request.json()
    question = (body.get("question") or "").strip()
    topic = str(body.get("topic") or "").strip()
    pro_case = str(body.get("pro_case") or "").strip()
    con_case = str(body.get("con_case") or "").strip()
    verdict = str(body.get("verdict") or "").strip()

    if not question or not is_safe_input(question):
        raise HTTPException(400, "Invalid or empty question.")
    question = sanitize_query(question)
    if not (pro_case or con_case):
        raise HTTPException(400, "No debate context provided.")

    user, provider, api_key = _resolve_user_key(request, db)
    _require_key(user, api_key)

    context = (
        f"TOPIC: {topic[:400]}\n\nPRO ADVOCATE'S CASE:\n{pro_case[:2500]}\n\n"
        f"CON ADVOCATE'S CASE:\n{con_case[:2500]}\n\nJUDGE'S VERDICT: {verdict[:600]}"
    )
    system_prompt = (
        "You are running a live cross-examination. Given the debate context below, "
        "answer the user's question TWICE (once as the PRO advocate, once as the CON "
        "advocate) in each side's voice, then score both replies. Return ONLY raw JSON: "
        "{\"pro\": \"...\", \"con\": \"...\", "
        "\"scores\": {\"pro\": 0..10, \"con\": 0..10}, "
        "\"winner\": \"pro|con|tie\", "
        "\"why\": \"one short sentence on why the winner is stronger here\"}. "
        "Keep each side's answer <= 90 words. Stay in character.\n\n"
        + context
    )
    try:
        raw = _call_llm(user, provider, api_key, system_prompt, question,
                        max_tokens=900, temperature=0.5)
    except Exception as e:
        raise HTTPException(502, f"Cross-exam failed: {e}")

    import re as _re
    out = {"pro": "", "con": "", "scores": {"pro": 5, "con": 5},
           "winner": "tie", "why": ""}
    try:
        m = _re.search(r"\{.*\}", raw or "", _re.DOTALL)
        parsed = json.loads(m.group(0)) if m else {}
        out["pro"] = str(parsed.get("pro", ""))[:900]
        out["con"] = str(parsed.get("con", ""))[:900]
        sc = parsed.get("scores") or {}
        out["scores"] = {
            "pro": max(0, min(10, float(sc.get("pro", 5)))),
            "con": max(0, min(10, float(sc.get("con", 5)))),
        }
        w = str(parsed.get("winner", "tie")).lower()
        out["winner"] = w if w in ("pro", "con", "tie") else "tie"
        out["why"] = str(parsed.get("why", ""))[:280]
    except Exception:
        out["pro"] = (raw or "")[:900]
    return {"result": out, "provider": provider}
