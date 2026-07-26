"""
app/routes/debate_followup.py — interactive debate follow-ups.

Two endpoints that operate on an ALREADY-COMPLETED debate (the client sends back
the arguments it received), so neither re-runs the whole adversarial pipeline:

  POST /debate/rejudge   — re-score the same debate through a different judging
                           "lens" (economist / ethicist / pragmatist / impartial).
                           Same evidence, different value frame → the verdict can
                           change, which is the point.

  POST /debate/respond   — the user injects their own argument for a side; the
                           OPPOSING agent responds to it, then the debate is
                           re-judged with the user's point folded in.

Strict BYO-key policy, matching the streaming debate endpoints.
"""
import re

from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.utils.encryption import decrypt_api_key
from app.utils.sanitizer import sanitize_query, is_safe_input
from app.llm_providers import LLM_PROVIDERS, resolve_model
from app.routes.auth import decode_token
from app.agents.debate_agents import judge_debate, JUDGE_PERSONAS, _get_client, _call_with_retry
from app.utils.json_extract import extract_json_object

router = APIRouter()


def _resolve(request: Request, db: Session):
    """(user, provider, api_key, model) with the same matched-pair BYO resolution
    as the streaming endpoints."""
    user, provider, api_key = None, "anthropic", None
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            payload = decode_token(auth.replace("Bearer ", ""), expected_type="access")
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
    model = resolve_model(user, provider) if user else None
    return user, provider, api_key, model


def _guard(user, api_key):
    if user is None:
        raise HTTPException(401, "Sign in to use debate follow-ups")
    if not api_key:
        raise HTTPException(400, "No API key configured for your account. Add your key in Settings.")


def _sources_from(*texts) -> int:
    """Best-effort source count from [n] markers across the arguments, so the
    rubric has a sane denominator when the client doesn't send total_sources."""
    nums = set()
    for t in texts:
        for m in re.findall(r"\[(\d{1,2})\]", t or ""):
            nums.add(int(m))
    return max(nums) if nums else 6


