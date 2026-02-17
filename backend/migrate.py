import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "thepurplebox.db")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()


    # Get existing columns for users
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [row[1] for row in cursor.fetchall()]

    if "created_at" not in user_columns:
        print("Adding created_at to users...")
        try:
            # SQLite requires constant default for ADD COLUMN.
            # We add it as nullable first, or with a fixed date.
            cursor.execute("ALTER TABLE users ADD COLUMN created_at DATETIME")
            # Set a default for existing rows
            cursor.execute("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL")
        except Exception as e:
            print(f"Error adding created_at to users: {e}")

    # Get existing columns for jobs
    cursor.execute("PRAGMA table_info(jobs)")
    job_columns = [row[1] for row in cursor.fetchall()]

    if "completed_at" not in job_columns:
        print("Adding completed_at to jobs...")
        try:
            cursor.execute("ALTER TABLE jobs ADD COLUMN completed_at TIMESTAMP")
        except Exception as e:
            print(f"Error adding completed_at to jobs: {e}")
            
    if "execution_time" not in job_columns:
        print("Adding execution_time to jobs...")
        try:
            cursor.execute("ALTER TABLE jobs ADD COLUMN execution_time INTEGER")
        except Exception as e:
            print(f"Error adding execution_time to jobs: {e}")

    # Check if activity_logs table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'")
    if not cursor.fetchone():
        print("Creating activity_logs table...")
        # We rely on sqlalchemy create_all to create new tables, but we can do it here to vary strict.
        # Actually, main.py calls create_all, so if the table doesn't exist, it will be created on restart.
        # But to be safe, let's just let sqlalchemy handle the new table creation.
        print("New table 'activity_logs' will be created by SQLAlchemy on app startup.")

    conn.commit()
    conn.close()
    print("Migration check complete.")

if __name__ == "__main__":
    migrate()
