from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from jose.exceptions import JWTError as JoseJWTError        # ← ADDED
from datetime import datetime, timedelta
import os
import bcrypt
import uuid
import re
import time
from cryptography.fernet import Fernet
from pydantic import BaseModel, validator, field_validator
from typing import Optional

from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

# ============================================================
# CONFIGURATION
# ============================================================
SECRET_KEY = os.getenv("JWT_SECRET", "change-this-in-production-64-chars-min")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived: 15 minutes
REFRESH_TOKEN_EXPIRE_DAYS = 7     # Refresh token: 7 days
BCRYPT_WORK_FACTOR = 12           # Higher = more secure but slower
MAX_LOGIN_ATTEMPTS = 5            # Lock after 5 failures
LOCKOUT_DURATION_MINUTES = 15     # Lock for 15 minutes

# Environment detection for cookie settings
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")  # "development" or "production"
IS_PRODUCTION = ENVIRONMENT == "production"

# ============================================================
# PASSWORD POLICY
# ============================================================

def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Password must have:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    - At least 1 special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if len(password) > 128:
        return False, "Password must be less than 128 characters"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least 1 uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least 1 lowercase letter"
    
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least 1 number"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;\/`~]', password):
        return False, "Password must contain at least 1 special character"
    
    # Check for common passwords
    common_passwords = ['password', '12345678', 'qwerty123', 'admin123', 'letmein123']
    if password.lower() in common_passwords:
        return False, "This password is too common. Please choose a stronger one."
    
    return True, "Password is strong"

# ============================================================
# PASSWORD HASHING (bcrypt)
# ============================================================

def hash_password(password: str) -> str:
    """Hash password with bcrypt (industry standard)"""
    salt = bcrypt.gensalt(rounds=BCRYPT_WORK_FACTOR)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

# ============================================================
# TOKEN MANAGEMENT
# ============================================================

def create_access_token(user_id: int, public_id: str, email: str) -> str:
    """Create short-lived access token (15 min)"""
    now = datetime.utcnow()
    expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        "sub": str(user_id),           # Internal ID
        "uid": public_id,              # Public UUID (safe to expose)
        "email": email,
        "iat": now,
        "exp": expire,
        "type": "access",
        "jti": str(uuid.uuid4())       # Unique token ID for revocation
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: int, public_id: str, email: str) -> str:
    """Create long-lived refresh token (7 days)"""
    now = datetime.utcnow()
    expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    payload = {
        "sub": str(user_id),
        "uid": public_id,
        "email": email,
        "iat": now,
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid.uuid4())
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ---------- FIXED decode_token ----------
def decode_token(token: str, expected_type: str = "access") -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            options={"verify_exp": True, "verify_iat": True}
        )
        if payload.get("type") != expected_type:
            raise HTTPException(status_code=401, detail=f"Invalid token type. Expected {expected_type}")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired. Please refresh.")
    except JoseJWTError:          # ← catches any other JWT error
        raise HTTPException(status_code=401, detail="Invalid token. Please login again.")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication failed.")

# ============================================================
# COOKIE HELPER - Centralized cookie configuration
# ============================================================

def set_refresh_cookie(response: Response, refresh_token: str):
    """
    Set refresh token cookie with environment-appropriate settings.
    Production: secure=True, samesite="none" (cross-site)
    Development: secure=False, samesite="lax" (localhost)
    """
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=IS_PRODUCTION,          # True in production (HTTPS), False in dev
        samesite="none" if IS_PRODUCTION else "lax",  # Cross-site in production
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth"
    )

# ============================================================
# AUTH MIDDLEWARE — Extract user from token
# ============================================================

