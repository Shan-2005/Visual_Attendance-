import os
import cv2
import numpy as np
import pickle
import glob
from sklearn.decomposition import PCA
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score
import time

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_FILE = os.path.join(MODELS_DIR, "trained_model.pkl")
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATASET_DIR, exist_ok=True)

class FaceRecognitionEngine:
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(CASCADE_PATH)
        self.model = None
        self.classes_ = []
        self.student_meta = {} # maps class_name -> {'student_id': ..., 'name': ...}
        self.model_info = {"status": "untrained", "trained_at": None, "accuracy": 0.0, "samples": 0}
        self.target_size = (64, 64)
        self.load_model()

    def extract_features(self, face_bgr):
        """Preprocesses face to normalized feature vector."""
        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
        resized = cv2.resize(gray, self.target_size, interpolation=cv2.INTER_AREA)
        # Histogram equalization for lighting robustness
        equalized = cv2.equalizeHist(resized)
        normalized = equalized.astype(np.float32) / 255.0
        return normalized.flatten()

    def train(self, dataset_dir):
        """
        Trains the face recognition model using samples in dataset/authorized and dataset/unauthorized.
        """
        auth_dir = os.path.join(dataset_dir, "authorized")
        unauth_dir = os.path.join(dataset_dir, "unauthorized")

        X = []
        y = []
        student_meta = {}

        # 1. Authorized students
        if os.path.exists(auth_dir):
            for student_folder in os.listdir(auth_dir):
                folder_path = os.path.join(auth_dir, student_folder)
                if not os.path.isdir(folder_path):
                    continue
                
                parts = student_folder.split("_", 1)
                student_id = parts[0]
                student_name = parts[1].replace("_", " ") if len(parts) > 1 else parts[0]
                label = f"AUTH_{student_id}"
                student_meta[label] = {
                    "student_id": student_id,
                    "name": student_name,
                    "is_authorized": True
                }

                img_paths = glob.glob(os.path.join(folder_path, "*.jpg"))
                for img_p in img_paths:
                    img = cv2.imread(img_p)
                    if img is not None:
                        feat = self.extract_features(img)
                        X.append(feat)
                        y.append(label)

        # 2. Unauthorized / Unknown persons
        if os.path.exists(unauth_dir):
            unauth_paths = glob.glob(os.path.join(unauth_dir, "*.jpg"))
            for img_p in unauth_paths:
                img = cv2.imread(img_p)
                if img is not None:
                    feat = self.extract_features(img)
                    X.append(feat)
                    y.append("UNAUTHORIZED")

        if len(X) < 2:
            return {
                "success": False,
                "message": f"Not enough samples to train. Found only {len(X)} image(s). Please capture more images first."
            }

        unique_classes = np.unique(y)
        if len(unique_classes) < 2:
            return {
                "success": False,
                "message": f"Need at least 2 distinct classes (e.g. at least 1 Authorized student and 1 Unauthorized sample). Found: {list(unique_classes)}"
            }

        X = np.array(X)
        y = np.array(y)

        # Determine PCA components based on sample count
        n_samples = len(X)
        n_components = min(40, max(2, n_samples - 1))

        # Use SVM with probability estimation or KNN
        if n_samples >= 5:
            clf = make_pipeline(
                StandardScaler(),
                PCA(n_components=n_components, whiten=True, random_state=42),
                SVC(kernel="rbf", C=5.0, gamma="scale", probability=True, random_state=42)
            )
        else:
            clf = make_pipeline(
                StandardScaler(),
                PCA(n_components=n_components, whiten=True, random_state=42),
                KNeighborsClassifier(n_neighbors=1, metric="cosine")
            )

        clf.fit(X, y)
        train_preds = clf.predict(X)
        acc = float(accuracy_score(y, train_preds))

        self.model = clf
        self.classes_ = list(clf.classes_)
        self.student_meta = student_meta
        self.model_info = {
            "status": "trained",
            "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "accuracy": round(acc * 100, 1),
            "samples": int(n_samples),
            "classes": len(unique_classes),
            "class_names": list(unique_classes)
        }

        # Save to disk
        with open(MODEL_FILE, "wb") as f:
            pickle.dump({
                "model": self.model,
                "classes": self.classes_,
                "student_meta": self.student_meta,
                "model_info": self.model_info
            }, f)

        return {
            "success": True,
            "message": "Model trained successfully!",
            "details": self.model_info
        }

    def load_model(self):
        """Loads pre-trained model if available."""
        if os.path.exists(MODEL_FILE):
            try:
                with open(MODEL_FILE, "rb") as f:
                    data = pickle.load(f)
                    self.model = data.get("model")
                    self.classes_ = data.get("classes", [])
                    self.student_meta = data.get("student_meta", {})
                    self.model_info = data.get("model_info", {"status": "trained"})
                print(f"[FaceEngine] Model loaded successfully with {len(self.classes_)} classes.")
                return True
            except Exception as e:
                print(f"[FaceEngine] Error loading model: {e}")
        return False

    def detect_and_recognize(self, frame_bgr, confidence_threshold=0.60):
        """
        Detects all faces in frame and identifies them.
        Returns: list of detections with bounding box, label, confidence, authorized flag.
        """
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(60, 60)
        )

        detections = []
        h, w = frame_bgr.shape[:2]

        for (x, y, fw, fh) in faces:
            # Crop face with safety bounds
            margin_x = int(fw * 0.1)
            margin_y = int(fh * 0.1)
            x1 = max(0, x - margin_x)
            y1 = max(0, y - margin_y)
            x2 = min(w, x + fw + margin_x)
            y2 = min(h, y + fh + margin_y)

            face_patch = frame_bgr[y1:y2, x1:x2]
            if face_patch.size == 0:
                continue

            detection = {
                "bbox": [int(x), int(y), int(fw), int(fh)],
                "label": "Unknown Person",
                "student_id": None,
                "confidence": 0.0,
                "is_authorized": False,
                "status_color": "#EF4444", # Red for unauthorized
                "badge": "UNAUTHORIZED"
            }

            if self.model is not None:
                feat = self.extract_features(face_patch).reshape(1, -1)
                
                try:
                    # Get prediction and probabilities
                    if hasattr(self.model, "predict_proba"):
                        probs = self.model.predict_proba(feat)[0]
                        max_idx = np.argmax(probs)
                        pred_class = self.classes_[max_idx]
                        conf = float(probs[max_idx])
                    else:
                        pred_class = self.model.predict(feat)[0]
                        conf = 0.90 # Default high confidence for KNN match

                    detection["confidence"] = round(conf, 2)

                    if pred_class.startswith("AUTH_") and conf >= confidence_threshold:
                        meta = self.student_meta.get(pred_class, {})
                        detection["is_authorized"] = True
                        detection["student_id"] = meta.get("student_id", pred_class.replace("AUTH_", ""))
                        detection["label"] = meta.get("name", detection["student_id"])
                        detection["status_color"] = "#10B981" # Green
                        detection["badge"] = "AUTHORIZED STUDENT"
                    else:
                        # Unauthorized or low confidence match
                        detection["is_authorized"] = False
                        detection["label"] = "Unauthorized / Unknown Person"
                        detection["status_color"] = "#EF4444" # Red
                        detection["badge"] = "UNAUTHORIZED / INTRUDER"

                except Exception as e:
                    detection["label"] = "Unknown"
                    detection["confidence"] = 0.0
            else:
                detection["label"] = "Face Detected (Model Untrained)"
                detection["status_color"] = "#F59E0B" # Amber
                detection["badge"] = "UNREGISTERED"

            detections.append(detection)

        return detections

# Global engine instance
face_engine = FaceRecognitionEngine()
