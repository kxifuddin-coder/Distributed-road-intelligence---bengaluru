import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os

router = APIRouter()

class DetectRequest(BaseModel):
    image_base64: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    save_image: bool = False

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "best.onnx")
if os.path.exists(model_path):
    # This reads the ONNX model without any PyTorch dependencies! 
    # Massive memory reduction for Render free tier.
    net = cv2.dnn.readNetFromONNX(model_path)
else:
    print(f"ONNX Model not found at {model_path}")
    net = None

@router.post("/", response_model=Dict[str, Any])
def detect_potholes(req: DetectRequest):
    if net is None:
        raise HTTPException(status_code=503, detail="ONNX YOLO Model not loaded")
        
    try:
        img_data = base64.b64decode(req.image_base64.split(",")[1] if "," in req.image_base64 else req.image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
            
        orig_h, orig_w = img.shape[:2]
        
        # YOLOv8 ONNX inference via OpenCV (No PyTorch overhead!)
        blob = cv2.dnn.blobFromImage(img, 1/255.0, (640, 640), swapRB=True, crop=False)
        net.setInput(blob)
        preds = net.forward()
        
        # Output shape: (1, 5, 8400) -> 5 values are [xc, yc, w, h, confidence]
        preds = np.squeeze(preds, axis=0) # (5, 8400)
        preds = preds.T # (8400, 5)
        
        # Filter by confidence
        scores = preds[:, 4]
        mask = scores > 0.35
        filtered_preds = preds[mask]
        filtered_scores = scores[mask]
        
        boxes_out = []
        if len(filtered_preds) > 0:
            boxes = filtered_preds[:, :4]
            x_factor = orig_w / 640.0
            y_factor = orig_h / 640.0
            
            nms_boxes = []
            for i in range(len(boxes)):
                xc, yc, w, h = boxes[i]
                left = (xc - w/2) * x_factor
                top = (yc - h/2) * y_factor
                width = w * x_factor
                height = h * y_factor
                nms_boxes.append([int(left), int(top), int(width), int(height)])
                
            indices = cv2.dnn.NMSBoxes(nms_boxes, filtered_scores.tolist(), 0.35, 0.45)
            
            if len(indices) > 0:
                for i in indices.flatten():
                    box = nms_boxes[i]
                    # return exact format frontend expects
                    boxes_out.append({
                        "x": box[0],
                        "y": box[1],
                        "w": box[2],
                        "h": box[3],
                        "conf": float(filtered_scores[i])
                    })
        
        # 1km Image Saving Logic
        saved_image = False
        if req.save_image and req.latitude is not None and req.longitude is not None and len(boxes_out) > 0:
            grid_lat = round(req.latitude, 2)
            grid_lon = round(req.longitude, 2)
            img_filename = f"grid_{grid_lat}_{grid_lon}.jpg"
            img_path = os.path.join(UPLOADS_DIR, img_filename)
            
            if not os.path.exists(img_path):
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