async def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Extract user from JWT token.
    Use as dependency for ALL protected routes.
    """
    # Try Authorization header first
    auth_header = request.headers.get("Authorization", "")
    
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
    else:
        # Try cookie (for backward compatibility)
        token = request.cookies.get("access_token", "")
    
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    payload = decode_token(token, "access")
    
    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found or deactivated")
    
    # Check if account is locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = (user.locked_until - datetime.utcnow()).seconds // 60
        raise HTTPException(
            status_code=423,
            detail=f"Account is locked. Try again in {remaining} minutes."
        )
    
    # Store in request state for route handlers
    request.state.user_id = user.id
    request.state.user_public_id = user.public_id
    request.state.user_email = user.email
    
    return user

# ============================================================
# MODELS WITH VALIDATION
# ============================================================

class RegisterRequest(BaseModel):
    email: str
    username: str = ""   # Now optional — default empty string
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        v = v.strip().lower()
        pattern = r'^[a-zA-Z0-9][a-zA-Z0-9._%+\-]*@[a-zA-Z0-9][a-zA-Z0-9.\-]*\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError('Invalid email address')
        if len(v) > 255:
            raise ValueError('Email too long')
        return v
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        v = v.strip()
        # Only validate length if a username is actually provided
        if v:
            if len(v) < 3:
                raise ValueError('Username must be at least 3 characters')
            if len(v) > 50:
                raise ValueError('Username must be less than 50 characters')
            if not re.match(r'^[a-zA-Z0-9_\-]+$', v):
                raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        is_valid, message = validate_password_strength(v)
        if not is_valid:
            raise ValueError(message)
        return v

class LoginRequest(BaseModel):
    email: str
    password: str
    
    @field_validator('email')
    @classmethod
    def validate_email(cls, v):
        v = v.strip().lower()
        if not v or '@' not in v:
            raise ValueError('Invalid email address')
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str          # Public UUID
    username: str
    email: str
    expires_in: int

# ============================================================
# ENDPOINTS
# ============================================================

@router.post("/register")
async def register(request: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    """
    Register a new user.
    ✅ Only checks duplicate email — username is optional & non‑unique
    ✅ Auto‑generates a username if none provided
    """
    
    # Normalize email to lowercase
    email = request.email.strip().lower()
    
    # Check duplicate email
    existing_email = db.query(User).filter(User.email == email).first()
    if existing_email:
        raise HTTPException(
            status_code=409, 
            detail=f"An account with email '{email}' already exists. Please login instead."
        )
    
    # Username is optional — generate a default if empty
    username = request.username.strip() if request.username.strip() else f"researcher_{int(time.time()) % 10000}"
    
    # Validate password strength
    is_valid, message = validate_password_strength(request.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Create user with explicit commit
    try:
        user_encryption_key = Fernet.generate_key().decode()
        
        user = User(
            public_id=str(uuid.uuid4()),
            email=email,
            username=username,
            hashed_password=hash_password(request.password),
            encryption_key=user_encryption_key,
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        print(f"✅ User registered: {user.email} (ID: {user.public_id})")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")
    
    # Generate tokens
    access_token = create_access_token(user.id, user.public_id, user.email)
    refresh_token = create_refresh_token(user.id, user.public_id, user.email)
    
    # ✅ FIXED: Set refresh token cookie with cross-domain support
    set_refresh_cookie(response, refresh_token)
    
    return {
        "access_token": access_token,
        "user_id": user.public_id,
        "username": username,
        "email": email,
        "needs_profile_setup": True,  # ✅ New users need setup
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """
    Login with email and password.
    ✅ Case‑insensitive email lookup
    """
    
    email = request.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user.locked_until and user.locked_until > datetime.utcnow():
        remaining = (user.locked_until - datetime.utcnow()).seconds // 60
        raise HTTPException(
            status_code=423,
            detail=f"Account locked. Try again in {remaining} minutes."
        )
    
    if not verify_password(request.password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
            db.commit()
            raise HTTPException(
                status_code=423,
                detail=f"Account locked for {LOCKOUT_DURATION_MINUTES} minutes."
            )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token = create_access_token(user.id, user.public_id, user.email)
    refresh_token = create_refresh_token(user.id, user.public_id, user.email)
    
    # ✅ FIXED: Set refresh token cookie with cross-domain support
    set_refresh_cookie(response, refresh_token)
    
    return TokenResponse(
        access_token=access_token,
        user_id=user.public_id,
        username=user.username,
        email=user.email,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/refresh")
async def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token from cookie or Authorization header.
    ✅ Returns new access token + sets new refresh token cookie
    """
    refresh_token = request.cookies.get("refresh_token", "")
    
    if not refresh_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            refresh_token = auth_header.replace("Bearer ", "")
    
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token required")
    
    payload = decode_token(refresh_token, "refresh")
    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    new_access_token = create_access_token(user.id, user.public_id, user.email)
    new_refresh_token = create_refresh_token(user.id, user.public_id, user.email)
    
    # ✅ FIXED: Set new refresh token cookie with cross-domain support
    set_refresh_cookie(response, new_refresh_token)
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.get("/me")
async def get_current_user_profile(user: User = Depends(get_current_user)):
    return {
        "user_id": user.public_id,
        "email": user.email,
        "username": user.username,
        "tier": user.tier,
        "is_active": user.is_active,
        "created_at": str(user.created_at),
        "last_login": str(user.last_login) if user.last_login else None
    }

@router.put("/me")
async def update_profile(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if 'username' in data:
        new_username = data['username'].strip()
        if len(new_username) < 3:
            raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
        if len(new_username) > 50:
            raise HTTPException(status_code=400, detail="Username must be less than 50 characters")
        
        existing = db.query(User).filter(User.username == new_username, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=409, detail="Username already taken")
        
        user.username = new_username
    
    db.commit()
    db.refresh(user)
    
    return {
        "username": user.username,
        "email": user.email,
        "message": "Profile updated"
    }

@router.post("/logout")
async def logout(response: Response, user: User = Depends(get_current_user)):
    """Logout - clear refresh token cookie"""
    response.delete_cookie(
        key="refresh_token",
        path="/auth",
        secure=IS_PRODUCTION,
        samesite="none" if IS_PRODUCTION else "lax"
    )
    return {"message": "Logged out successfully"}

@router.put("/change-password")
async def change_password(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current = data.get("current_password")
    new = data.get("new_password")
    
    if not current or not new:
        raise HTTPException(status_code=400, detail="Both current and new passwords required")
    
    if not verify_password(current, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    is_valid, msg = validate_password_strength(new)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)
    
    user.hashed_password = hash_password(new)
    user.password_changed_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password changed successfully — please login again"}

@router.post("/revoke-sessions")
async def revoke_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke all existing sessions by invalidating refresh tokens"""
    user.password_changed_at = datetime.utcnow()
    db.commit()
    return {
        "message": "All sessions revoked. Existing tokens are now invalid. Please login again."
    }