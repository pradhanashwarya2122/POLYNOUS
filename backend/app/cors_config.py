"""
app/cors_config.py

Single source of truth for the allowed CORS origins, split out of main.py
(Phase 7) so both the app assembly and the /debug/cors route can import it
without a circular dependency on main.
"""

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://polynous.pages.dev",
]

ALLOWED_ORIGINS = list(set([url for url in ALLOWED_ORIGINS if url]))
