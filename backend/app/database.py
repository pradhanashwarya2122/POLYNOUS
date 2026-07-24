# database.py — PostgreSQL preferred, SQLite fallback for local dev
#
# NOTE: this module no longer DEFINES any ORM models. There is exactly one
# declarative Base, defined in app.models.user; every model lives in
# app.models and is re-exported here for backward compatibility. This kills
# the old dual-User-model hazard (two `User` classes for table "users" on two
# different Bases with divergent columns).
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session
import os
from datetime import datetime

# ============================================================
# ENVIRONMENT DETECTION
# ============================================================
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production"

print(f"🌍 Environment: {ENVIRONMENT}")
print(f"🏭 Production mode: {IS_PRODUCTION}")

# ============================================================
# DATABASE URL – Safer fallback to local SQLite if unset
# ============================================================
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # A URL was provided – use it
    if DATABASE_URL.startswith("sqlite"):
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        # Assume PostgreSQL (or compatible) – enable SSL and pooling
        engine = create_engine(
            DATABASE_URL,
            connect_args={"sslmode": "require"},
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
        )
else:
    # No DATABASE_URL → fallback to local SQLite
    SQLITE_PATH = os.path.join(os.path.dirname(__file__), "polynous.db")
    DATABASE_URL = f"sqlite:///{SQLITE_PATH}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    print("⚠️  No DATABASE_URL set, using local SQLite")

print(f"🗄️  Database URL (masked): {DATABASE_URL}")

# ============================================================
# SESSION FACTORY
# ============================================================
SessionLocal = scoped_session(
    sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        expire_on_commit=False,
    )
)
print("✅ Session factory created (scoped_session)")

# ============================================================
# DECLARATIVE BASE + MODELS — single source of truth in app.models
# ============================================================
# Import the ONE Base and every model from app.models. `import app.models`
# has the side effect of registering all model classes on Base.metadata, so
# both create_all (dev fallback) and Alembic autogenerate see the full schema.
from app.models import (  # noqa: E402
    Base,
    User,
    Conversation,
    Message,
    DebateVote,
    FreeKeyClaim,
    UserPreferences,
)


# ============================================================
# DATABASE INITIALIZATION — Alembic migrations (default) or create_all
# ============================================================
def _has_table(table_name: str) -> bool:
    from sqlalchemy import inspect as sa_inspect
    try:
        return sa_inspect(engine).has_table(table_name)
    except Exception:
        return False


def run_migrations() -> None:
    """
    Bring the database schema up to head using Alembic, adopting pre-existing
    databases automatically:

      * fresh DB (no 'users' table)         → upgrade head  (creates everything)
      * legacy DB (has 'users', no alembic) → stamp head    (adopt as-is, no DDL)
      * already-migrated DB                 → upgrade head   (apply any pending)

    This lets the existing local polynous.db and the production Postgres both
    switch to migrations with zero manual steps. Raises on failure in
    production; degrades to create_all locally.
    """
    from alembic.config import Config
    from alembic import command

    ini_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini")
    cfg = Config(ini_path)
    # env.py reads the URL from here, so a spawned CLI and this in-process call
    # always target the same database.
    cfg.set_main_option("sqlalchemy.url", DATABASE_URL)

    has_users = _has_table("users")
    has_alembic = _has_table("alembic_version")

    if has_users and not has_alembic:
        print("🔖 Existing database detected without Alembic — stamping head (adopt, no DDL).")
        command.stamp(cfg, "head")
    else:
        print("⬆️  Running Alembic migrations to head…")
        command.upgrade(cfg, "head")
    print("✅ Database schema at head.")


def init_db():
    """
    Startup schema init. Prefers Alembic migrations (ALEMBIC_AUTO_UPGRADE,
    default on). Falls back to create_all only if migrations are disabled or
    unavailable — so local dev never hard-fails on a missing Alembic setup.
    """
    auto = os.getenv("ALEMBIC_AUTO_UPGRADE", "1").lower() not in ("0", "false", "no", "off")
    if auto:
        try:
            run_migrations()
            return
        except Exception as e:
            print(f"❌ Alembic migration failed: {e}")
            if IS_PRODUCTION:
                raise
            print("⚠️  Falling back to create_all for local dev…")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created/verified (create_all fallback)!")
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        if IS_PRODUCTION:
            raise
        print("⚠️  Continuing without database – some features may not work")


# ============================================================
# DEPENDENCY INJECTION for FastAPI
# ============================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
        SessionLocal.remove()


# ============================================================
# HEALTH CHECK
# ============================================================
def check_database_connection():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return True, "Database connection OK"
    except Exception as e:
        return False, f"Database connection failed: {str(e)}"


# ============================================================
# EXPORTS
# ============================================================
__all__ = [
    "engine",
    "SessionLocal",
    "Base",
    "User",
    "Conversation",
    "Message",
    "DebateVote",
    "FreeKeyClaim",
    "UserPreferences",
    "init_db",
    "run_migrations",
    "get_db",
    "check_database_connection",
    "DATABASE_URL",
    "IS_PRODUCTION",
]