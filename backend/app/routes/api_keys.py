from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, validator
from typing import Optional
import traceback

from app.database import get_db
from app.models.user import User
from app.utils.encryption import (
    encrypt_api_key, decrypt_api_key, mask_api_key, validate_key_format
)
from app.routes.auth import get_current_user   # ← added
from app.llm_providers import (
    LLM_PROVIDERS, ALL_KEY_PROVIDERS, OPENAI_COMPATIBLE_BASE_URLS, DEFAULT_MODELS,
)

router = APIRouter(prefix="/settings/api-keys", tags=["api-keys"])

ALLOWED_PROVIDERS = list(ALL_KEY_PROVIDERS)  # anthropic/openai/google/mistral/groq/tavily/voyage

# ============================================================
# MODELS
# ============================================================

class APIKeyUpdate(BaseModel):
    """Single API key update (optionally with the user's model choice)"""
    provider: str
    api_key: str
    model: Optional[str] = None   # per-provider model selection

    @validator('provider')
    def validate_provider(cls, v):
        if v not in ALLOWED_PROVIDERS:
            raise ValueError(f'Provider must be one of: {ALLOWED_PROVIDERS}')
        return v

    @validator('api_key')
    def validate_key_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('API key cannot be empty')
        return v.strip()

class APIKeysResponse(BaseModel):
    anthropic: dict = {"has_key": False, "preview": None, "is_valid": False}
    openai: dict = {"has_key": False, "preview": None, "is_valid": False}
    google: dict = {"has_key": False, "preview": None, "is_valid": False}
    mistral: dict = {"has_key": False, "preview": None, "is_valid": False}
    groq: dict = {"has_key": False, "preview": None, "is_valid": False}
    nvidia: dict = {"has_key": False, "preview": None, "is_valid": False}
    deepseek: dict = {"has_key": False, "preview": None, "is_valid": False}
    tavily: dict = {"has_key": False, "preview": None, "is_valid": False}
    voyage: dict = {"has_key": False, "preview": None, "is_valid": False}
    preferred_provider: str = "anthropic"
    models: dict = {}             # user's chosen model per provider


class CustomKeyTest(BaseModel):
    """Verify ANY OpenAI-compatible key against an arbitrary endpoint."""
    base_url: str
    api_key: str
    model: Optional[str] = None

# ============================================================
# HELPER: Get current user (used by other endpoints)
# ============================================================

def get_current_db_user(request: Request, db: Session = Depends(get_db)) -> User:
    """Get current user from database using request state (set by auth middleware)"""
    user_id = getattr(request.state, 'user_id', 0)
    
    if user_id == 0:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user

# ============================================================
# ENDPOINTS
# ============================================================

@router.get("", response_model=APIKeysResponse)
async def get_api_keys(user: User = Depends(get_current_user)):
    """
    Get API key status for all providers.
    NEVER returns full keys — only masked previews.
    """
    try:
        response = APIKeysResponse(
            preferred_provider=user.preferred_provider or "anthropic",
            models=((user.preferences or {}).get("models") or {}),
        )
        for provider in ALLOWED_PROVIDERS:
            encrypted = getattr(user, f"{provider}_api_key", None)
            if encrypted:
                decrypted = decrypt_api_key(encrypted, user.encryption_key)
                response.__dict__[provider] = {
                    "has_key": True,
                    "preview": mask_api_key(decrypted),
                    "is_valid": bool(decrypted)
                }
        return response
    except Exception as e:
        print(f"Error in get_api_keys: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Could not fetch API keys")

