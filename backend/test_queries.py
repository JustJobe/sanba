import sqlite3
import datetime
import os

def test_queries():
    print("Testing reporting queries...")
    db_path = "/root/sanba/backend/thepurplebox.db"
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    start_date = (datetime.datetime.utcnow() - datetime.timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    end_date = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    # Test Summary Query
    try:
        print("Testing Summary Query...")
        cursor.execute("SELECT COUNT(*) FROM users")
        print(f"Total Users: {cursor.fetchone()[0]}")

        cursor.execute(f"SELECT COUNT(*) FROM users WHERE created_at >= '{start_date}' AND created_at <= '{end_date}'")
        print(f"New Users: {cursor.fetchone()[0]}")

        cursor.execute(f"SELECT COUNT(*) FROM jobs WHERE created_at >= '{start_date}' AND created_at <= '{end_date}'")
        print(f"Total Jobs: {cursor.fetchone()[0]}")
        
        cursor.execute(f"SELECT AVG(execution_time) FROM jobs WHERE created_at >= '{start_date}' AND created_at <= '{end_date}' AND status = 'completed'")
        print(f"Avg Exec Time: {cursor.fetchone()[0]}")
        
    except Exception as e:
        print(f"Summary Query Failed: {e}")

    # Test Chart Query (User Growth)
    try:
        print("Testing Chart Query (User Growth)...")
        # Converting SQLAlchemy logic to raw SQL for SQLite
        query = f"""
        SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(id) as count 
        FROM users 
        WHERE created_at >= '{start_date}' AND created_at <= '{end_date}' 
        GROUP BY date
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        print(f"User Growth Rows: {len(rows)}")
    except Exception as e:
        print(f"Chart Query Failed: {e}")

    conn.close()
    print("Test complete.")

if __name__ == "__main__":
    test_queries()
