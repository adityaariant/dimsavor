import os
from fastapi import Header, HTTPException, status
from dotenv import load_dotenv

load_dotenv()

ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY")

async def get_api_key(x_api_key: str = Header(None)):
    if not ADMIN_SECRET_KEY:
        # If no key is configured on backend, we could default to open, but let's be strict.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_SECRET_KEY is not configured on the server."
        )
    if x_api_key != ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key"
        )
    return x_api_key
