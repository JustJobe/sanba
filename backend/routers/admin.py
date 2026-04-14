from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.incentive import IncentivePlan
from ..models.sql_job import Job
from ..models.activity_log import ActivityLog
from ..models.system_setting import SystemSetting
from ..models.payment import Payment
from ..models.credit_ledger import CreditLedger
from .auth import get_current_user
from ..services.credit_ledger import record_credit_change
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import csv
import io
import os
import shutil
import logging
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

router = APIRouter()

# --- SCHEMAS ---
class AdminUserResponse(BaseModel):
    id: str
    email: str
    phone: Optional[str]
    full_name: Optional[str]
    credits: int
    is_admin: int

class IncentivePlanCreate(BaseModel):
    name: str
    reward_amount: int
    cooldown_hours: int
    max_balance_cap: int
    requires_profile_complete: bool
    is_active: bool

class IncentivePlanResponse(IncentivePlanCreate):
    id: str

class CreditUpdate(BaseModel):
    amount: int

# --- DEPENDENCIES ---
def get_admin_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user

# --- ENDPOINTS ---

@router.get("/users", response_model=List[AdminUserResponse])
def list_users(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(User).all()

@router.put("/users/{user_id}/credits")
def update_user_credits(user_id: str, update: CreditUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_balance = user.credits
    user.credits = update.amount
    delta = update.amount - old_balance
    record_credit_change(
        db=db, user_id=user.id,
        action="admin_grant" if delta >= 0 else "admin_deduct",
        amount=delta, balance_after=user.credits,
        actor=admin.id,
        note=f"Set from {old_balance} to {update.amount}",
    )
    db.commit()
    return {"message": "Credits updated", "new_balance": user.credits}

@router.get("/incentives", response_model=List[IncentivePlanResponse])
def list_incentives(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    return db.query(IncentivePlan).all()

@router.post("/incentives", response_model=IncentivePlanResponse)
def create_incentive(plan: IncentivePlanCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    db_plan = IncentivePlan(**plan.dict())
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.put("/incentives/{plan_id}", response_model=IncentivePlanResponse)
def update_incentive(plan_id: str, plan: IncentivePlanCreate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    db_plan = db.query(IncentivePlan).filter(IncentivePlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    for key, value in plan.dict().items():
        setattr(db_plan, key, value)
    
    db.commit()
    db.refresh(db_plan)
    return db_plan

@router.delete("/incentives/{plan_id}")
def delete_incentive(plan_id: str, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    db_plan = db.query(IncentivePlan).filter(IncentivePlan.id == plan_id).first()
    if not db_plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    db_plan.is_active = False
    db.commit()
    return {"message": "Plan deactivated"}

# --- REPORTING ENDPOINTS ---

@router.get("/reports/summary")
def get_reports_summary(
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_admin_user)
):
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    # Total Users
    total_users = db.query(User).count()
    new_users = db.query(User).filter(User.created_at >= start_date, User.created_at <= end_date).count()

    # Job Stats
    total_jobs = db.query(Job).filter(Job.created_at >= start_date, Job.created_at <= end_date).count()
    completed_jobs = db.query(Job).filter(Job.created_at >= start_date, Job.created_at <= end_date, Job.status == "completed").count()
    failed_jobs = db.query(Job).filter(Job.created_at >= start_date, Job.created_at <= end_date, Job.status == "failed").count()

    # Photos processed & credits used
    completed_jobs_list = db.query(Job).filter(
        Job.created_at >= start_date, Job.created_at <= end_date, Job.status == "completed"
    ).all()

    # Restored = files that made it through OpenCV processing
    photos_restored = sum(len(j.processed_files) if j.processed_files else 0 for j in completed_jobs_list)
    # Credits charged for restore = 1 per input file (matches router cost = len(job.files))
    credits_restore = sum(len(j.files) if j.files else 0 for j in completed_jobs_list)

    # AI Repaired = non-null slots in ai_repaired_files (only possible on completed jobs)
    AI_REPAIR_COST = 3
    photos_ai_repaired = sum(
        sum(1 for x in (j.ai_repaired_files or []) if x is not None)
        for j in completed_jobs_list
    )
    credits_ai_repair = photos_ai_repaired * AI_REPAIR_COST

    # AI Remastered = non-null slots in ai_remastered_files
    AI_REMASTER_COST = 3
    photos_ai_remastered = sum(
        sum(1 for x in (j.ai_remastered_files or []) if x is not None)
        for j in completed_jobs_list
    )
    credits_ai_remaster = photos_ai_remastered * AI_REMASTER_COST

    avg_files_per_job = round(photos_restored / completed_jobs, 1) if completed_jobs > 0 else 0

    # Thinking tokens — sum all non-null values across all jobs in the period
    total_repair_thinking_tokens = sum(
        sum(t for t in (j.ai_repair_thinking_tokens or []) if t is not None)
        for j in completed_jobs_list
    )
    total_remaster_thinking_tokens = sum(
        sum(t for t in (j.ai_remaster_thinking_tokens or []) if t is not None)
        for j in completed_jobs_list
    )

    # Per-image durations and megapixels for repair and remaster
    repair_durations = [d for j in completed_jobs_list for d in (j.ai_repair_durations or []) if d is not None]
    remaster_durations = [d for j in completed_jobs_list for d in (j.ai_remaster_durations or []) if d is not None]
    avg_repair_duration_secs = round(sum(repair_durations) / len(repair_durations), 2) if repair_durations else None
    avg_remaster_duration_secs = round(sum(remaster_durations) / len(remaster_durations), 2) if remaster_durations else None

    repair_mps = [(m["w"] * m["h"]) / 1_000_000 for j in completed_jobs_list for m in (j.ai_repair_input_meta or []) if m]
    remaster_mps = [(m["w"] * m["h"]) / 1_000_000 for j in completed_jobs_list for m in (j.ai_remaster_input_meta or []) if m]
    avg_repair_input_megapixels = round(sum(repair_mps) / len(repair_mps), 2) if repair_mps else None
    avg_remaster_input_megapixels = round(sum(remaster_mps) / len(remaster_mps), 2) if remaster_mps else None

    # Revenue metrics
    total_revenue_cents = db.query(func.sum(Payment.price_myr_cents)).filter(
        Payment.status == "completed",
        Payment.completed_at >= start_date, Payment.completed_at <= end_date
    ).scalar() or 0
    total_credits_purchased = db.query(func.sum(Payment.credits_delivered)).filter(
        Payment.status == "completed",
        Payment.completed_at >= start_date, Payment.completed_at <= end_date
    ).scalar() or 0
    total_purchases = db.query(Payment).filter(
        Payment.status == "completed",
        Payment.completed_at >= start_date, Payment.completed_at <= end_date
    ).count()

    # Active users (distinct users who submitted any job in period)
    active_users = db.query(func.count(func.distinct(Job.user_id))).filter(
        Job.created_at >= start_date, Job.created_at <= end_date, Job.user_id.isnot(None)
    ).scalar() or 0

    # Average Execution Time (for completed jobs)
    avg_exec_time = db.query(func.avg(Job.execution_time)).filter(Job.created_at >= start_date, Job.created_at <= end_date, Job.status == "completed").scalar() or 0

    return {
        "total_users": total_users,
        "new_users": new_users,
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs,
        "success_rate": (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0,
        "avg_execution_time": round(avg_exec_time, 2),
        "photos_processed": photos_restored,      # kept for backwards compat
        "photos_restored": photos_restored,
        "photos_ai_repaired": photos_ai_repaired,
        "photos_ai_remastered": photos_ai_remastered,
        "credits_restore": credits_restore,
        "credits_ai_repair": credits_ai_repair,
        "credits_ai_remaster": credits_ai_remaster,
        "credits_used": credits_restore + credits_ai_repair + credits_ai_remaster,
        "avg_files_per_job": avg_files_per_job,
        "active_users": active_users,
        "total_repair_thinking_tokens": total_repair_thinking_tokens,
        "total_remaster_thinking_tokens": total_remaster_thinking_tokens,
        "total_thinking_tokens": total_repair_thinking_tokens + total_remaster_thinking_tokens,
        "avg_repair_duration_secs":      avg_repair_duration_secs,
        "avg_remaster_duration_secs":    avg_remaster_duration_secs,
        "avg_repair_input_megapixels":   avg_repair_input_megapixels,
        "avg_remaster_input_megapixels": avg_remaster_input_megapixels,
        "total_revenue_myr": round(total_revenue_cents / 100, 2),
        "total_credits_purchased": total_credits_purchased,
        "total_purchases": total_purchases,
    }

@router.get("/reports/chart")
def get_reports_chart(
    range_type: str = "daily", # daily, monthly
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_admin_user)
):
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    # Helper to group by date
    # SQLite uses strftime. '%Y-%m-%d' for daily.
    date_format = '%Y-%m-%d'
    if range_type == 'monthly':
        date_format = '%Y-%m'

    # User Growth Chart
    user_growth = db.query(
        func.strftime(date_format, User.created_at).label('date'),
        func.count(User.id).label('count')
    ).filter(User.created_at >= start_date, User.created_at <= end_date)\
    .group_by('date').all()

    # Job Activity Chart
    job_activity = db.query(
        func.strftime(date_format, Job.created_at).label('date'),
        func.count(Job.id).label('count')
    ).filter(Job.created_at >= start_date, Job.created_at <= end_date)\
    .group_by('date').all()

    return {
        "user_growth": [{"date": r.date, "count": r.count} for r in user_growth],
        "job_activity": [{"date": r.date, "count": r.count} for r in job_activity]
    }

@router.get("/reports/export")
def export_reports(
    type: str, # users, jobs
    start_date: Optional[datetime] = None, 
    end_date: Optional[datetime] = None, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_admin_user)
):
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()

    output = io.StringIO()
    writer = csv.writer(output)

    if type == "users":
        writer.writerow(["ID", "Email", "Full Name", "Credits", "Joined At"])
        users = db.query(User).filter(User.created_at >= start_date, User.created_at <= end_date).all()
        for u in users:
            writer.writerow([u.id, u.email, u.full_name, u.credits, u.created_at])
    
    elif type == "jobs":
        writer.writerow(["ID", "User Email", "Status", "Created At", "Completed At", "Execution Time (s)", "Type"])
        jobs = db.query(Job, User.email).outerjoin(User, Job.user_id == User.id)\
            .filter(Job.created_at >= start_date, Job.created_at <= end_date)\
            .order_by(Job.created_at.desc()).all()
        for j, email in jobs:
            writer.writerow([j.id, email or "unknown", j.status, j.created_at, j.completed_at, j.execution_time, j.photo_type])

    elif type == "credit_ledger":
        writer.writerow(["Date", "User Email", "Action", "Amount", "Balance After", "Actor", "Job ID", "Note"])
        rows = db.query(CreditLedger, User.email).outerjoin(User, CreditLedger.user_id == User.id)\
            .filter(CreditLedger.created_at >= start_date, CreditLedger.created_at <= end_date)\
            .order_by(CreditLedger.created_at.desc()).all()
        for e, email in rows:
            writer.writerow([e.created_at, email or "unknown", e.action, e.amount, e.balance_after, e.actor, e.job_id, e.note])

    else:
        raise HTTPException(status_code=400, detail="Invalid export type")

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename={type}_report.csv"}
    )

# --- SETTINGS ENDPOINTS ---

class SettingUpdate(BaseModel):
    value: str

@router.get("/settings")
def get_settings(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    settings = db.query(SystemSetting).all()
    # Normalize heavily used settings if missing
    settings_dict = {s.key: s.value for s in settings}
    if "new_user_credits" not in settings_dict:
        # Create default if query fails or doesn't exist
        pass 
    return settings

@router.put("/settings/{key}")
def update_setting(key: str, update: SettingUpdate, db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        setting = SystemSetting(key=key, value=update.value)
        db.add(setting)
    else:
        setting.value = update.value

    # Keep daily_topup incentive plan in sync with the threshold setting
    if key == "daily_credit_threshold" and update.value.isdigit():
        plan = db.query(IncentivePlan).filter(IncentivePlan.name == "daily_topup").first()
        if plan:
            plan.max_balance_cap = int(update.value)

    db.commit()
    return {"message": "Setting updated", "key": key, "value": update.value}


# --- PAYMENTS ENDPOINTS ---

@router.get("/payments")
def list_payments(db: Session = Depends(get_db), admin: User = Depends(get_admin_user)):
    payments = (
        db.query(Payment, User.email)
        .outerjoin(User, Payment.user_id == User.id)
        .order_by(Payment.created_at.desc())
        .all()
    )
    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "user_email": email,
            "package_key": p.package_key,
            "credits_amount": p.credits_amount,
            "price_myr_cents": p.price_myr_cents,
            "currency": getattr(p, "currency", "myr") or "myr",
            "price_cents": getattr(p, "price_cents", None) or p.price_myr_cents,
            "status": p.status,
            "credits_delivered": p.credits_delivered,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
        }
        for p, email in payments
    ]


# --- CREDIT LEDGER ENDPOINTS ---

@router.get("/users/{user_id}/credit-history")
def get_user_credit_history(
    user_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    entries = (
        db.query(CreditLedger)
        .filter(CreditLedger.user_id == user_id)
        .order_by(CreditLedger.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": e.id,
            "action": e.action,
            "amount": e.amount,
            "balance_after": e.balance_after,
            "actor": e.actor,
            "job_id": e.job_id,
            "payment_id": e.payment_id,
            "note": e.note,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in entries
    ]


@router.get("/credit-ledger")
def list_credit_ledger(
    limit: int = 50,
    offset: int = 0,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Global credit ledger — all credit transactions across all users."""
    query = db.query(CreditLedger, User.email).outerjoin(User, CreditLedger.user_id == User.id)

    if user_id:
        query = query.filter(CreditLedger.user_id == user_id)
    if user_email:
        query = query.filter(User.email.ilike(f"%{user_email}%"))
    if action:
        query = query.filter(CreditLedger.action == action)
    if start_date:
        query = query.filter(CreditLedger.created_at >= start_date)
    if end_date:
        query = query.filter(CreditLedger.created_at <= end_date)

    total = query.count()

    # Sorting — whitelist columns to prevent injection
    allowed_sort = {"created_at", "amount", "balance_after", "action"}
    col = getattr(CreditLedger, sort_by if sort_by in allowed_sort else "created_at")
    order = col.asc() if sort_order == "asc" else col.desc()
    entries = query.order_by(order).offset(offset).limit(limit).all()

    return {
        "total": total,
        "entries": [
            {
                "id": e.id,
                "user_id": e.user_id,
                "user_email": email or "unknown",
                "action": e.action,
                "amount": e.amount,
                "balance_after": e.balance_after,
                "actor": e.actor,
                "job_id": e.job_id,
                "payment_id": e.payment_id,
                "note": e.note,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e, email in entries
        ],
    }


# --- STORAGE MANAGEMENT ENDPOINTS ---

UPLOAD_DIR = "uploads"


def _dir_size_bytes(path: str) -> int:
    total = 0
    for dirpath, _dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total


@router.get("/storage")
def get_storage_info(
    older_than_days: int = 30,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Return storage usage summary and list of jobs older than the threshold."""
    total_size = _dir_size_bytes(UPLOAD_DIR) if os.path.isdir(UPLOAD_DIR) else 0
    total_jobs = db.query(Job).count()

    cutoff = datetime.utcnow() - timedelta(days=older_than_days)
    old_jobs = (
        db.query(Job)
        .filter(Job.created_at < cutoff, Job.status.in_(["completed", "failed"]))
        .all()
    )

    old_job_details = []
    old_total_size = 0
    for j in old_jobs:
        job_dir = os.path.join(UPLOAD_DIR, j.id)
        size = _dir_size_bytes(job_dir) if os.path.isdir(job_dir) else 0
        old_total_size += size
        old_job_details.append({
            "id": j.id,
            "status": j.status,
            "created_at": j.created_at.isoformat() if j.created_at else None,
            "size_bytes": size,
            "file_count": len(j.files) if j.files else 0,
        })

    return {
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 1),
        "total_jobs": total_jobs,
        "older_than_days": older_than_days,
        "old_jobs_count": len(old_job_details),
        "old_jobs_size_bytes": old_total_size,
        "old_jobs_size_mb": round(old_total_size / (1024 * 1024), 1),
        "old_jobs": old_job_details,
    }


@router.post("/cleanup")
def cleanup_old_jobs(
    older_than_days: int = 30,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Delete files and DB records for completed/failed jobs older than the threshold."""
    cutoff = datetime.utcnow() - timedelta(days=older_than_days)
    old_jobs = (
        db.query(Job)
        .filter(Job.created_at < cutoff, Job.status.in_(["completed", "failed"]))
        .all()
    )

    deleted_count = 0
    freed_bytes = 0
    for j in old_jobs:
        job_dir = os.path.join(UPLOAD_DIR, j.id)
        if os.path.isdir(job_dir):
            freed_bytes += _dir_size_bytes(job_dir)
            shutil.rmtree(job_dir)
        db.delete(j)
        deleted_count += 1

    db.commit()
    logger.info(f"Storage cleanup: deleted {deleted_count} jobs, freed {freed_bytes} bytes (older than {older_than_days} days)")

    return {
        "deleted_jobs": deleted_count,
        "freed_bytes": freed_bytes,
        "freed_mb": round(freed_bytes / (1024 * 1024), 1),
    }


@router.get("/jobs")
def list_all_jobs(
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Job history ledger — returns all jobs with user email, file counts, and pruned status."""
    query = db.query(Job, User.email).outerjoin(User, Job.user_id == User.id)
    if status:
        query = query.filter(Job.status == status)
    if start_date:
        query = query.filter(Job.created_at >= start_date)
    if end_date:
        query = query.filter(Job.created_at <= end_date)
    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for job, user_email in jobs:
        files = job.files or []
        repaired = [f for f in (job.ai_repaired_files or []) if f]
        remastered = [f for f in (job.ai_remastered_files or []) if f]
        job_dir = os.path.join(UPLOAD_DIR, job.id)
        result.append({
            "id": job.id,
            "user_email": user_email or "unknown",
            "status": job.status,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "file_count": len(files),
            "repair_count": len(repaired),
            "remaster_count": len(remastered),
            "files_on_disk": os.path.isdir(job_dir),
        })
    return {"total": total, "jobs": result}
