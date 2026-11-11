import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "attendance.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Students table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT DEFAULT 'Computer Science',
        registered_date TEXT NOT NULL
    )
    """)
    
    # Attendance records
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        status TEXT DEFAULT 'Present',
        UNIQUE(student_id, date)
    )
    """)
    
    # Unauthorized intrusions & alerts
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        image_path TEXT,
        confidence REAL,
        details TEXT
    )
    """)
    
    conn.commit()
    conn.close()

def register_student(student_id, name, department="Computer Science"):
    conn = get_db()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO students (student_id, name, department, registered_date)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(student_id) DO UPDATE SET
            name=excluded.name,
            department=excluded.department
    """, (student_id.strip(), name.strip(), department.strip(), now_str))
    conn.commit()
    conn.close()

def get_all_students():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students ORDER BY student_id ASC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def mark_attendance(student_id, name, confidence=0.95):
    """
    Marks attendance for a student for the current date.
    Returns: (is_new_mark, record_dict)
    """
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    # Check if already marked today
    cursor.execute("SELECT * FROM attendance WHERE student_id = ? AND date = ?", (student_id, date_str))
    existing = cursor.fetchone()
    if existing:
        conn.close()
        return False, dict(existing)
    
    cursor.execute("""
        INSERT INTO attendance (student_id, name, date, time, confidence, status)
        VALUES (?, ?, ?, ?, ?, 'Present')
    """, (student_id, name, date_str, time_str, round(float(confidence), 2)))
    conn.commit()
    
    cursor.execute("SELECT * FROM attendance WHERE id = ?", (cursor.lastrowid,))
    new_record = dict(cursor.fetchone())
    conn.close()
    return True, new_record

def log_unauthorized_person(confidence=0.5):
    """
    Logs an unauthorized person directly into the attendance records table
    without triggering a loud alarm.
    """
    conn = get_db()
    cursor = conn.cursor()
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    uid = f"UNAUTH_{int(now.timestamp()) % 10000}"

    cursor.execute("""
        INSERT INTO attendance (student_id, name, date, time, confidence, status)
        VALUES (?, 'Unauthorized Person', ?, ?, ?, 'Unauthorized')
    """, (uid, date_str, time_str, round(float(confidence), 2)))
    conn.commit()

    cursor.execute("SELECT * FROM attendance WHERE id = ?", (cursor.lastrowid,))
    rec = dict(cursor.fetchone())
    conn.close()
    return rec

def log_alert(alert_type, image_path=None, confidence=0.0, details=""):
    conn = get_db()
    cursor = conn.cursor()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO alerts (timestamp, alert_type, image_path, confidence, details)
        VALUES (?, ?, ?, ?, ?)
    """, (timestamp, alert_type, image_path, confidence, details))
    conn.commit()
    conn.close()

def get_attendance_logs(date=None):
    conn = get_db()
    cursor = conn.cursor()
    if date:
        cursor.execute("SELECT * FROM attendance WHERE date = ? ORDER BY time DESC", (date,))
    else:
        cursor.execute("SELECT * FROM attendance ORDER BY date DESC, time DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_recent_alerts(limit=20):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows

def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")
    
    cursor.execute("SELECT COUNT(*) FROM students")
    total_students = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM attendance WHERE date = ?", (today,))
    present_today = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE timestamp LIKE ?", (f"{today}%",))
    alerts_today = cursor.fetchone()[0]
    
    conn.close()
    return {
        "total_students": total_students,
        "present_today": present_today,
        "absent_today": max(0, total_students - present_today),
        "alerts_today": alerts_today,
        "today_date": today
    }

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
