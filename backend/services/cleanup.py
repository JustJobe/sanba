import os
import shutil
import logging
import threading
import time
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
DEFAULT_RETENTION_DAYS = 30
CLEANUP_INTERVAL_SECS = 86400  # once per day


def _run_cleanup(retention_days: int):
    """Delete files for completed/failed jobs older than retention_days.
    Skips jobs that have active share links so shared URLs stay alive."""
    from ..database import SessionLocal
    from ..models.sql_job import Job
    from ..models.share import ShareLink
    from ..models.system_setting import SystemSetting

    db = SessionLocal()
    try:
        # Check system_settings for a configured retention period
        setting = db.query(SystemSetting).filter_by(key="job_retention_days").first()
        if setting and setting.value.isdigit():
            retention_days = int(setting.value)

        cutoff = datetime.utcnow() - timedelta(days=retention_days)
        old_jobs = (
            db.query(Job)
            .filter(Job.created_at < cutoff, Job.status.in_(["completed", "failed"]))
            .all()
        )

        if not old_jobs:
            logger.info(f"Storage cleanup: no jobs older than {retention_days} days to clean up")
            return

        # Build set of job IDs that have active share links — skip these
        old_job_ids = [j.id for j in old_jobs]
        shared_job_ids = set(
            row[0] for row in
            db.query(ShareLink.job_id)
            .filter(ShareLink.job_id.in_(old_job_ids))
            .distinct()
            .all()
        )

        deleted_count = 0
        skipped_count = 0
        freed_bytes = 0
        for job in old_jobs:
            if job.id in shared_job_ids:
                skipped_count += 1
                continue

            job_dir = os.path.join(UPLOAD_DIR, job.id)
            if os.path.isdir(job_dir):
                for dirpath, _, filenames in os.walk(job_dir):
                    for f in filenames:
                        try:
                            freed_bytes += os.path.getsize(os.path.join(dirpath, f))
                        except OSError:
                            pass
                shutil.rmtree(job_dir)
            db.delete(job)
            deleted_count += 1

        db.commit()
        logger.info(
            f"Storage cleanup: deleted {deleted_count} jobs, "
            f"skipped {skipped_count} (have share links), "
            f"freed {freed_bytes / (1024*1024):.1f} MB "
            f"(older than {retention_days} days)"
        )
    except Exception as e:
        logger.error(f"Storage cleanup error: {e}")
    finally:
        db.close()


def _cleanup_loop():
    """Background loop — runs cleanup once per day."""
    # Wait a bit after startup before the first run
    time.sleep(60)
    while True:
        try:
            _run_cleanup(DEFAULT_RETENTION_DAYS)
        except Exception as e:
            logger.error(f"Cleanup loop error: {e}")
        time.sleep(CLEANUP_INTERVAL_SECS)


def start_cleanup_scheduler():
    """Launch the cleanup background thread (daemon so it dies with the process)."""
    t = threading.Thread(target=_cleanup_loop, daemon=True, name="storage-cleanup")
    t.start()
    logger.info("Storage cleanup scheduler started (daily, default retention: %d days)", DEFAULT_RETENTION_DAYS)
