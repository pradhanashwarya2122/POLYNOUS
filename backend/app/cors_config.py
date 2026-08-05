"""
app/cors_config.py

Single source of truth for the allowed CORS origins, split out of main.py
(Phase 7) so both the app assembly and the /debug/cors route can import it
without a circular dependency on main.

WHY THIS MATTERS (the "Unable to connect to server" bug)
The JSON POST endpoints (report chat, debate follow-ups) are non-simple requests,
so the browser sends a CORS preflight first. If the frontend's origin isn't in
the allow-list, the preflight fails and the request never reaches the backend —
the app surfaces this as "Unable to connect to server. Please check your
connection.", which looks like the backend is down even though it's fine.

A single hardcoded origin can't keep up with reality:
  * Cloudflare Pages serves every deploy/branch from its OWN subdomain
    (https://<hash>.polynous.pages.dev, https://<branch>.polynous.pages.dev).
  * A custom domain (e.g. https://polynous.ai) is a different origin entirely.

So origins now come from THREE sources: sane defaults, an env var you can set on
the host (no code change / redeploy of code needed), and a regex that accepts any
subdomain of the known preview hosts.
"""
import os
import re

_DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://polynous.pages.dev",
]


def _env_origins():
    """Comma-separated origins from CORS_ALLOWED_ORIGINS / FRONTEND_URL /
    FRONTEND_ORIGIN. Lets you add the real deployed domain via host env vars
    without touching code."""
    out = []
    for var in ("CORS_ALLOWED_ORIGINS", "FRONTEND_URL", "FRONTEND_ORIGIN"):
        for piece in (os.getenv(var, "") or "").split(","):
            origin = piece.strip().rstrip("/")
            if origin:
                out.append(origin)
    return out


# de-dupe while preserving order
ALLOWED_ORIGINS = list(dict.fromkeys([o for o in (_DEFAULT_ORIGINS + _env_origins()) if o]))

# Accept any subdomain of the known hosting providers so per-deploy preview URLs
# AND the render.yaml frontend (polynous-frontend.onrender.com) work without a
# hardcoded entry. Cloudflare Pages / Vercel / Netlify / Render. Override or
# extend via CORS_ALLOWED_ORIGIN_REGEX.
_DEFAULT_ORIGIN_REGEX = r"https://([a-z0-9-]+\.)*(pages\.dev|vercel\.app|netlify\.app|onrender\.com)$"
ALLOWED_ORIGIN_REGEX = os.getenv("CORS_ALLOWED_ORIGIN_REGEX", _DEFAULT_ORIGIN_REGEX)

_ORIGIN_RE = re.compile(ALLOWED_ORIGIN_REGEX) if ALLOWED_ORIGIN_REGEX else None


def is_allowed_origin(origin: str) -> bool:
    """True if `origin` is in the explicit allow-list or matches the preview
    regex — the same decision CORSMiddleware makes for normal responses."""
    if not origin:
        return False
    if origin in ALLOWED_ORIGINS:
        return True
    return bool(_ORIGIN_RE and _ORIGIN_RE.match(origin))


def cors_headers_for(origin: str) -> dict:
    """CORS headers to attach to ERROR responses.

    WHY THIS EXISTS: Starlette generates unhandled-500 responses (and runs the
    base-`Exception` handler) inside ServerErrorMiddleware, which sits OUTSIDE
    CORSMiddleware. Such responses never pass back through CORSMiddleware, so
    they carry no Access-Control-Allow-Origin header — the browser then blocks
    the response and the frontend reports a false "can't reach the server"
    network error (Judge's Lens, Join the Debate, Chat-with-report, etc.).
    Attaching these headers ourselves makes every error response CORS-safe, so
    the real 4xx/5xx message reaches the UI instead of a phantom outage.
    """
    if is_allowed_origin(origin):
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    return {}
