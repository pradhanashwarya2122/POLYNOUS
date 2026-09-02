"""
app/routes/shares.py — public, no-auth report sharing.

Copy-link on a rendered report POSTs the report's view payload here; we store a
snapshot and return a short id. The public GET is unauthenticated and spends no
API key, so anyone with the link can read the report and then choose to sign in
to run their own research. This is a read-only snapshot, not a live re-run.
"""
import secrets
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.misc import SharedReport

router = APIRouter()

# Guard against oversized snapshots (a normal report payload is well under this).
_MAX_PAYLOAD_BYTES = 512 * 1024
_KINDS = ("research", "debate")


def _short_id() -> str:
    # 16 url-safe chars, ~96 bits: collision-free at any realistic scale.
    return secrets.token_urlsafe(12)[:16]


def _owner_public_id(request: Request):
    """Best-effort: attach the signed-in owner if a valid token is present,
    but never require it — sharing works for guests too."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        from app.routes.auth import decode_token
        payload = decode_token(auth[7:], expected_type="access")
        return str(payload.get("sub")) if payload else None
    except Exception:
        return None


@router.post("/share")
async def create_share(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "invalid JSON body")

    kind = str(body.get("kind", "")).strip()
    payload = body.get("payload")
    title = (str(body.get("title", "")) or "")[:500]
    if kind not in _KINDS:
        raise HTTPException(400, "kind must be 'research' or 'debate'")
    if not isinstance(payload, (dict, list)) or not payload:
        raise HTTPException(400, "payload is required")

    import json
    if len(json.dumps(payload)) > _MAX_PAYLOAD_BYTES:
        raise HTTPException(413, "report snapshot is too large to share")

    # Retry on the (astronomically unlikely) id collision.
    for _ in range(5):
        sid = _short_id()
        if not db.query(SharedReport).filter(SharedReport.id == sid).first():
            break
    else:
        raise HTTPException(500, "could not allocate a share id")

    row = SharedReport(id=sid, kind=kind, title=title, payload=payload,
                       owner_id=_owner_public_id(request), views=0)
    db.add(row)
    db.commit()
    return {"id": sid, "kind": kind, "url_path": ("/r/" if kind == "research" else "/d/") + sid}


@router.get("/share/{share_id}")
async def get_share(share_id: str, db: Session = Depends(get_db)):
    row = db.query(SharedReport).filter(SharedReport.id == share_id).first()
    if not row:
        raise HTTPException(404, "shared report not found or expired")
    try:
        row.views = (row.views or 0) + 1
        db.commit()
    except Exception:
        db.rollback()
    return {"id": row.id, "kind": row.kind, "title": row.title, "payload": row.payload}
