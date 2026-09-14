from fastapi import APIRouter
from api.routes import potholes, detect

api_router = APIRouter()
api_router.include_router(potholes.router, prefix="/potholes", tags=["potholes"])
api_router.include_router(detect.router, prefix="/detect", tags=["detect"])
