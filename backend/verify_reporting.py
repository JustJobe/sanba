import requests
import datetime
import uuid
import sys
import os

# Assuming API is running on localhost:8002
API_URL = "http://localhost:8002/api/v1"

def verify():
    print("Starting verification...")
    
    # 1. Check if admin endpoints exist (by trying to access them, expecting 401 or 403 or 200)
    # We need a token. This test might be hard without valid auth.
    # But we can check if the server is running and we can hit the root.
    try:
        r = requests.get("http://localhost:8002/")
        if r.status_code != 200:
            print("API not running or not healthy")
            return
        print("API is running.")
    except Exception as e:
        print(f"Failed to connect to API: {e}")
        return

    # Check database columns using python directly since we have direct DB access
    import sqlite3
    db_path = "/root/sanba/backend/thepurplebox.db"
    if not os.path.exists(db_path):
        print("Database not found")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Verify Users table
    cursor.execute("PRAGMA table_info(users)")
    cols = [row[1] for row in cursor.fetchall()]
    if "created_at" in cols:
        print("PASS: User.created_at exists")
    else:
        print("FAIL: User.created_at missing")

    # Verify Jobs table
    cursor.execute("PRAGMA table_info(jobs)")
    cols = [row[1] for row in cursor.fetchall()]
    if "completed_at" in cols and "execution_time" in cols:
        print("PASS: Job columns exist")
    else:
        print("FAIL: Job columns missing")

    # Verify ActivityLogs table
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'")
    if cursor.fetchone():
        print("PASS: ActivityLogs table exists")
    else:
        print("FAIL: ActivityLogs table missing")

    conn.close()
    
    # Frontend build check
    # We can check if `npm install` added deps to package.json
    with open("/root/sanba/frontend/package.json") as f:
        content = f.read()
        if "recharts" in content and "date-fns" in content:
            print("PASS: Frontend dependencies added")
        else:
            print("FAIL: Frontend dependencies missing in package.json")

    print("Verification steps complete.")

if __name__ == "__main__":
    verify()
