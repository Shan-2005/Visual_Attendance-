# AI-Based Classroom Attendance & Security Monitoring System
### FP-II Experiment 9: Camera-Based Dataset Creation using Google Teachable Machine

An end-to-end Computer Vision & AI monitoring application designed for classroom attendance tracking and unauthorized intruder detection.

---

## 🌟 Key Highlights & Features

- **Mandatory Tool Used**: **Google Teachable Machine** (with fallback to high-speed local PCA + Support Vector Machine engine).
- **Two Distinct Classes**:
  - **Class 1: Authorized Student** — Registered classroom students eligible for automated attendance marking.
  - **Class 2: Unauthorized / Unknown Person** — Unregistered individuals, visitors, or intruders triggering real-time security alerts.
- **Camera-Based Dataset Creation Studio**:
  - High-speed single-shot and 20-frame burst capture directly via webcam.
  - Automatic face detection, alignment, cropping, and folder organization.
  - **One-click "Export Dataset (.ZIP) for Teachable Machine"** to upload directly into Google Teachable Machine Studio.
- **Live Classroom Monitoring**:
  - Real-time webcam inference with visual bounding boxes:
    - 🟢 **Green Bounding Box**: Authorized student identified with confidence %; automatically logged into attendance register.
    - 🔴 **Red Bounding Box & Security Banner**: Unauthorized person detected; triggers audible alarm and logs snapshot to security audit records.
- **Teachable Machine Direct Integration**:
  - Paste any Google Teachable Machine model URL (`https://teachablemachine.withgoogle.com/models/xyz/`) to run live inference directly in the browser via TensorFlow.js.
  - Live probability meters showing Class 1 vs Class 2 confidence in real-time.
- **Classroom Attendance Records & Export**:
  - Searchable, date-filterable attendance database (SQLite).
  - Export attendance anytime to **Excel (.xlsx)** or **CSV**.
  - Security audit log with timestamps and intrusion snapshots.

---

## 🚀 Running the Application

The application runs on a dedicated port (`5500`) to avoid conflicting with other projects running on port `5000`:

```bash
# 1. Navigate to the project directory
cd smart-attendance-system

# 2. Activate virtual environment
.\venv\Scripts\activate

# 3. Start the server
python app.py
```

Open your browser and navigate to:
👉 **[http://127.0.0.1:5500](http://127.0.0.1:5500)**

---

## 📋 FP-II Experiment 9 Workflow

1. **Open the Dashboard**: Go to [http://127.0.0.1:5500](http://127.0.0.1:5500).
2. **Dataset Creation**:
   - Go to the **Dataset Creator** tab.
   - Select **Class 1 (Authorized Student)**: Enter Student Roll Number and Name, then click **Burst Capture (20 Shots)**.
   - Select **Class 2 (Unauthorized / Unknown)**: Click **Burst Capture** to record negative intruder samples.
3. **Export to Teachable Machine**:
   - Click **Export Dataset (.ZIP) for Teachable Machine**.
   - Open [Google Teachable Machine](https://teachablemachine.withgoogle.com/train/image).
   - Add **Class 1** and **Class 2**, upload the respective images, and click **Train Model**.
   - Click **Export Model** → **Upload my model (shareable link)**.
4. **Connect & Test**:
   - Copy the link and paste it into the **Model & Gallery** tab under *Google Teachable Machine Integration*.
   - Click **Connect Model**.
   - Return to **Live Monitoring** and watch real-time attendance marking and intrusion alarms in action!
