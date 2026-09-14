from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from models.pothole import PotholeCreate, PotholeBatchCreate, PotholeResponse
from core.database import get_supabase
import logging

class EscalateRequest(BaseModel):
    user_id: str
    pothole_ids: List[str]
    road_name: str = "Unknown Road"

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=List[Dict[str, Any]])
def get_potholes(bbox: str = None):
    # bbox format: min_lon,min_lat,max_lon,max_lat
    supabase = get_supabase()
    
    query = supabase.table("potholes").select("*")
    
    if bbox:
        try:
            min_lon, min_lat, max_lon, max_lat = map(float, bbox.split(","))
            query = query.gte("longitude", min_lon).lte("longitude", max_lon)
            query = query.gte("latitude", min_lat).lte("latitude", max_lat)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid bbox format")
            
    # Do not return resolved potholes to the active feed unless explicitly requested (TODO: add status filter)
    # query = query.neq("status", "Resolved")
    
    result = query.execute()
    return result.data

@router.post("/", response_model=Dict[str, Any])
def create_pothole(pothole: PotholeCreate):
    supabase = get_supabase()
    
    # Simple insertion for now (replace with spatial deduplication later)
    data = {
        "latitude": pothole.latitude,
        "longitude": pothole.longitude,
        "confidence": pothole.confidence,
        "has_image": bool(pothole.image_base64),
        "image_base64": pothole.image_base64,
        "status": "Active"
    }
    
    result = supabase.table("potholes").insert(data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to insert pothole")
        
    return {"status": "success", "data": result.data[0]}

@router.post("/{pothole_id}/report")
def report_pothole(pothole_id: str):
    supabase = get_supabase()
    
    # 1. Fetch pothole
    result = supabase.table("potholes").select("*").eq("id", pothole_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Pothole not found")
        
    # 2. Trigger email (Mocked for now, will connect to Resend)
    # TODO: Connect to email service
    
    # 3. Update status to Reported
    update_result = supabase.table("potholes").update({"status": "Reported"}).eq("id", pothole_id).execute()
    
    return {"status": "success", "message": "Pothole reported to authorities", "data": update_result.data[0]}

@router.post("/{pothole_id}/verify-fix")
def verify_fix(pothole_id: str):
    supabase = get_supabase()
    
    result = supabase.table("potholes").select("*").eq("id", pothole_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Pothole not found")
        
    pothole = result.data[0]
    new_fix_confidence = pothole.get("fix_confidence", 0) + 1
    
    update_data = {"fix_confidence": new_fix_confidence}
    
    # If it has 3 votes, mark it resolved
    if new_fix_confidence >= 3:
        update_data["status"] = "Resolved"
        
    update_result = supabase.table("potholes").update(update_data).eq("id", pothole_id).execute()
    
    return {"status": "success", "data": update_result.data[0]}

import uuid

@router.post("/escalate")
def escalate_potholes(req: EscalateRequest):
    supabase = get_supabase()
    
    updated_potholes = []
    
    for pid in req.pothole_ids:
        # Check if it's a valid UUID
        try:
            uuid_obj = uuid.UUID(pid, version=4)
        except ValueError:
            # If not a UUID (e.g. sim_1 or temp_0), just silently skip backend logging
            continue
            
        try:
            existing = supabase.table("user_reports").select("*").eq("user_id", req.user_id).eq("pothole_id", pid).execute()
            if existing.data:
                continue
                
            res = supabase.table("potholes").select("*").eq("id", pid).execute()
            if res.data:
                updated_potholes.append(res.data[0])
                supabase.table("user_reports").insert({"user_id": req.user_id, "pothole_id": pid}).execute()
        except Exception as e:
            logger.error(f"Error processing pothole {pid}: {e}")
            continue
    
    return {"status": "success", "message": "Potholes escalated.", "data": updated_potholes}
