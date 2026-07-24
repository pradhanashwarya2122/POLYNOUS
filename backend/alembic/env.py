"""
Alembic migration environment for POLYNOUS.

Targets the ONE Base.metadata (app.models) so autogenerate sees every table
on a single registry, and reads the database URL from the same place the app
does (DATABASE_URL env, SQLite fallback) so migrations and the running app can
never drift onto different databases.
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Make the app package importable (backend/ is the parent of this file's dir).
_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

# Importing app.database resolves DATABASE_URL exactly as the app does and
# imports app.models (registering every model on the single Base.metadata).
from app.database import DATABASE_URL  # noqa: E402
from app.models import Base  # noqa: E402

config = context.config

# Prefer a URL injected by the caller (database.run_migrations sets this);
# otherwise fall back to the app's resolved DATABASE_URL.
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _render_url() -> str:
    return config.get_main_option("sqlalchemy.url") or DATABASE_URL


def run_migrations_offline() -> None:
    url = _render_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        render_as_batch=url.startswith("sqlite"),
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section, {})
    section["sqlalchemy.url"] = _render_url()
    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        is_sqlite = connection.dialect.name == "sqlite"
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            # SQLite can't ALTER most columns — batch mode rewrites tables so
            # future column changes work on the local dev DB too.
            render_as_batch=is_sqlite,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
