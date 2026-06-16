import os
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.routers import sessions, slots, orders, kitchen, finance, alias, parse
from app.utils.security import get_current_user

load_dotenv()

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(title="Dimsavor API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

origins = os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

auth_dep = [Depends(get_current_user)]

app.include_router(sessions.router, dependencies=auth_dep)
app.include_router(slots.router, dependencies=auth_dep)
app.include_router(orders.router, dependencies=auth_dep)
app.include_router(kitchen.router, dependencies=auth_dep)
app.include_router(finance.router, dependencies=auth_dep)
app.include_router(alias.router, dependencies=auth_dep)
app.include_router(parse.router, dependencies=auth_dep)

@app.get("/auth/me", dependencies=auth_dep)
def verify_auth(request: Request, current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/")
def read_root():
    return {"message": "Dimsavor API is running"}
