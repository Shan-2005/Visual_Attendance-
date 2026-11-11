import os
import io
import time
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory, Response
import pandas as pd
import numpy as np
from flask.json.provider import DefaultJSONProvider

from database import (
    init_db, register_student, get_all_students, mark_attendance,
    log_alert, get_attendance_logs, get_recent_alerts, get_dashboard_stats,
    log_unauthorized_person
)
from dataset_manager import (
    save_sample, get_dataset_stats, get_dataset_gallery,
    decode_base64_image, save_intrusion_snapshot, DATASET_DIR
)
from face_engine import face_engine
from sample_data_generator import populate_initial_samples

class NumpyJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        elif isinstance(obj, (np.floating,)):
            return float(obj)
        elif isinstance(obj, (np.ndarray,)):
            return obj.tolist()
        return super().default(obj)

app = Flask(__name__)
app.json_provider_class = NumpyJSONProvider
app.json = NumpyJSONProvider(app)
app.config['JSON_SORT_KEYS'] = False

# Cooldown dictionary to avoid flooding duplicate alerts every 100ms
last_alert_time = 0
ALERT_COOLDOWN_SECONDS = 4.0

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/stats", methods=["GET"])
def get_stats():
    dash_stats = get_dashboard_stats()
    ds_stats = get_dataset_stats()
    model_info = face_engine.model_info
    return jsonify({
        "dashboard": dash_stats,
        "dataset": ds_stats,
        "model": model_info
    })

@app.route("/api/students", methods=["GET"])
def get_students_list():
    students = get_all_students()
    return jsonify({"students": students})

@app.route("/api/dataset/stats", methods=["GET"])
def api_dataset_stats():
    stats = get_dataset_stats()
    return jsonify(stats)

@app.route("/api/dataset/gallery", methods=["GET"])
def api_dataset_gallery():
    gallery = get_dataset_gallery()
    return jsonify(gallery)

@app.route("/api/dataset/export-zip", methods=["GET"])
def export_dataset_zip():
    """
    Exports the captured dataset as a ZIP file structured for Teachable Machine:
    Class 1 - Authorized Student/
    Class 2 - Unauthorized Person/
    """
    import zipfile
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # Add Class 1: Authorized images
        auth_dir = os.path.join(DATASET_DIR, "authorized")
        if os.path.exists(auth_dir):
            for root, _, files in os.walk(auth_dir):
                for file in files:
                    if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                        file_path = os.path.join(root, file)
                        rel_path = os.path.relpath(file_path, auth_dir)
                        arcname = os.path.join("Class 1 - Authorized Student", rel_path)
                        zip_file.write(file_path, arcname)

        # Add Class 2: Unauthorized images
        unauth_dir = os.path.join(DATASET_DIR, "unauthorized")
        if os.path.exists(unauth_dir):
            for root, _, files in os.walk(unauth_dir):
                for file in files:
                    if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                        file_path = os.path.join(root, file)
                        rel_path = os.path.relpath(file_path, unauth_dir)
                        arcname = os.path.join("Class 2 - Unauthorized Person", rel_path)
                        zip_file.write(file_path, arcname)

    zip_buffer.seek(0)
    return Response(
        zip_buffer.getvalue(),
        mimetype="application/zip",
        headers={"Content-Disposition": "attachment;filename=TeachableMachine_Classroom_Dataset.zip"}
    )

@app.route("/api/attendance/mark_tm", methods=["POST"])
def mark_attendance_tm():
    """
    Endpoint for Teachable Machine model running in browser:
    Marks attendance when Class 1 (Authorized Student) is detected.
    """
    data = request.get_json(force=True)
    student_id = data.get("student_id", "STU_AUTHORIZED")
    student_name = data.get("name", "Authorized Student")
    confidence = float(data.get("confidence", 0.95))

    is_new, record = mark_attendance(student_id, student_name, confidence)
    return jsonify({
        "success": True,
        "is_new": is_new,
        "record": record
    })

@app.route("/api/attendance/alert_tm", methods=["POST"])
def alert_tm():
    """
    Teachable Machine detection for Class 2:
    No attendance records are kept for unauthorized persons.
    """
    return jsonify({"logged": False})

