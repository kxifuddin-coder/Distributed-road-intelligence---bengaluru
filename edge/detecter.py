import cv2
import requests
import json
from ultralytics import YOLO
import time
import base64

# 1. Load the model
model = YOLO('best.pt')

# 2. Configure Backend endpoint
# In production, use the deployed FastAPI URL
BACKEND_URL = "http://127.0.0.1:8000/api/v1/potholes/"

# 3. Connect to video feed
# For testing locally without a dashcam, you can put a sample video path here or use 0 for webcam
stream_url = '0' 
cap = cv2.VideoCapture(0) # Use local webcam for testing

# Mock GPS generator for testing the backend integration
def get_mock_gps():
    import random
    # Bounding box around Bangalore
    lat = random.uniform(12.90, 13.00)
    lon = random.uniform(77.50, 77.70)
    return lat, lon

last_upload_time = time.time()
UPLOAD_COOLDOWN = 5 # seconds

while cap.isOpened():
    success, frame = cap.read()
    if not success:
        break

    results = model(frame, conf=0.45, stream=True)

    for r in results:
        annotated_frame = r.plot()
        
        # If we found a pothole and cooldown passed
        if len(r.boxes) > 0 and time.time() - last_upload_time > UPLOAD_COOLDOWN:
            lat, lon = get_mock_gps()
            
            # Encode frame to base64
            _, buffer = cv2.imencode('.jpg', frame)
            img_b64 = base64.b64encode(buffer).decode('utf-8')
            
            payload = {
                "latitude": lat,
                "longitude": lon,
                "confidence": float(r.boxes.conf[0].item()),
                "image_base64": img_b64
            }
            
            try:
                print(f"🚀 Uploading detected pothole at ({lat:.4f}, {lon:.4f})...")
                res = requests.post(BACKEND_URL, json=payload)
                if res.status_code == 200:
                    print("✅ Upload successful!")
            except Exception as e:
                print(f"❌ Failed to reach backend: {e}")
                
            last_upload_time = time.time()

    cv2.imshow('DRIS Edge Detector', annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
