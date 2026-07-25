"""
app/main.py — application assembly ONLY.

Endpoints live in routers (app/routes/*), exception handlers in app/errors.py.
This module wires middleware, routers, startup, and the ASGI app together.
Post-Phase-7 decomposition target: keep this under ~200 lines.
"""
import os
from dotenv import load_dotenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.cors_config import ALLOWED_ORIGINS
from app.database import init_db
from app.utils.startup_checks import run_startup_checks
from app.utils.fix_users import add_missing_encryption_keys
from app.middleware.auth_middleware import extract_user_middleware
from app.middleware.input_sanitizer import input_sanitizer_middleware
from app.middleware.security_headers import security_headers_middleware
from app.errors import register_exception_handlers

# Routers
from app.routes.api_keys import router as api_keys_router
from app.routes.settings_extended import router as settings_ext_router
from app.routes.user_stats import router as user_stats_router
from app.routes.pdfs import router as pdfs_router
from app.routes.memory import router as memory_router
from app.routes.semantic_search import router as search_router
from app.routes.knowledge import router as knowledge_router
from app.routes.oauth import router as oauth_router
from app.routes.auth import router as auth_router
from app.routes.conversations import router as conversations_router
from app.routes.research_stream import router as research_stream_router
from app.routes.system import router as system_router
from app.routes.admin import router as admin_router

load_dotenv()

# ============================================================
# CORS CONFIGURATION
# ============================================================

from app.cors_config import ALLOWED_ORIGINS
print(f"🌐 Allowed CORS origins: {ALLOWED_ORIGINS}")

# ========== CRITICAL DEPENDENCY CHECKER ==========
def check_critical_dependencies():
    """Verify critical dependencies are installed with safe versions"""
    critical = {
        'fastapi': '0.115.0',
        'uvicorn': '0.30.0',
        'sqlalchemy': '2.0.0',
        'cryptography': '41.0.0',
    }
    
    issues = []
    for package, min_version in critical.items():
        try:
            module = __import__(package)
            version = getattr(module, '__version__', '0.0.0')
            
            # Simple version comparison
            if version < min_version:
                issues.append(f"⚠️  {package} {version} < {min_version} (minimum)")
        except ImportError:
            issues.append(f"❌ {package} NOT INSTALLED!")
    
    if issues:
        print("\n" + "=" * 60)
        print("🔒 DEPENDENCY SECURITY WARNING")
        print("=" * 60)
        for issue in issues:
            print(f"  {issue}")
        print("=" * 60 + "\n")

# ========== CREATE APP ==========
app = FastAPI(title="POLYNOUS API")

# ============================================================
# MIDDLEWARE (order matters!)
# ============================================================

# 1. CORS – must be first
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Length",
        "Content-Type",
        "Set-Cookie",
    ],
    max_age=3600,
)

# 2. Security headers
app.middleware("http")(security_headers_middleware)
app.middleware("http")(extract_user_middleware)
app.middleware("http")(input_sanitizer_middleware)

# ========== STARTUP EVENT ==========
@app.on_event("startup")
async def startup():
    check_critical_dependencies()
    
    try:
        # init_db() now runs Alembic migrations (ALEMBIC_AUTO_UPGRADE, default
        # on) instead of create_all + hand-ALTERed columns. The old
        # add_missing_columns() shim is retired — schema changes go through
        # migrations. add_missing_encryption_keys() stays as a data backfill.
        init_db()
        print("✅ Database initialized!")
        add_missing_encryption_keys()
        run_startup_checks()
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        if os.getenv("ENVIRONMENT", "").lower() == "production":
            raise

    # Verify Neo4j on startup
    try:
        from app.knowledge_graph.graph_manager import kg
        if kg.driver:
            kg.driver.verify_connectivity()
            print("✅ Neo4j verified on startup")
        else:
            print("❌ Neo4j driver not initialized — memory features will use SQLite fallback")
    except Exception as e:
        print(f"❌ Neo4j startup check failed: {e}")

    print(f"🔒 CORS origins: {ALLOWED_ORIGINS}")
    print(f"🔐 allow_credentials: True")
    print(f"🍪 Cookie mode: {'production (secure+sameSite=None)' if os.getenv('ENVIRONMENT') == 'production' else 'development (lax)'}")

# ========== INCLUDE ROUTERS ==========
app.include_router(api_keys_router)
app.include_router(settings_ext_router)
app.include_router(auth_router)
app.include_router(conversations_router)
app.include_router(user_stats_router)
app.include_router(oauth_router)
app.include_router(knowledge_router)
app.include_router(search_router)
app.include_router(memory_router)
app.include_router(pdfs_router)
app.include_router(research_stream_router)
app.include_router(system_router)
app.include_router(admin_router)
register_exception_handlers(app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)