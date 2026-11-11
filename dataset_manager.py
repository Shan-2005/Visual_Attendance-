import os
import cv2
import numpy as np
import base64
import uuid
import glob
from PIL import Image
import io

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
AUTH_DIR = os.path.join(DATASET_DIR, "authorized")
UNAUTH_DIR = os.path.join(DATASET_DIR, "unauthorized")
INTRUSIONS_DIR = os.path.join(BASE_DIR, "static", "intrusions")

# Ensure required directories exist
for p in [AUTH_DIR, UNAUTH_DIR, INTRUSIONS_DIR]:
    os.makedirs(p, exist_ok=True)

# Face detector for cropping during dataset creation
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

def decode_base64_image(base64_str):
    """Decodes a base64 data URL string into an OpenCV BGR image."""
    if "," in base64_str:
        base64_str = base64_str.split(",")[1]
    img_bytes = base64.b64decode(base64_str)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img

def encode_image_base64(img_bgr):
    """Encodes an OpenCV image to base64 jpeg data URL."""
    _, buffer = cv2.imencode(".jpg", img_bgr)
    b64_text = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{b64_text}"

def crop_face(img_bgr, target_size=(128, 128)):
    """
    Detects the primary face in the image and crops it with a margin.
    If no face is detected, crops a centered square.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(50, 50))
    
    if len(faces) > 0:
        # Pick the largest face detected
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]
        
        # Add a 15% margin
        margin_x = int(w * 0.15)
        margin_y = int(h * 0.15)
        x1 = max(0, x - margin_x)
        y1 = max(0, y - margin_y)
        x2 = min(img_bgr.shape[1], x + w + margin_x)
        y2 = min(img_bgr.shape[0], y + h + margin_y)
        
        cropped = img_bgr[y1:y2, x1:x2]
    else:
        # Center crop fallback
        h, w = img_bgr.shape[:2]
        size = min(h, w)
        start_x = (w - size) // 2
        start_y = (h - size) // 2
        cropped = img_bgr[start_y:start_y+size, start_x:start_x+size]
        x, y, w, h = start_x, start_y, size, size

    resized = cv2.resize(cropped, target_size, interpolation=cv2.INTER_AREA)
    return resized, [int(x), int(y), int(w), int(h)]

def save_sample(image_data, category, student_id=None, student_name=None):
    """
    Saves an image into the dataset.
    category: 'authorized' (Class 1) or 'unauthorized' (Class 2)
    """
    if isinstance(image_data, str):
        img_bgr = decode_base64_image(image_data)
    else:
        img_bgr = image_data

    if img_bgr is None:
        raise ValueError("Invalid image data")

    cropped_face, bbox = crop_face(img_bgr)
    uid = uuid.uuid4().hex[:8]

    if category == "authorized":
        clean_id = (student_id or "STUDENT").replace(" ", "_").upper()
        clean_name = (student_name or "UNKNOWN").replace(" ", "_")
        student_folder = os.path.join(AUTH_DIR, f"{clean_id}_{clean_name}")
        os.makedirs(student_folder, exist_ok=True)
        filename = f"{clean_id}_{uid}.jpg"
        save_path = os.path.join(student_folder, filename)
    else:
        filename = f"unauthorized_{uid}.jpg"
        save_path = os.path.join(UNAUTH_DIR, filename)

    cv2.imwrite(save_path, cropped_face)
    return {
        "status": "success",
        "category": category,
        "filename": filename,
        "path": save_path,
        "bbox": [int(v) for v in bbox]
    }

def get_dataset_stats():
    """Returns dataset summary counts."""
    auth_students = [d for d in os.listdir(AUTH_DIR) if os.path.isdir(os.path.join(AUTH_DIR, d))]
    auth_images_count = sum(len(glob.glob(os.path.join(AUTH_DIR, d, "*.jpg"))) for d in auth_students)
    unauth_images_count = len(glob.glob(os.path.join(UNAUTH_DIR, "*.jpg")))

    students_summary = []
    for d in auth_students:
        count = len(glob.glob(os.path.join(AUTH_DIR, d, "*.jpg")))
        parts = d.split("_", 1)
        s_id = parts[0]
        s_name = parts[1] if len(parts) > 1 else parts[0]
        students_summary.append({
            "folder": d,
            "student_id": s_id,
            "name": s_name.replace("_", " "),
            "count": count
        })

    return {
        "authorized_count": auth_images_count,
        "unauthorized_count": unauth_images_count,
        "total_images": auth_images_count + unauth_images_count,
        "student_classes": len(auth_students),
        "students": students_summary
    }

def get_dataset_gallery(limit_per_class=12):
    """Returns sample image URLs / relative paths for visual UI inspection."""
    gallery = {"authorized": [], "unauthorized": []}
    
    # Authorized samples
    auth_files = glob.glob(os.path.join(AUTH_DIR, "**", "*.jpg"), recursive=True)
    for f in auth_files[:limit_per_class]:
        rel = os.path.relpath(f, BASE_DIR).replace("\\", "/")
        parent = os.path.basename(os.path.dirname(f))
        gallery["authorized"].append({
            "path": f"/dataset-img/{rel}",
            "label": parent.replace("_", " ")
        })

    # Unauthorized samples
    unauth_files = glob.glob(os.path.join(UNAUTH_DIR, "*.jpg"))
    for f in unauth_files[:limit_per_class]:
        rel = os.path.relpath(f, BASE_DIR).replace("\\", "/")
        gallery["unauthorized"].append({
            "path": f"/dataset-img/{rel}",
            "label": "Unauthorized / Unknown"
        })

    return gallery

def save_intrusion_snapshot(img_bgr):
    """Saves a high-res alert snapshot when an unauthorized intruder is flagged."""
    uid = uuid.uuid4().hex[:8]
    filename = f"intrusion_{uid}.jpg"
    filepath = os.path.join(INTRUSIONS_DIR, filename)
    cv2.imwrite(filepath, img_bgr)
    return f"/static/intrusions/{filename}"
