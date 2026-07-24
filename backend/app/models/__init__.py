"""
app.models — the single source of truth for all ORM models.

Importing this package guarantees every model class is registered on the one
shared Base.metadata (used by Alembic's env.py for autogenerate). Anything that
needs a model should import it from here (or from app.database, which re-exports
these for backward compatibility).
"""
from app.models.user import Base, User, Conversation, Message, generate_uuid
from app.models.misc import DebateVote, FreeKeyClaim, UserPreferences, ResearchCache

__all__ = [
    "Base",
    "User",
    "Conversation",
    "Message",
    "DebateVote",
    "FreeKeyClaim",
    "UserPreferences",
    "ResearchCache",
    "generate_uuid",
]
