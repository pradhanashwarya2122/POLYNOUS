```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from jose import jwt
from datetime import datetime, timedelta
import httpx
import os
import json
import uuid
import secrets
import hashlib
from cryptography.fernet import Fernet

from app.database import get_db
from app.models.user import User
from app.oauth_config import *

router = APIRouter(prefix="/oauth", tags=["oauth"])

SECRET_KEY = os.getenv("JWT_SECRET", "polynous-secret-key")
ALGORITHM = "HS256"

def create_token(user_id: int, email: str):
    """Create JWT token"""
    expire = datetime.utcnow() + timedelta(hours=24)
    data = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def hash_password(password: str) -> str:
    """Hash password with SHA-256 + salt"""
    salt = os.urandom(32).hex()
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${hashed}"

def get_or_create_user(db: Session, email: str, username: str, avatar_url: str = "", provider: str = ""):
    """Get existing user or create new one with encryption_key. Returns (user, is_new_user)."""
    user = db.query(User).filter(User.email == email).first()
    is_new_user = False
    
    if not user:
        user = User(
            email=email,
            username=username or email.split('@')[0],
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            tier="free",
            encryption_key=Fernet.generate_key().decode(),  # ← FIXED: Added encryption_key
            public_id=str(uuid.uuid4()),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new_user = True
        print(f"✅ New user created: {email} (via {provider})")
    else:
        user.last_login = datetime.utcnow()
        db.commit()
        print(f"✅ Existing user logged in: {email} (via {provider})")
    
    return user, is_new_user

# ========== GOOGLE OAUTH ==========
@router.get("/google")
async def google_login():
    """Redirect to Google for authentication"""
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        "&access_type=offline"
    )
    return RedirectResponse(url=google_auth_url)

@router.get("/google/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code"
                }
            )
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_info = user_response.json()
        
        user, is_new_user = get_or_create_user(
            db=db,
            email=user_info.get("email"),
            username=user_info.get("name") or user_info.get("email", "").split('@')[0],
            avatar_url=user_info.get("picture", ""),
            provider="google"
        )
        
        token = create_token(user.id, user.email)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5174")
        
        redirect_url = f"{frontend_url}/auth/callback?token={token}&username={user.username}&email={user.email}"
        if is_new_user:
            redirect_url += "&existing_user=false"
        else:
            redirect_url += "&existing_user=true"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        print(f"Google OAuth error: {e}")
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")

# ========== GITHUB OAUTH ==========
@router.get("/github")
async def github_login():
    """Redirect to GitHub for authentication"""
    github_auth_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        "&scope=user:email"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
    )
    return RedirectResponse(url=github_auth_url)

@router.get("/github/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    """Handle GitHub OAuth callback"""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": GITHUB_REDIRECT_URI
                },
                headers={"Accept": "application/json"}
            )
            token_data = token_response.json()
            access_token = token_data.get("access_token")
            
            user_response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            user_info = user_response.json()
            
            email = user_info.get("email")
            if not email:
                email_response = await client.get(
                    "https://api.github.com/user/emails",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                emails = email_response.json()
                primary_email = next((e for e in emails if e.get("primary")), None)
                email = primary_email.get("email") if primary_email else f"{user_info['login']}@github.com"
        
        user, is_new_user = get_or_create_user(
            db=db,
            email=email,
            username=user_info.get("login") or user_info.get("name"),
            avatar_url=user_info.get("avatar_url", ""),
            provider="github"
        )
        
        token = create_token(user.id, user.email)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5174")
        
        redirect_url = f"{frontend_url}/auth/callback?token={token}&username={user.username}&email={email}"
        if is_new_user:
            redirect_url += "&existing_user=false"
        else:
            redirect_url += "&existing_user=true"
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        print(f"GitHub OAuth error: {e}")
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")
```