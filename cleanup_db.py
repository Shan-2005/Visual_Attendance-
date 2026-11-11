import sqlite3

conn = sqlite3.connect("attendance.db")
cur = conn.cursor()
cur.execute("DELETE FROM attendance WHERE status != 'Present' OR student_id LIKE 'UNAUTH%'")
conn.commit()
count = cur.execute("SELECT COUNT(*) FROM attendance").fetchone()[0]
print(f"Attendance records cleaned. Total valid student records remaining: {count}")
conn.close()
