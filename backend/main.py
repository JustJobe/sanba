# NOTE: The backend application is configured to run on port 8002.
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from .database import engine
from .models import sql_job, user, incentive, activity_log, system_setting, payment, credit_ledger
from .routers import jobs, auth, admin, payments

sql_job.Base.metadata.create_all(bind=engine)
user.Base.metadata.create_all(bind=engine)
incentive.Base.metadata.create_all(bind=engine)
activity_log.Base.metadata.create_all(bind=engine)
system_setting.Base.metadata.create_all(bind=engine)
payment.Base.metadata.create_all(bind=engine)
credit_ledger.Base.metadata.create_all(bind=engine)

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="SanBa API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Session Middleware for Authlib (Required for OAuth)
app.add_middleware(SessionMiddleware, secret_key="super-secret-session-key")

app.mount("/files", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1/auth")
app.include_router(admin.router, prefix="/api/v1/admin")
app.include_router(payments.router, prefix="/api/v1")


@app.on_event("startup")
async def migrate_db():
    """Idempotently add new columns to existing tables (SQLite doesn't auto-migrate)."""
    import sqlalchemy as sa
    with engine.connect() as conn:
        existing = [row[1] for row in conn.execute(sa.text("PRAGMA table_info(jobs)"))]
        for col, defval in [
            ("ai_repaired_files",           '"[]"'),
            ("ai_repair_status",            '"[]"'),
            ("ai_repair_thinking_tokens",   '"[]"'),
            ("ai_remastered_files",         '"[]"'),
            ("ai_remaster_status",          '"[]"'),
            ("ai_remaster_thinking_tokens", '"[]"'),
            ("ai_repair_durations",         '"[]"'),
            ("ai_repair_input_meta",        '"[]"'),
            ("ai_remaster_durations",       '"[]"'),
            ("ai_remaster_input_meta",      '"[]"'),
            ("file_types",                  '"[]"'),
        ]:
            if col not in existing:
                conn.execute(sa.text(f'ALTER TABLE jobs ADD COLUMN {col} JSON DEFAULT {defval}'))
                conn.commit()
                logger.info(f"DB migration: added jobs.{col}")


@app.on_event("startup")
async def start_cleanup():
    """Launch the daily storage cleanup background thread."""
    from .services.cleanup import start_cleanup_scheduler
    start_cleanup_scheduler()


@app.on_event("startup")
async def seed_defaults():
    """Ensure default system settings and the daily_topup incentive plan exist."""
    from .database import SessionLocal
    from .models.system_setting import SystemSetting as SystemSettingModel
    from .models.incentive import IncentivePlan

    db = SessionLocal()
    try:
        # Ensure daily_credit_threshold setting exists
        if not db.query(SystemSettingModel).filter_by(key="daily_credit_threshold").first():
            db.add(SystemSettingModel(
                key="daily_credit_threshold",
                value="3",
                description="Users with fewer credits than this receive 1 free credit per day (UTC+8)"
            ))
            db.commit()
            logger.info("Seeded system setting: daily_credit_threshold = 3")

        # Ensure daily_topup incentive plan exists
        threshold_row = db.query(SystemSettingModel).filter_by(key="daily_credit_threshold").first()
        cap = int(threshold_row.value) if threshold_row and threshold_row.value.isdigit() else 3

        if not db.query(IncentivePlan).filter_by(name="daily_topup").first():
            db.add(IncentivePlan(
                name="daily_topup",
                reward_amount=1,
                cooldown_hours=24,
                max_balance_cap=cap,
                requires_profile_complete=False,
                is_active=True,
            ))
            db.commit()
            logger.info(f"Seeded incentive plan: daily_topup (cap={cap})")
    except Exception as e:
        logger.error(f"Startup seeding failed: {e}")
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "SanBa API is running"}