@app.route("/api/dataset/capture", methods=["POST"])
def capture_dataset_sample():
    """
    Receives base64 image data and saves to dataset.
    JSON payload: {
        "image": "data:image/jpeg;base64,...",
        "category": "authorized" | "unauthorized",
        "student_id": "CS101",
        "name": "Jane Doe",
        "department": "CSE"
    }
    """
    data = request.get_json(force=True)
    image_b64 = data.get("image")
    category = data.get("category", "authorized")
    student_id = data.get("student_id")
    student_name = data.get("name")
    department = data.get("department", "Computer Science")

    if not image_b64:
        return jsonify({"error": "No image data provided"}), 400

    try:
        # Save sample
        result = save_sample(image_b64, category, student_id, student_name)
        
        # If authorized student, record in students table
        if category == "authorized" and student_id and student_name:
            register_student(student_id, student_name, department)

        # Refresh stats
        stats = get_dataset_stats()
        result["dataset_stats"] = stats
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/model/train", methods=["POST"])
def train_model():
    """Triggers model training on current dataset."""
    try:
        res = face_engine.train(DATASET_DIR)
        return jsonify(res)
    except Exception as e:
        return jsonify({"success": False, "message": f"Training failed: {str(e)}"}), 500

@app.route("/api/model/status", methods=["GET"])
def model_status():
    return jsonify(face_engine.model_info)

@app.route("/api/attendance/process_frame", methods=["POST"])
def process_attendance_frame():
    """
    Processes a live webcam frame sent as base64.
    Runs face detection & recognition.
    Logs attendance if authorized student detected.
    Logs alert if unauthorized / intruder detected.
    """
    global last_alert_time
    data = request.get_json(force=True)
    frame_b64 = data.get("image")
    confidence_thresh = float(data.get("threshold", 0.60))

    if not frame_b64:
        return jsonify({"error": "No frame received"}), 400

    try:
        frame_bgr = decode_base64_image(frame_b64)
        if frame_bgr is None:
            return jsonify({"error": "Corrupt frame"}), 400

        detections = face_engine.detect_and_recognize(frame_bgr, confidence_threshold=confidence_thresh)
        marked_students = []
        alert_triggered = False
        now_ts = time.time()

        for det in detections:
            if det.get("is_authorized"):
                # Mark attendance
                s_id = det["student_id"]
                s_name = det["label"]
                conf = det["confidence"]
                is_new, record = mark_attendance(s_id, s_name, confidence=conf)
                if is_new:
                    marked_students.append({
                        "student_id": s_id,
                        "name": s_name,
                        "time": record["time"],
                        "confidence": conf,
                        "status": "Present"
                    })
            # Unauthorized persons are simply detected and indicated on the live camera overlay,
            # but NO record or attendance entry is saved.

        return jsonify({
            "detections": detections,
            "faces_count": len(detections),
            "newly_marked": marked_students,
            "alert_triggered": False
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/attendance/logs", methods=["GET"])
def attendance_logs():
    date = request.args.get("date")
    logs = get_attendance_logs(date)
    return jsonify({"logs": logs})

@app.route("/api/alerts", methods=["GET"])
def alert_logs():
    alerts = get_recent_alerts()
    return jsonify({"alerts": alerts})

@app.route("/api/attendance/export/csv", methods=["GET"])
def export_csv():
    logs = get_attendance_logs()
    df = pd.DataFrame(logs)
    if df.empty:
        df = pd.DataFrame(columns=["id", "student_id", "name", "date", "time", "confidence", "status"])
    
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=attendance_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@app.route("/api/attendance/export/excel", methods=["GET"])
def export_excel():
    logs = get_attendance_logs()
    df = pd.DataFrame(logs)
    if df.empty:
        df = pd.DataFrame(columns=["id", "student_id", "name", "date", "time", "confidence", "status"])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Attendance")
    output.seek(0)

    return Response(
        output.getvalue(),
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment;filename=attendance_{datetime.now().strftime('%Y%m%d')}.xlsx"}
    )

@app.route("/dataset-img/<path:filename>")
def serve_dataset_image(filename):
    return send_from_directory(os.path.dirname(os.path.abspath(__file__)), filename)

@app.route("/report")
def view_lab_report():
    return render_template("report.html")

@app.route("/api/report/markdown")
def get_report_markdown():
    report_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "SRM_FP2_EXPERIMENT_9_REPORT.md")
    with open(report_path, "r", encoding="utf-8") as f:
        content = f.read()
    return Response(content, mimetype="text/markdown")

if __name__ == "__main__":
    init_db()

    print("=" * 60)
    print(" AI Classroom Attendance Monitoring System")
    print(" Server running at: http://127.0.0.1:5500")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5500, debug=False, threaded=True)
