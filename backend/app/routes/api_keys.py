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
    tavily: dict = {"has_key": False, "preview": None, "is_valid": False}
    voyage: dict = {"has_key": False, "preview": None, "is_valid": False}
    preferred_provider: str = "anthropic"
    models: dict = {}             # user's chosen model per provider

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