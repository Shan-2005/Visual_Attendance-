import os
import cv2
import numpy as np
from database import register_student, init_db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

def create_synthetic_face(seed, is_unauthorized=False, variation=0):
    """
    Generates a recognizable face pattern with distinct features, eyes, nose, mouth,
    and skin tones with slight rotational/lighting variations.
    """
    np.random.seed(seed + variation * 7)
    img = np.zeros((128, 128, 3), dtype=np.uint8)
    
    # Skin tone palette
    if is_unauthorized:
        base_color = (170, 190, 220) # Cool skin tone
        hair_color = (30, 30, 40)
    else:
        tones = [
            (180, 210, 240), # Warm peach
            (140, 180, 215), # Olive
            (100, 140, 180)  # Dark bronze
        ]
        base_color = tones[seed % len(tones)]
        hair_color = (20, 20, 25)

    # Background gradient
    for y in range(128):
        v = int(240 - y * 0.4)
        img[y, :] = (v, v - 5, v - 10)

    center = (64, 66)
    axes = (38, 48)
    # Head / Face oval
    cv2.ellipse(img, center, axes, 0, 0, 360, base_color, -1)
    
    # Hair
    cv2.ellipse(img, (64, 42), (40, 26), 0, 180, 360, hair_color, -1)
    
    # Eyes
    eye_offset = (variation % 3) - 1
    eye_y = 58 + eye_offset
    cv2.circle(img, (48, eye_y), 5, (255, 255, 255), -1)
    cv2.circle(img, (80, eye_y), 5, (255, 255, 255), -1)
    cv2.circle(img, (48, eye_y), 2, (30, 20, 10), -1)
    cv2.circle(img, (80, eye_y), 2, (30, 20, 10), -1)
    
    # Eyebrows
    cv2.line(img, (42, eye_y - 7), (54, eye_y - 8), (40, 30, 20), 2)
    cv2.line(img, (74, eye_y - 8), (86, eye_y - 7), (40, 30, 20), 2)

    # Nose
    cv2.line(img, (64, 62), (64, 76), (int(base_color[0]*0.8), int(base_color[1]*0.8), int(base_color[2]*0.8)), 2)

    # Mouth
    mouth_w = 12 + (seed % 4) * 2
    cv2.ellipse(img, (64, 88), (mouth_w, 4), 0, 0, 180, (50, 50, 160), -1)

    # Add realistic noise & slight illumination variance
    noise = np.random.normal(0, 3 + variation, (128, 128, 3)).astype(np.int16)
    noisy_img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    return noisy_img

def populate_initial_samples():
    """Generates initial sample data if dataset is empty."""
    init_db()
    
    auth_dir = os.path.join(DATASET_DIR, "authorized")
    unauth_dir = os.path.join(DATASET_DIR, "unauthorized")
    os.makedirs(auth_dir, exist_ok=True)
    os.makedirs(unauth_dir, exist_ok=True)

    # Check if samples already exist
    existing_auth = len(os.listdir(auth_dir))
    existing_unauth = len(os.listdir(unauth_dir))
    
    if existing_auth > 0 or existing_unauth > 0:
        print("[SampleGenerator] Dataset already contains samples. Skipping generation.")
        return

    print("[SampleGenerator] Generating baseline demonstration dataset...")

    students = [
        {"id": "CS101", "name": "Aarav Sharma", "dept": "Computer Science"},
        {"id": "CS102", "name": "Diya Patel", "dept": "Information Tech"},
        {"id": "CS103", "name": "Rahul Verma", "dept": "Artificial Intelligence"}
    ]

    for idx, s in enumerate(students):
        register_student(s["id"], s["name"], s["dept"])
        s_folder = os.path.join(auth_dir, f"{s['id']}_{s['name'].replace(' ', '_')}")
        os.makedirs(s_folder, exist_ok=True)

        for v in range(10):
            face = create_synthetic_face(seed=idx * 10 + 1, is_unauthorized=False, variation=v)
            cv2.imwrite(os.path.join(s_folder, f"sample_{v+1}.jpg"), face)

    # Unauthorized samples
    for v in range(12):
        face = create_synthetic_face(seed=99, is_unauthorized=True, variation=v)
        cv2.imwrite(os.path.join(unauth_dir, f"unauthorized_sample_{v+1}.jpg"), face)

    print("[SampleGenerator] Demo dataset generated successfully with 3 authorized students and 12 unauthorized samples!")

if __name__ == "__main__":
    populate_initial_samples()
