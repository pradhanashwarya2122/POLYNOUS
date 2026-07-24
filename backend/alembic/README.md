# Database migrations (Alembic)

Single source of truth for the schema is **`app/models/`** (one `Base`,
re-exported by `app/database.py`). Alembic's `env.py` targets that one
`Base.metadata` and reads the same `DATABASE_URL` the app uses (SQLite locally,
PostgreSQL in production), so migrations and the running app never drift onto
different databases.

## Startup behaviour (automatic)

On boot, `app.database.init_db()` runs migrations when `ALEMBIC_AUTO_UPGRADE`
is on (the default; set it to `0`/`false` to disable). `run_migrations()` adopts
any database automatically:

- **Fresh DB** (no `users` table) → `upgrade head` (creates every table)
- **Legacy DB** (has `users`, no `alembic_version`) → `stamp head` (adopt as-is, no DDL)
- **Already migrated** → `upgrade head` (apply anything pending)

So the existing local `polynous.db` and production Postgres both switch to
migrations with zero manual steps.

## One-time adoption of an existing database (manual equivalent)

If you ever need to adopt an existing DB by hand (e.g. auto-upgrade disabled):

```bash
cd backend
alembic stamp head     # marks the existing schema as current WITHOUT running DDL
```

Only do this on a database that already has the tables. A brand-new empty
database should use `alembic upgrade head` instead.

## Everyday commands

```bash
cd backend

alembic current                       # what revision is this DB at?
alembic heads                         # latest revision in the codebase
alembic upgrade head                  # apply pending migrations
alembic downgrade -1                  # roll back one revision

# after changing a model in app/models/, generate a migration:
alembic revision --autogenerate -m "describe the change"
# review the generated file in alembic/versions/, then:
alembic upgrade head
```

## Proof the model and schema agree

Right after the initial migration + `stamp head`, an autogenerate produces an
**empty** migration (`pass` in `upgrade`/`downgrade`). That empty diff is the
proof the ORM models and the live schema match. Re-run it any time you suspect
drift:

```bash
alembic revision --autogenerate -m "drift check"   # should be empty; delete it
```

## Notes

- SQLite can't `ALTER` most columns, so `env.py` enables **batch mode**
  (`render_as_batch`) for SQLite — future column changes rewrite the table so
  they work locally too.
- `compare_type=True` is on, so column type changes are detected.
- The initial revision is `33b3bad2f47e` (creates users, conversations,
  messages, debate_votes, free_key_claims, user_preferences).
