import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import torch
torch.set_num_threads(1)

try:
    from ultralytics import YOLO
    
    # Check if model exists
    model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "best.pt")
    if os.path.exists(model_path):
        model = YOLO(model_path)
    else:
        print(f"Model not found at {model_path}")
        model = None
except ImportError:
    model = None

router = APIRouter()

class DetectRequest(BaseModel):
    image_base64: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    save_image: bool = False

# Create uploads dir if not exists
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

@router.post("/", response_model=Dict[str, Any])
def detect_potholes(req: DetectRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="YOLO Model not loaded or dependencies missing")
        
    try:
        # Decode base64 image
        img_data = base64.b64decode(req.image_base64.split(",")[1] if "," in req.image_base64 else req.image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
            
        # Run YOLO inference
        results = model(img, conf=0.35) # Use low confidence to catch as many as possible
        
        boxes_out = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # get box coordinates in (top, left, bottom, right) format
                b = box.xyxy[0].tolist()
                c = box.conf[0].item()
                # x, y, width, height format
                boxes_out.append({
                    "x": b[0],
                    "y": b[1],
                    "w": b[2] - b[0],
                    "h": b[3] - b[1],
                    "conf": c
                })
        
        # 1km Image Saving Logic (only save 1 representative image per ~1.1km grid)
        saved_image = False
        if req.save_image and req.latitude is not None and req.longitude is not None and len(boxes_out) > 0:
            # Rounding to 2 decimal places is roughly 1.1km
            grid_lat = round(req.latitude, 2)
            grid_lon = round(req.longitude, 2)
            img_filename = f"grid_{grid_lat}_{grid_lon}.jpg"
            img_path = os.path.join(UPLOADS_DIR, img_filename)
            
            # If no photo exists for this grid, save it
            if not os.path.exists(img_path):
                # Save the image with bounding boxes drawn for context
                img_to_save = img.copy()
                for box in boxes_out:
                    cv2.rectangle(img_to_save, (int(box["x"]), int(box["y"])), 
                                 (int(box["x"] + box["w"]), int(box["y"] + box["h"])), 
                                 (0, 0, 255), 2)
                cv2.imwrite(img_path, img_to_save)
                saved_image = True
                
        return {"status": "success", "boxes": boxes_out, "saved_image": saved_image}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
