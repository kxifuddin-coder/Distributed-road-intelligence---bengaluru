import base64
import cv2
import gc
import numpy as np
import onnxruntime as ort
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os

router = APIRouter()

class DetectRequest(BaseModel):
    image_base64: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    save_image: bool = False

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Load FP16 ONNX model at startup using onnxruntime.
# onnxruntime fully supports FP16, unlike cv2.dnn.
# Single-threaded to minimize memory on Render free tier.
model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "best.onnx")
if os.path.exists(model_path):
    _sess_opts = ort.SessionOptions()
    _sess_opts.intra_op_num_threads = 1
    _sess_opts.inter_op_num_threads = 1
    # Disable pre-allocated memory arena and pattern optimization.
    # ORT holds these in the cgroup even when idle, pushing us over
    # Render's 512MB cgroup limit despite low process RSS. ~130MB saved.
    _sess_opts.enable_cpu_mem_arena = False
    _sess_opts.enable_mem_pattern = False
    sess = ort.InferenceSession(model_path, _sess_opts, providers=["CPUExecutionProvider"])
    input_name = sess.get_inputs()[0].name
else:
    print(f"ONNX Model not found at {model_path}")
    sess = None
    input_name = None

@router.post("/", response_model=Dict[str, Any])
def detect_potholes(req: DetectRequest):
    if sess is None:
        raise HTTPException(status_code=503, detail="ONNX YOLO Model not loaded")
        
    try:
        img_data = base64.b64decode(req.image_base64.split(",")[1] if "," in req.image_base64 else req.image_base64)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Layer 2: Resize immediately to 640x640 so the inference step
        # doesn't hold both the large original image AND the resized blob
        # in memory simultaneously (~30MB peak RAM saving on phone images).
        img = cv2.resize(img, (640, 640))

        # Prepare input tensor: BGR->RGB, HWC->CHW, normalize, add batch
        blob = img.astype(np.float32) / 255.0
        blob = blob[:, :, ::-1]              # BGR -> RGB
        blob = np.transpose(blob, (2, 0, 1)) # HWC -> CHW
        blob = np.expand_dims(blob, 0)       # (1, 3, 640, 640)

        # Run FP16 ONNX inference via onnxruntime
        preds = sess.run(None, {input_name: blob})[0]

        # Output shape: (1, 5, 8400) -> 5 values are [xc, yc, w, h, confidence]
        preds = np.squeeze(preds, axis=0).T  # (8400, 5)

        # Filter by confidence
        scores = preds[:, 4]
        mask = scores > 0.35
        filtered_preds = preds[mask]
        filtered_scores = scores[mask]

        boxes_out = []
        if len(filtered_preds) > 0:
            nms_boxes = []
            for row in filtered_preds:
                xc, yc, w, h = row[:4]
                nms_boxes.append([int(xc - w/2), int(yc - h/2), int(w), int(h)])

            indices = cv2.dnn.NMSBoxes(nms_boxes, filtered_scores.tolist(), 0.35, 0.45)

            if len(indices) > 0:
                for i in indices.flatten():
                    box = nms_boxes[i]
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
                
        # Layer 4: Explicit GC after each inference — prevents memory
        # fragmentation buildup on long-running Render free-tier servers.
        gc.collect()
        return {"status": "success", "boxes": boxes_out, "saved_image": saved_image}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
