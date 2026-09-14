import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

@app.get("/")
def root():
    return {"message": "Welcome to DRIS API"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "active", "service": "DRIS API", "timestamp": "ok"}

from api.router import api_router

app.include_router(api_router, prefix=settings.API_V1_STR)
