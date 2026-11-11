import os
import shutil
import glob
import zipfile
import cv2
from database import register_student, init_db
from face_engine import face_engine

LFW_BASE = r"C:\Users\areoj\scikit_learn_data\lfw_home\lfw_funneled"
PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(PROJECT_DIR, "dataset")
AUTH_DIR = os.path.join(DATASET_DIR, "authorized")
UNAUTH_DIR = os.path.join(DATASET_DIR, "unauthorized")
KAGGLE_EXPORT_DIR = os.path.join(PROJECT_DIR, "kaggle_dataset")
ZIP_EXPORT_PATH = os.path.join(PROJECT_DIR, "kaggle_dataset.zip")
TM_ZIP_PATH = os.path.join(PROJECT_DIR, "TeachableMachine_Classroom_Dataset.zip")

def build():
    print("=" * 60)
    print(" Preparing Real Kaggle (LFW) Dataset for Teachable Machine & Local AI")
    print("=" * 60)

    init_db()

    # Clear old dataset folders
    for d in [AUTH_DIR, UNAUTH_DIR, KAGGLE_EXPORT_DIR]:
        if os.path.exists(d):
            shutil.rmtree(d)
        os.makedirs(d, exist_ok=True)

    # Folders for direct Google Teachable Machine upload
    tm_class1_dir = os.path.join(KAGGLE_EXPORT_DIR, "Class 1 - Authorized Student")
    tm_class2_dir = os.path.join(KAGGLE_EXPORT_DIR, "Class 2 - Unauthorized Person")
    os.makedirs(tm_class1_dir, exist_ok=True)
    os.makedirs(tm_class2_dir, exist_ok=True)

    # Define Authorized Students
    students = [
        {
            "id": "CS101",
            "name": "Rohan Sharma",
            "dept": "Computer Science & Eng",
            "lfw_name": "Colin_Powell",
            "count": 40
        },
        {
            "id": "CS102",
            "name": "Priya Patel",
            "dept": "Artificial Intelligence",
            "lfw_name": "Serena_Williams",
            "count": 40
        }
    ]

    total_auth = 0
    for s in students:
        register_student(s["id"], s["name"], s["dept"])
        student_folder_name = f"{s['id']}_{s['name'].replace(' ', '_')}"
        student_auth_dir = os.path.join(AUTH_DIR, student_folder_name)
        os.makedirs(student_auth_dir, exist_ok=True)

        src_folder = os.path.join(LFW_BASE, s["lfw_name"])
        img_files = sorted(glob.glob(os.path.join(src_folder, "*.jpg")))[:s["count"]]

        for i, img_path in enumerate(img_files):
            filename = f"{s['id']}_sample_{i+1:02d}.jpg"
            dest_local = os.path.join(student_auth_dir, filename)
            dest_tm = os.path.join(tm_class1_dir, f"{s['id']}_{s['name'].replace(' ', '_')}_{i+1:02d}.jpg")
            
            # Read, normalize size (224x224 standard) and save
            img = cv2.imread(img_path)
            if img is not None:
                img_resized = cv2.resize(img, (224, 224), interpolation=cv2.INTER_AREA)
                cv2.imwrite(dest_local, img_resized)
                cv2.imwrite(dest_tm, img_resized)
                total_auth += 1

    print(f" [Class 1 - Authorized Student]: {total_auth} real human photos saved.")

    # Class 2: Unauthorized Persons / Intruders (sample 1 photo from 60 distinct people)
    excluded = {s["lfw_name"] for s in students}
    all_people = [d for d in os.listdir(LFW_BASE) if os.path.isdir(os.path.join(LFW_BASE, d)) and d not in excluded]
    # Pick diverse people
    selected_intruders = all_people[:60]
    total_unauth = 0

    for i, person in enumerate(selected_intruders):
        person_dir = os.path.join(LFW_BASE, person)
        p_imgs = glob.glob(os.path.join(person_dir, "*.jpg"))
        if p_imgs:
            src_img = p_imgs[0]
            img = cv2.imread(src_img)
            if img is not None:
                img_resized = cv2.resize(img, (224, 224), interpolation=cv2.INTER_AREA)
                filename = f"unauthorized_intruder_{i+1:02d}_{person}.jpg"
                dest_local = os.path.join(UNAUTH_DIR, filename)
                dest_tm = os.path.join(tm_class2_dir, filename)
                cv2.imwrite(dest_local, img_resized)
                cv2.imwrite(dest_tm, img_resized)
                total_unauth += 1

    print(f" [Class 2 - Unauthorized Person]: {total_unauth} real intruder photos saved from {total_unauth} different people.")

    # Create ZIP files for Teachable Machine upload
    for zip_target in [ZIP_EXPORT_PATH, TM_ZIP_PATH]:
        with zipfile.ZipFile(zip_target, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, _, files in os.walk(KAGGLE_EXPORT_DIR):
                for f in files:
                    full_p = os.path.join(root, f)
                    arcname = os.path.relpath(full_p, KAGGLE_EXPORT_DIR)
                    zf.write(full_p, arcname)
        print(f" Created ZIP: {zip_target} ({os.path.getsize(zip_target) / (1024*1024):.2f} MB)")

    # Train local Face Engine model so the dashboard shows 100% trained
    print(" Training local computer vision classifier on new real dataset...")
    train_res = face_engine.train(DATASET_DIR)
    print(f" Model trained: Accuracy={train_res.get('accuracy', 0)*100:.1f}%, Samples={train_res.get('samples', 0)}")
    print("=" * 60)
    print(" SUCCESS: Real Kaggle dataset is fully prepared and ready!")
    print("=" * 60)

if __name__ == "__main__":
    build()
