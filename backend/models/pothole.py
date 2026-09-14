from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

class PotholeCreate(BaseModel):
    latitude: float
    longitude: float
    confidence: float
    image_base64: Optional[str] = None

class PotholeBatchCreate(BaseModel):
    potholes: List[PotholeCreate]

class PotholeResponse(BaseModel):
    id: uuid.UUID
    latitude: float
    longitude: float
    road_name: Optional[str] = None
    confidence: float
    verified_count: int
    status: str
    fix_confidence: int
    detected_at: datetime
    has_image: bool