@router.put("")
async def save_api_key(
    key_data: APIKeyUpdate,
    user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """
    Save or update an API key for a specific provider.
    Key is encrypted with user's personal encryption key before storage.
    """
    
    provider = key_data.provider
    api_key = key_data.api_key.strip()
    
    # Validate key format
    is_valid, error_msg = validate_key_format(api_key, provider)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Test the key with a real API call
    test_result = await test_api_key(api_key, provider)
    if not test_result['valid']:
        raise HTTPException(
            status_code=400,
            detail=f"API key validation failed: {test_result['message']}"
        )
    
    # Encrypt with user's personal key
    encrypted = encrypt_api_key(api_key, user.encryption_key)
    if not encrypted:
        raise HTTPException(status_code=500, detail="Encryption failed")
    
    # Store in database
    setattr(user, f"{provider}_api_key", encrypted)

    # Persist the model choice (per-provider) in the preferences JSON
    if key_data.model:
        from sqlalchemy.orm.attributes import flag_modified
        prefs = user.preferences or {}
        prefs.setdefault("models", {})[provider] = key_data.model
        user.preferences = prefs
        flag_modified(user, "preferences")

    db.commit()

    return {
        "message": f"{provider.upper()} API key saved successfully",
        "provider": provider,
        "preview": mask_api_key(api_key),
        "validated": True
    }

@router.delete("/{provider}")
async def delete_api_key(
    provider: str,
    user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """Delete a specific API key"""
    
    if provider not in ALLOWED_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Provider must be one of: {ALLOWED_PROVIDERS}")

    setattr(user, f"{provider}_api_key", None)
    db.commit()
    
    return {"message": f"{provider.upper()} API key removed"}

@router.delete("")
async def delete_all_api_keys(
    user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """Delete ALL API keys"""
    
    for provider in ALLOWED_PROVIDERS:
        setattr(user, f"{provider}_api_key", None)
    db.commit()
    
    return {"message": "All API keys removed"}

@router.put("/preferred-provider")
async def set_preferred_provider(
    provider: str,
    user: User = Depends(get_current_db_user),
    db: Session = Depends(get_db)
):
    """Set preferred AI provider"""

    if provider not in LLM_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Provider must be one of: {list(LLM_PROVIDERS)}")

    user.preferred_provider = provider
    db.commit()

    return {
        "message": f"Preferred provider set to {provider}",
        "preferred_provider": provider
    }


# ============================================================
# FREE STARTER KEY — one per new user, from the shuffled pool
# ============================================================

def _has_any_llm_key(user) -> bool:
    for p in LLM_PROVIDERS:
        if getattr(user, f"{p}_api_key", None):
            return True
    return False


@router.get("/free-key/status")
async def free_key_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Is a free starter key available for this user to claim?"""
    from app.services import free_keys as fk
    from app.models import FreeKeyClaim
    claimed_fps = {c.key_fingerprint for c in db.query(FreeKeyClaim).all()}
    already = db.query(FreeKeyClaim).filter(FreeKeyClaim.user_id == user.public_id).first() is not None
    return {
        "pool_configured": fk.pool_configured(),
        "available": fk.available_count(claimed_fps),
        "already_claimed": already,
        "has_own_key": _has_any_llm_key(user),
    }


@router.post("/free-key/claim")
async def claim_free_key(user: User = Depends(get_current_db_user), db: Session = Depends(get_db)):
    """
    Grant this user ONE free starter key from the pool, encrypt it into their
    account, and set it as preferred. Idempotent-ish: refuses if the user
    already claimed one or already has their own key.
    """
    from app.services import free_keys as fk
    from app.models import FreeKeyClaim

    if db.query(FreeKeyClaim).filter(FreeKeyClaim.user_id == user.public_id).first():
        raise HTTPException(400, "You have already claimed your free starter key.")
    if _has_any_llm_key(user):
        raise HTTPException(400, "You already have an API key configured — free keys are for new users.")

    claimed_fps = {c.key_fingerprint for c in db.query(FreeKeyClaim).all()}
    entry = fk.pick_unclaimed(claimed_fps)
    if not entry:
        detail = ("No free keys are available right now — please add your own key in Settings."
                  if fk.pool_configured() else
                  "Free starter keys aren't set up yet — please add your own key in Settings.")
        raise HTTPException(404, detail)

    provider, key = entry["provider"], entry["key"]
    encrypted = encrypt_api_key(key, user.encryption_key)
    if not encrypted:
        raise HTTPException(500, "Could not secure the key. Please try again.")

    setattr(user, f"{provider}_api_key", encrypted)
    user.preferred_provider = provider
    db.add(FreeKeyClaim(user_id=user.public_id, key_fingerprint=entry["fp"], provider=provider))
    db.commit()

    return {
        "status": "claimed",
        "provider": provider,
        "message": f"Free {provider.title()} starter key added to your account. You're ready to research!",
    }

# ============================================================
# API KEY VALIDATION (Test the key with a real API call)
# ============================================================

async def test_api_key(api_key: str, provider: str) -> dict:
    """
    Test an API key by making a minimal API call.
    Returns {"valid": True/False, "message": "..."}
    """
    try:
        if provider == "anthropic":
            from anthropic import Anthropic
            client = Anthropic(api_key=api_key)
            client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=5,
                messages=[{"role": "user", "content": "Hi"}]
            )
            return {"valid": True, "message": "Anthropic key is valid ✅"}
        
        elif provider == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
    # Just list models – no arguments needed (free call)
            client.models.list()
            return {"valid": True, "message": "OpenAI key is valid ✅"}
        
        elif provider in OPENAI_COMPATIBLE_BASE_URLS:
            # google / mistral / groq — all speak the OpenAI protocol
            from openai import OpenAI
            client = OpenAI(api_key=api_key, base_url=OPENAI_COMPATIBLE_BASE_URLS[provider])
            client.models.list()
            return {"valid": True, "message": f"{provider.title()} key is valid ✅"}

        elif provider == "tavily":
            from tavily import TavilyClient
            client = TavilyClient(api_key=api_key)
            client.search("test", max_results=1)
            return {"valid": True, "message": "Tavily key is valid ✅"}
        
        elif provider == "voyage":
            import voyageai
            vo = voyageai.Client(api_key=api_key)
            vo.embed(["test"], model="voyage-3-lite", input_type="document")
            return {"valid": True, "message": "Voyage key is valid ✅"}
        
        return {"valid": False, "message": f"Unknown provider: {provider}"}
    
    except Exception as e:
        error_msg = str(e)[:200]
        return {"valid": False, "message": f"Key validation failed: {error_msg}"}

@router.post("/test")
async def test_key(
    key_data: APIKeyUpdate,
    user: User = Depends(get_current_db_user)
):
    """Test an API key without saving it"""

    result = await test_api_key(key_data.api_key.strip(), key_data.provider)
    return result


@router.post("/test-custom")
async def test_custom_key(
    data: CustomKeyTest,
    user: User = Depends(get_current_db_user)
):
    """
    Verify ANY OpenAI-compatible key against an arbitrary base URL (the
    "Custom / Other" tester). Does NOT save — just answers legit or not.
    """
    base_url = (data.base_url or "").strip()
    api_key = (data.api_key or "").strip()
    if not base_url or not api_key:
        return {"valid": False, "message": "Both a base URL and an API key are required."}
    if not base_url.startswith("http"):
        return {"valid": False, "message": "Base URL must start with http(s)://"}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url=base_url)
        if data.model:
            # a minimal 1-token completion is the most universal proof of life
            client.chat.completions.create(
                model=data.model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
            )
            return {"valid": True, "message": f"Key works with {data.model} ✅"}
        client.models.list()
        return {"valid": True, "message": "Key is valid — endpoint reachable ✅"}
    except Exception as e:
        return {"valid": False, "message": f"Verification failed: {str(e)[:180]}"}