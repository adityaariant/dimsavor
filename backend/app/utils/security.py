import os
from fastapi import Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends
from app.database import get_db

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        db = get_db()
        # Validate JWT and get user
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        user_id = user_response.user.id
        
        # Fetch profile (without single() to prevent exception if no row exists)
        profile = db.table("profiles").select("display_name").eq("id", user_id).execute()
        
        if not profile.data:
            display_name = user_response.user.email.split('@')[0]
        else:
            display_name = profile.data[0].get("display_name")
            
        return {
            "id": user_id,
            "email": user_response.user.email,
            "display_name": display_name
        }
    except Exception as e:
        print("Auth error:", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