@router.post("/debate/rejudge")
async def debate_rejudge(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    query = (body.get("query") or "").strip()
    persona = (body.get("persona") or "impartial").lower()
    if persona not in JUDGE_PERSONAS:
        raise HTTPException(400, f"Unknown persona '{persona}'")
    for_opening = body.get("for_opening") or ""
    against_opening = body.get("against_opening") or ""
    for_rebuttal = body.get("for_rebuttal") or ""
    against_rebuttal = body.get("against_rebuttal") or ""
    if not query or not (for_opening and against_opening):
        raise HTTPException(400, "Debate arguments required to re-judge")
    total_sources = int(body.get("total_sources") or 0) or _sources_from(
        for_opening, against_opening, for_rebuttal, against_rebuttal)

    user, provider, api_key, model = _resolve(request, db)
    _guard(user, api_key)

    verdict = judge_debate(
        for_arg=for_opening, against_arg=against_opening, query=query,
        api_key=api_key, provider=provider,
        for_rebuttal=for_rebuttal, against_rebuttal=against_rebuttal,
        total_sources=total_sources, model=model, persona=persona,
    )
    return {"verdict": verdict, "persona": persona, "provider": provider}


_CROSSEX_SYSTEM = (
    "You are moderating a cross-examination round of a formal debate. Each side gets "
    "to put its single sharpest, most pointed question to the opponent — the kind that "
    "exposes the weakest assumption — and the opponent must answer it honestly and "
    "concretely (2-4 sentences), conceding where fair. Stay grounded in the arguments "
    "actually made; do not invent new evidence.\n\n"
    "Return ONLY a raw JSON object (no code fences):\n"
    '{"for_asks": {"question": "FOR\'s pointed question to AGAINST", "answer": "AGAINST\'s answer"},\n'
    ' "against_asks": {"question": "AGAINST\'s pointed question to FOR", "answer": "FOR\'s answer"}}'
)


@router.post("/debate/cross-exam")
async def debate_cross_exam(request: Request, db: Session = Depends(get_db)):
    """Generate a cross-examination round: each side's sharpest question + the
    opponent's answer. Operates on the completed debate — no pipeline re-run."""
    body = await request.json()
    query = (body.get("query") or "").strip()
    for_opening = body.get("for_opening") or ""
    against_opening = body.get("against_opening") or ""
    for_rebuttal = body.get("for_rebuttal") or ""
    against_rebuttal = body.get("against_rebuttal") or ""
    if not query or not (for_opening and against_opening):
        raise HTTPException(400, "Debate arguments required for cross-examination")

    user, provider, api_key, model = _resolve(request, db)
    _guard(user, api_key)

    user_prompt = (
        f"Proposition: {query}\n\n"
        f"FOR case:\n{for_opening[:1200]}\n{for_rebuttal[:800]}\n\n"
        f"AGAINST case:\n{against_opening[:1200]}\n{against_rebuttal[:800]}\n\n"
        "Produce the cross-examination JSON:"
    )
    try:
        client, client_type = _get_client(provider, api_key)
        raw = _call_with_retry(client, client_type, _CROSSEX_SYSTEM, user_prompt,
                               700, 0.5, model=model, provider=provider)
        data = extract_json_object(raw)
        if not isinstance(data, dict):
            raise ValueError("cross-examination returned no parseable JSON")
    except Exception as e:
        raise HTTPException(502, f"Cross-examination failed: {e}")

    def _pair(obj):
        obj = obj if isinstance(obj, dict) else {}
        return {"question": (obj.get("question") or "").strip(), "answer": (obj.get("answer") or "").strip()}

    return {
        "for_asks": _pair(data.get("for_asks")),
        "against_asks": _pair(data.get("against_asks")),
        "provider": provider,
    }


_RESPOND_SYSTEM = (
    "You are a sharp debate advocate arguing {opp_side} the proposition. A member "
    "of the audience has just made an argument for the {user_side} side. Respond "
    "DIRECTLY to their specific point in 3-5 sentences: concede anything fair, then "
    "expose its weakest assumption or strongest counter-evidence. Be substantive and "
    "civil — no filler, no restating the whole debate."
)


@router.post("/debate/respond")
async def debate_respond(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    query = (body.get("query") or "").strip()
    side = (body.get("side") or "for").lower()          # side the USER argues
    user_argument = (body.get("user_argument") or "").strip()
    persona = (body.get("persona") or "impartial").lower()
    for_opening = body.get("for_opening") or ""
    against_opening = body.get("against_opening") or ""
    for_rebuttal = body.get("for_rebuttal") or ""
    against_rebuttal = body.get("against_rebuttal") or ""

    if side not in ("for", "against"):
        raise HTTPException(400, "side must be 'for' or 'against'")
    if not query or not user_argument or not is_safe_input(user_argument):
        raise HTTPException(400, "A valid argument and topic are required")
    user_argument = sanitize_query(user_argument)
    if persona not in JUDGE_PERSONAS:
        persona = "impartial"

    user, provider, api_key, model = _resolve(request, db)
    _guard(user, api_key)

    opp_side = "against" if side == "for" else "for"
    system = _RESPOND_SYSTEM.format(opp_side=opp_side.upper(), user_side=side.upper())
    user_prompt = (
        f"Proposition: {query}\n\n"
        f"The audience member's argument ({side.upper()}):\n{user_argument[:1400]}\n\n"
        f"Respond as the {opp_side.upper()} advocate:"
    )
    try:
        client, client_type = _get_client(provider, api_key)
        opponent_response = _call_with_retry(
            client, client_type, system, user_prompt, 500, 0.6, model=model, provider=provider,
        )
    except Exception as e:
        raise HTTPException(502, f"Opponent response failed: {e}")

    # Fold the user's argument into their side and the rebuttal into the opponent's,
    # then re-judge so the verdict reflects the new exchange.
    if side == "for":
        for_rebuttal = (for_rebuttal + "\n\n[Audience argument] " + user_argument).strip()
        against_rebuttal = (against_rebuttal + "\n\n[Response] " + (opponent_response or "")).strip()
    else:
        against_rebuttal = (against_rebuttal + "\n\n[Audience argument] " + user_argument).strip()
        for_rebuttal = (for_rebuttal + "\n\n[Response] " + (opponent_response or "")).strip()

    total_sources = int(body.get("total_sources") or 0) or _sources_from(
        for_opening, against_opening, for_rebuttal, against_rebuttal)
    verdict = judge_debate(
        for_arg=for_opening, against_arg=against_opening, query=query,
        api_key=api_key, provider=provider,
        for_rebuttal=for_rebuttal, against_rebuttal=against_rebuttal,
        total_sources=total_sources, model=model, persona=persona,
    )
    return {
        "opponent_response": (opponent_response or "").strip(),
        "opponent_side": opp_side,
        "verdict": verdict,
        "provider": provider,
    }
