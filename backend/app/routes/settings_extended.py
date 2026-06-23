from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified   # ← important for JSON columns
from datetime import datetime
import json
import io
import traceback
from typing import Optional
from fastapi.responses import StreamingResponse
from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/settings", tags=["settings-extended"])

# ============================================================
# PREFERENCES
# ============================================================
@router.get("/preferences")
async def get_preferences(user: User = Depends(get_current_user)):
    """Get user's saved preferences (or defaults if never saved)"""
    try:
        return user.preferences or {
            "default_mode": "research",
            "response_style": "academic",
            "streaming_enabled": True,
            "auto_save": True,
            "confidence_threshold": 70,
        }
    except Exception as e:
        print(f"Error in get_preferences: {e}")
        traceback.print_exc()
        raise HTTPException(500, "Internal error fetching preferences")

@router.put("/preferences")
async def save_preferences(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Merge partial preferences update with existing preferences"""
    try:
        current = user.preferences or {}
        current.update(data)
        user.preferences = current
        flag_modified(user, "preferences")      # mark JSON column as changed
        db.commit()
        db.refresh(user)
        return {"message": "Preferences saved", "preferences": user.preferences}
    except Exception as e:
        print(f"Error in save_preferences: {e}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(500, "Internal error saving preferences")

# ============================================================
# NOTIFICATIONS
# ============================================================
@router.get("/notifications")
async def get_notifications(user: User = Depends(get_current_user)):
    """Get user's notification settings"""
    try:
        return user.notifications or {
            "email": False,
            "research": True,
            "weekly": False,
            "rate_limit": True,
        }
    except Exception as e:
        print(f"Error in get_notifications: {e}")
        traceback.print_exc()
        raise HTTPException(500, "Internal error fetching notifications")

@router.put("/notifications")
async def save_notifications(
    data: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update notification preferences"""
    try:
        user.notifications = data
        flag_modified(user, "notifications")   # mark JSON column as changed
        db.commit()
        return {"message": "Notifications saved", "notifications": data}
    except Exception as e:
        print(f"Error in save_notifications: {e}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(500, "Internal error saving notifications")

# ============================================================
# INTEGRATIONS
# ============================================================
@router.get("/integrations")
async def get_integrations(user: User = Depends(get_current_user)):
    """Get user's connected integrations"""
    try:
        return user.integrations or {
            "google": {"connected": False},
            "github": {"connected": False},
            "notion": {"connected": False},
        }
    except Exception as e:
        print(f"Error in get_integrations: {e}")
        traceback.print_exc()
        raise HTTPException(500, "Internal error fetching integrations")

@router.post("/integrations/{name}/connect")
async def connect_integration(name: str, user: User = Depends(get_current_user)):
    """
    Initiate OAuth flow for an integration.
    For Google/GitHub, this redirects to the OAuth consent screen.
    """
    allowed = ["google", "github", "notion"]
    if name not in allowed:
        raise HTTPException(status_code=400, detail=f"Integration must be one of: {allowed}")
    
    oauth_urls = {
        "google": f"http://localhost:8000/oauth/google",
        "github": f"http://localhost:8000/oauth/github",
        "notion": None,
    }
    
    redirect_url = oauth_urls.get(name)
    if not redirect_url:
        return {"message": f"{name} integration requires manual setup", "redirect_url": None}
    
    return {"redirect_url": redirect_url}

@router.delete("/integrations/{name}/disconnect")
async def disconnect_integration(
    name: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect an integration"""
    allowed = ["google", "github", "notion"]
    if name not in allowed:
        raise HTTPException(status_code=400, detail=f"Integration must be one of: {allowed}")
    
    try:
        integrations = user.integrations or {}
        integrations[name] = {"connected": False}
        user.integrations = integrations
        flag_modified(user, "integrations")
        db.commit()
        return {"message": f"{name} disconnected"}
    except Exception as e:
        print(f"Error disconnecting {name}: {e}")
        traceback.print_exc()
        raise HTTPException(500, f"Internal error disconnecting {name}")

# ============================================================
# EXPORT USER DATA
# ============================================================
@router.get("/export")
async def export_user_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export all user data as a downloadable JSON file"""
    try:
        from app.chat_history import get_chat_history, get_debate_history
        
        research_history = get_chat_history(user.public_id, limit=100)
        debate_history = get_debate_history(user.public_id, limit=100)
        
        try:
            from app.knowledge_graph.user_memory import user_memory
            stats = user_memory.get_user_stats(user.public_id)
            interests = user_memory.get_user_interests(user.public_id, limit=20)
        except:
            stats = {}
            interests = []
        
        export_data = {
            "export_date": datetime.utcnow().isoformat(),
            "user": {
                "username": user.username,
                "email": user.email,
                "tier": user.tier,
                "member_since": str(user.created_at),
            },
            "preferences": user.preferences,
            "notifications": user.notifications,
            "research_summary": {
                "total_research": stats.get("total_research", 0),
                "total_debates": stats.get("total_debates", 0),
                "avg_confidence": stats.get("avg_confidence", 0),
                "unique_topics": stats.get("unique_topics", 0),
            },
            "top_interests": interests,
            "recent_research": research_history[:50],
            "recent_debates": debate_history[:50],
        }
        
        json_str = json.dumps(export_data, indent=2, default=str)
        
        return StreamingResponse(
            io.StringIO(json_str),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=polynous_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            }
        )
    except Exception as e:
        print(f"Error exporting data: {e}")
        traceback.print_exc()
        raise HTTPException(500, "Internal error exporting data")

# ============================================================
# CLEAR RESEARCH HISTORY
# ============================================================
@router.delete("/memory/clear")
async def clear_research_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete ALL research data for the user:
    - Chat history (SQLite)
    - Knowledge graph nodes (Neo4j)
    - Vector embeddings (Pinecone)
    """
    results = {}
    
    # 1. Clear SQLite chat history
    try:
        from app.chat_history import clear_user_chats
        clear_user_chats(user.public_id)          # not async, so no await
        results["chat_history"] = "cleared"
    except Exception as e:
        results["chat_history"] = f"error: {str(e)}"
    
    # 2. Clear Neo4j knowledge graph
    try:
        from app.knowledge_graph.graph_manager import kg
        if kg.driver:
            with kg.driver.session() as session:
                session.run(
                    "MATCH (n {user_id: $user_id}) DETACH DELETE n",
                    user_id=user.public_id
                )
            results["knowledge_graph"] = "cleared"
    except Exception as e:
        results["knowledge_graph"] = f"error: {str(e)}"
    
    # 3. Clear Pinecone vectors (delete namespace)
    try:
        from pinecone import Pinecone
        import os
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        index = pc.Index("polynous-memory")
        index.delete(delete_all=True, namespace=f"user_{user.public_id}")
        results["vector_memory"] = "cleared"
    except Exception as e:
        results["vector_memory"] = f"error: {str(e)}"
    
    return {
        "message": "Research history cleared",
        "details": results
    }

# ============================================================
# RESET ALL USER DATA (COMPLETE WIPE)
# ============================================================
@router.post("/reset")
async def reset_all_user_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Complete reset: clears research + resets preferences/notifications to defaults.
    Does NOT delete the user account itself.
    """
    try:
        # Reset preferences to defaults
        user.preferences = {
            "default_mode": "research",
            "response_style": "academic",
            "streaming_enabled": True,
            "auto_save": True,
            "confidence_threshold": 70,
        }
        user.notifications = {
            "email": False,
            "research": True,
            "weekly": False,
            "rate_limit": True,
        }
        user.integrations = {
            "google": {"connected": False},
            "github": {"connected": False},
            "notion": {"connected": False},
        }
        flag_modified(user, "preferences")
        flag_modified(user, "notifications")
        flag_modified(user, "integrations")
        db.commit()
    except Exception as e:
        print(f"Error resetting preferences: {e}")
        traceback.print_exc()
        db.rollback()
        raise HTTPException(500, "Internal error resetting preferences")
    
    # Clear all research data
    clear_results = {}
    
    try:
        from app.chat_history import clear_user_chats
        clear_user_chats(user.public_id)
        clear_results["chat_history"] = "cleared"
    except Exception as e:
        clear_results["chat_history"] = str(e)
    
    try:
        from app.knowledge_graph.graph_manager import kg
        if kg.driver:
            with kg.driver.session() as session:
                session.run(
                    "MATCH (n {user_id: $user_id}) DETACH DELETE n",
                    user_id=user.public_id
                )
            clear_results["knowledge_graph"] = "cleared"
    except Exception as e:
        clear_results["knowledge_graph"] = str(e)
    
    try:
        from pinecone import Pinecone
        import os
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        index = pc.Index("polynous-memory")
        index.delete(delete_all=True, namespace=f"user_{user.public_id}")
        clear_results["vector_memory"] = "cleared"
    except Exception as e:
        clear_results["vector_memory"] = str(e)
    
    return {
        "message": "All data reset successfully. Preferences restored to defaults.",
        "research_clear_results": clear_results
    }