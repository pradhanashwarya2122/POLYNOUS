"""
POLYNOUS API Key Encryption
User-specific encryption — each user has their own Fernet key.
No global fallback is ever used.
"""
import os
from cryptography.fernet import Fernet
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

def get_user_fernet(user_encryption_key: Optional[str] = None) -> Fernet:
    """
    Get Fernet instance for a specific user.
    Raises ValueError if no user encryption key is provided.
    """
    if not user_encryption_key:
        raise ValueError("User encryption key is missing – cannot decrypt")
    return Fernet(user_encryption_key.encode())

def encrypt_api_key(api_key: str, user_encryption_key: Optional[str] = None) -> Optional[str]:
    """
    Encrypt an API key using user-specific encryption.
    Requires a valid user encryption key.
    
    Args:
        api_key: The raw API key to encrypt
        user_encryption_key: User's personal Fernet key (from database)
    
    Returns:
        Encrypted key string, or None if encryption fails
    """
    if not api_key or not api_key.strip():
        return None

    if not user_encryption_key:
        print("Encryption error: User encryption key is missing – cannot encrypt")
        return None

    try:
        fernet = get_user_fernet(user_encryption_key)
        return fernet.encrypt(api_key.strip().encode()).decode()
    except Exception as e:
        print(f"Encryption error: {e}")
        return None

def decrypt_api_key(encrypted_key: str, user_encryption_key: Optional[str] = None) -> Optional[str]:
    """
    Decrypt an API key using user-specific encryption.
    
    Args:
        encrypted_key: The encrypted key from database
        user_encryption_key: User's personal Fernet key (from database)
    
    Returns:
        Decrypted API key string, or None if decryption fails
    """
    if not encrypted_key:
        return None
    
    try:
        fernet = get_user_fernet(user_encryption_key)
        return fernet.decrypt(encrypted_key.encode()).decode()
    except Exception as e:
        print(f"Decryption error: {e}")
        return None

def mask_api_key(api_key: Optional[str]) -> Optional[str]:
    """
    Mask an API key for safe display.
    Shows only first 4 and last 4 characters.
    
    Example: sk-ant-api03-abcd1234...xyz → sk-an****...wxyz
    """
    if not api_key:
        return None
    
    if len(api_key) <= 8:
        return "****"
    
    # Show prefix + masked middle + suffix
    prefix = api_key[:7]  # e.g., "sk-ant-"
    suffix = api_key[-4:]  # e.g., "wxyz"
    
    return f"{prefix}****{suffix}"

def validate_key_format(api_key: str, provider: str) -> tuple[bool, str]:
    """
    Validate API key format before saving.
    
    Returns:
        (is_valid, error_message)
    """
    if not api_key or not api_key.strip():
        return False, "API key cannot be empty"
    
    api_key = api_key.strip()
    
    if provider == "anthropic":
        if not api_key.startswith("sk-ant-"):
            return False, "Anthropic keys must start with 'sk-ant-'"
        if len(api_key) < 30:
            return False, "Anthropic key seems too short"
    
    elif provider == "openai":
        if not api_key.startswith("sk-"):
            return False, "OpenAI keys must start with 'sk-'"
        if len(api_key) < 30:
            return False, "OpenAI key seems too short"
    
    elif provider == "tavily":
        if not api_key.startswith("tvly-"):
            return False, "Tavily keys must start with 'tvly-'"
    
    elif provider == "voyage":
        if not api_key.startswith("vo-") and not api_key.startswith("vk-"):
            return False, "Voyage keys must start with 'vo-' or 'vk-'"

    elif provider == "google":
        if not api_key.startswith("AIza"):
            return False, "Google AI keys must start with 'AIza'"

    elif provider == "groq":
        if not api_key.startswith("gsk_"):
            return False, "Groq keys must start with 'gsk_'"

    elif provider == "mistral":
        if len(api_key) < 20:
            return False, "Mistral key seems too short"

    elif provider == "nvidia":
        if not api_key.startswith("nvapi-"):
            return False, "NVIDIA NIM keys must start with 'nvapi-'"

    elif provider == "deepseek":
        if not api_key.startswith("sk-"):
            return False, "DeepSeek keys must start with 'sk-'"

    elif provider == "zhipu":
        # Zhipu/Z.ai keys have no fixed prefix (matches KEY_PREFIXES["zhipu"]
        # = None in llm_providers.py) — just a basic sanity length check.
        if len(api_key) < 20:
            return False, "Zhipu key seems too short"
    
    if len(api_key) > 500:
        return False, "API key too long (max 500 characters)"
    
    return True, "Valid format"