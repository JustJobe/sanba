from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from typing import List
from slowapi import Limiter
from slowapi.util import get_remote_address
from uuid import uuid4
from datetime import datetime
import shutil
import os
from sqlalchemy.orm import Session

import logging
import zipfile
import io
from fastapi.responses import StreamingResponse

from ..models.job import Job as JobSchema, JobCreate, JobStatus, JobSource
from ..models import sql_job, user
from ..services.credit_ledger import record_credit_change
from ..database import get_db
from ..services import restoration
from ..services import ai_repair as ai_repair_service
from ..services import ai_remaster as ai_remaster_service
from ..services.ai_repair import GeminiContentPolicyError as RepairContentPolicyError
from ..services.ai_remaster import GeminiContentPolicyError as RemasterContentPolicyError
from ..models.system_setting import SystemSetting
from ..models.incentive import IncentivePlan
from .auth import get_current_user


# ---------------------------------------------------------------------------
# Dynamic pricing helpers — read from system_settings, fall back to defaults
# ---------------------------------------------------------------------------

def get_restore_cost(db: Session) -> int:
    s = db.query(SystemSetting).filter_by(key="restore_cost").first()
    return int(s.value) if s and s.value and s.value.isdigit() else 1

def get_ai_repair_cost(db: Session) -> int:
    s = db.query(SystemSetting).filter_by(key="ai_repair_cost").first()
    return int(s.value) if s and s.value and s.value.isdigit() else 4

def get_ai_remaster_costs(db: Session) -> tuple:
    """Returns (full_cost, discounted_cost)."""
    full = db.query(SystemSetting).filter_by(key="ai_remaster_cost_full").first()
    disc = db.query(SystemSetting).filter_by(key="ai_remaster_cost_discounted").first()
    full_cost = int(full.value) if full and full.value and full.value.isdigit() else 4
    disc_cost = int(disc.value) if disc and disc.value and disc.value.isdigit() else 3
    return full_cost, disc_cost

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/jobs", tags=["jobs"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILES_PER_BATCH = 50


@router.get("/pricing")
def get_pricing(db: Session = Depends(get_db)):
    """Public endpoint — returns current credit costs and thresholds."""
    full, discounted = get_ai_remaster_costs(db)
    plan = db.query(IncentivePlan).filter(IncentivePlan.is_active == True).first()
    daily_credit_threshold = plan.max_balance_cap if plan else 3
    return {
        "restore": get_restore_cost(db),
        "ai_repair": get_ai_repair_cost(db),
        "ai_remaster_full": full,
        "ai_remaster_discounted": discounted,
        "daily_credit_threshold": daily_credit_threshold,
    }


@router.post("/upload", response_model=JobSchema)
@limiter.limit("10/minute")
async def upload_files(
    request: Request,
    files: List[UploadFile] = File(...),
    photo_type: str = Form("auto"),
    db: Session = Depends(get_db),
    current_user: user.User = Depends(get_current_user)
):
    if len(files) > MAX_FILES_PER_BATCH:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files. Maximum {MAX_FILES_PER_BATCH} files per batch."
        )

    job_id = str(uuid4())
    job_dir = os.path.join(UPLOAD_DIR, job_id, "original")
    os.makedirs(job_dir, exist_ok=True)

    saved_files = []
    for file in files:
        file_path = os.path.join(job_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_files.append(file_path)

    new_job = sql_job.Job(
        id=job_id,
        status="queued",
        created_at=datetime.utcnow(),
        files=saved_files,
        source="online",
        photo_type=photo_type,
        user_id=current_user.id
    )

    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return new_job

@router.get("/", response_model=List[JobSchema])
def list_jobs(db: Session = Depends(get_db), current_user: user.User = Depends(get_current_user)):
    jobs = db.query(sql_job.Job).filter(sql_job.Job.user_id == current_user.id).all()
    return jobs

@router.get("/{job_id}", response_model=JobSchema)
def get_job(job_id: str, db: Session = Depends(get_db), current_user: user.User = Depends(get_current_user)):
    job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

from ..database import SessionLocal
from ..services.job_queue import submit_opencv, submit_gemini

def process_job_background(job_id: str, operation: str, user_id: str):
    db: Session = SessionLocal()
    try:
        job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == user_id).first()
        if not job:
            logger.error(f"Job {job_id} not found pending processing")
            return

        processed_files = []
        detected_types = []
        try:
            for file_path in job.files:
                file_dir, filename = os.path.split(file_path)
                job_root = os.path.dirname(file_dir)
                processed_dir = os.path.join(job_root, "processed")

                output_name = f"{os.path.splitext(filename)[0]}_{operation}.jpg"
                output_path = os.path.join(processed_dir, output_name)

                # Use job's photo_type preference if available, default to auto
                p_type = getattr(job, "photo_type", "auto")

                # Call sync version directly since we are already in a background thread
                # Returns the actual photo_type used (post auto-detection)
                actual_type = restoration._process_sync(file_path, output_path, operation, photo_type=p_type)

                # Generate downscaled previews for the comparison slider (non-fatal)
                try:
                    restoration.generate_preview(output_path)  # processed preview
                    restoration.generate_preview(file_path)    # original preview
                except Exception as prev_err:
                    logger.warning(f"Preview generation failed for job {job_id}: {prev_err}")

                processed_files.append(output_path)
                detected_types.append(actual_type)

            job.status = "completed"
            job.processed_files = processed_files
            job.file_types = detected_types
            job.completed_at = datetime.utcnow()
            if job.created_at:
                job.execution_time = (job.completed_at - job.created_at).total_seconds()
            db.commit()

        except Exception as e:
            job.status = "failed"
            db.commit()
            logger.error(f"Error processing job {job_id}: {e}")

    finally:
        db.close()


@router.post("/{job_id}/process", response_model=JobSchema)
@limiter.limit("5/minute")
async def process_job(
    request: Request,
    job_id: str,
    operation: str = "denoise",
    db: Session = Depends(get_db),
    current_user: user.User = Depends(get_current_user)
):
    job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.files:
        raise HTTPException(status_code=400, detail="Job has no files to process")

    # Check Credits
    cost = get_restore_cost(db) * len(job.files)
    if current_user.credits < cost:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    # Update Status
    job.status = "processing"
    # Deduct credits
    current_user.credits -= cost
    record_credit_change(
        db=db, user_id=current_user.id, action="restore",
        amount=-cost, balance_after=current_user.credits,
        actor=current_user.id, job_id=job.id,
    )
    db.commit()
    db.refresh(job)

    # Offload to bounded thread pool (rejects with 503 if queue is full)
    submit_opencv(process_job_background, job.id, operation, current_user.id)

    return job

@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str, db: Session = Depends(get_db), current_user: user.User = Depends(get_current_user)):
    job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Delete files from filesystem
    job_dir = os.path.join(UPLOAD_DIR, job_id)
    if os.path.exists(job_dir):
        shutil.rmtree(job_dir)

    db.delete(job)
    db.commit()
    return None

@router.get("/{job_id}/download")
def download_job_zip(job_id: str, db: Session = Depends(get_db), current_user: user.User = Depends(get_current_user)):
    job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == current_user.id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.processed_files:
        raise HTTPException(status_code=400, detail="No processed files to download")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # OpenCV-restored files (renamed clearly in the zip)
        for i, file_path in enumerate(job.processed_files):
            if os.path.exists(file_path):
                original_stem = os.path.splitext(os.path.basename(job.files[i]))[0] \
                    if job.files and i < len(job.files) \
                    else os.path.splitext(os.path.basename(file_path))[0]
                zip_file.write(file_path, f"{original_stem}_restored.jpg")
            else:
                logger.warning(f"File not found for zip: {file_path}")
        # AI-repaired files (if any)
        for i, ai_path in enumerate(job.ai_repaired_files or []):
            if ai_path and os.path.exists(ai_path):
                original_stem = os.path.splitext(os.path.basename(job.files[i]))[0] \
                    if job.files and i < len(job.files) \
                    else os.path.splitext(os.path.basename(ai_path))[0]
                zip_file.write(ai_path, f"{original_stem}_ai_repaired.jpg")
        # AI-remastered files (if any)
        for i, remaster_path in enumerate(job.ai_remastered_files or []):
            if remaster_path and os.path.exists(remaster_path):
                original_stem = os.path.splitext(os.path.basename(job.files[i]))[0] \
                    if job.files and i < len(job.files) \
                    else os.path.splitext(os.path.basename(remaster_path))[0]
                zip_file.write(remaster_path, f"{original_stem}_remastered.jpg")

    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=job_{job_id}_restored.zip"}
    )


@router.post("/{job_id}/ai_repair/{file_index}", response_model=JobSchema)
@limiter.limit("3/minute")
async def ai_repair_image(
    request: Request,
    job_id: str,
    file_index: int,
    db: Session = Depends(get_db),
    current_user: user.User = Depends(get_current_user),
):
    job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == current_user.id).first()
    if not job or job.status != "completed":
        raise HTTPException(status_code=400, detail="Job not found or not completed")
    if not job.processed_files or file_index >= len(job.processed_files):
        raise HTTPException(status_code=400, detail="Invalid file index")

    # Block if already repaired or currently pending
    repaired = list(job.ai_repaired_files or [])
    if file_index < len(repaired) and repaired[file_index]:
        raise HTTPException(status_code=400, detail="Image already AI-repaired")
    status_list = list(job.ai_repair_status or [])
    if file_index < len(status_list) and status_list[file_index] == "pending":
        raise HTTPException(status_code=400, detail="AI repair already in progress")

    repair_cost = get_ai_repair_cost(db)
    if current_user.credits < repair_cost:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    current_user.credits -= repair_cost
    record_credit_change(
        db=db, user_id=current_user.id, action="ai_repair",
        amount=-repair_cost, balance_after=current_user.credits,
        actor=current_user.id, job_id=job.id,
        note=f"file_index={file_index}",
    )

    # Mark as pending immediately so the UI can show spinner on next poll
    while len(status_list) <= file_index:
        status_list.append(None)
    status_list[file_index] = "pending"
    job.ai_repair_status = status_list
    db.commit()
    db.refresh(job)

    submit_gemini(ai_repair_background, job_id, file_index, current_user.id, repair_cost)
    return job


def ai_repair_background(job_id: str, file_index: int, user_id: str, credits_charged: int = 4):
    db: Session = SessionLocal()
    try:
        job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == user_id).first()
        if not job:
            logger.error(f"AI repair: job {job_id} not found")
            return

        input_path = job.processed_files[file_index]
        stem, ext = os.path.splitext(os.path.basename(input_path))
        output_path = os.path.join(os.path.dirname(input_path), f"{stem}_ai{ext}")

        result = ai_repair_service.repair_image_sync(input_path, output_path)
        output_path, thinking_tokens = result.output_path, result.thinking_tokens

        try:
            restoration.generate_preview(output_path)
        except Exception as prev_err:
            logger.warning(f"AI repair preview generation failed: {prev_err}")

        # Re-read from DB to avoid stale-state overwrites when multiple
        # background tasks update different indices of the same job.
        db.refresh(job)

        repaired = list(job.ai_repaired_files or [])
        while len(repaired) <= file_index:
            repaired.append(None)
        repaired[file_index] = output_path
        job.ai_repaired_files = repaired

        status_list = list(job.ai_repair_status or [])
        while len(status_list) <= file_index:
            status_list.append(None)
        status_list[file_index] = None
        job.ai_repair_status = status_list

        tokens_list = list(job.ai_repair_thinking_tokens or [])
        while len(tokens_list) <= file_index:
            tokens_list.append(None)
        tokens_list[file_index] = thinking_tokens
        job.ai_repair_thinking_tokens = tokens_list

        durations_list = list(job.ai_repair_durations or [])
        while len(durations_list) <= file_index:
            durations_list.append(None)
        durations_list[file_index] = result.duration_secs
        job.ai_repair_durations = durations_list

        meta_list = list(job.ai_repair_input_meta or [])
        while len(meta_list) <= file_index:
            meta_list.append(None)
        meta_list[file_index] = {"w": result.input_width, "h": result.input_height, "bytes": result.input_bytes}
        job.ai_repair_input_meta = meta_list

        db.commit()
        logger.info(f"AI repair complete: job {job_id} idx {file_index} → {output_path} ({result.duration_secs}s, {result.input_width}×{result.input_height}px)")

    except RepairContentPolicyError as e:
        logger.warning(f"AI repair content policy block job {job_id} idx {file_index}: {e}")
        try:
            db.refresh(job)
            status_list = list(job.ai_repair_status or [])
            while len(status_list) <= file_index:
                status_list.append(None)
            status_list[file_index] = "content_policy"
            job.ai_repair_status = status_list
            db.commit()
        except Exception as se:
            logger.error(f"Could not persist content_policy status: {se}")
        # Always refund on content policy block
        try:
            u = db.query(user.User).filter(user.User.id == user_id).first()
            if u:
                u.credits += credits_charged
                record_credit_change(
                    db=db, user_id=user_id, action="refund_repair",
                    amount=+credits_charged, balance_after=u.credits,
                    actor="system", job_id=job_id,
                    note=f"content_policy, file_index={file_index}",
                )
                db.commit()
                logger.info(f"Refunded {credits_charged} credits (content policy) to user {user_id}")
        except Exception as refund_err:
            logger.error(f"Refund failed: {refund_err}")
    except Exception as e:
        logger.error(f"AI repair failed job {job_id} idx {file_index}: {e}")
        # Mark failed so the UI re-enables the Retry button
        try:
            db.refresh(job)
            status_list = list(job.ai_repair_status or [])
            while len(status_list) <= file_index:
                status_list.append(None)
            status_list[file_index] = "failed"
            job.ai_repair_status = status_list
            db.commit()
        except Exception as se:
            logger.error(f"Could not persist failed status: {se}")
        # Auto-refund
        try:
            u = db.query(user.User).filter(user.User.id == user_id).first()
            if u:
                u.credits += credits_charged
                record_credit_change(
                    db=db, user_id=user_id, action="refund_repair",
                    amount=+credits_charged, balance_after=u.credits,
                    actor="system", job_id=job_id,
                    note=f"job_error, file_index={file_index}",
                )
                db.commit()
                logger.info(f"Refunded {credits_charged} credits to user {user_id}")
        except Exception as refund_err:
            logger.error(f"Refund failed: {refund_err}")
    finally:
        db.close()


@router.post("/{job_id}/ai_remaster/{file_index}", response_model=JobSchema)
@limiter.limit("3/minute")
async def ai_remaster_image(
    request: Request,
    job_id: str,
    file_index: int,
    db: Session = Depends(get_db),
    current_user: user.User = Depends(get_current_user),
):
    job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == current_user.id).first()
    if not job or job.status != "completed":
        raise HTTPException(status_code=400, detail="Job not found or not completed")
    if not job.processed_files or file_index >= len(job.processed_files):
        raise HTTPException(status_code=400, detail="Invalid file index")

    # Block if already remastered or currently pending
    remastered = list(job.ai_remastered_files or [])
    if file_index < len(remastered) and remastered[file_index]:
        raise HTTPException(status_code=400, detail="Image already AI-remastered")
    status_list = list(job.ai_remaster_status or [])
    if file_index < len(status_list) and status_list[file_index] == "pending":
        raise HTTPException(status_code=400, detail="AI remaster already in progress")

    # Block if repair is still running — must complete first
    repair_status_list = list(job.ai_repair_status or [])
    if file_index < len(repair_status_list) and repair_status_list[file_index] == "pending":
        raise HTTPException(status_code=400, detail="AI repair still in progress — wait for it to complete first")

    # Discounted cost if repair was already completed for this image
    remaster_full, remaster_discounted = get_ai_remaster_costs(db)
    repaired_files = list(job.ai_repaired_files or [])
    repair_done = file_index < len(repaired_files) and bool(repaired_files[file_index])
    remaster_cost = remaster_discounted if repair_done else remaster_full

    if current_user.credits < remaster_cost:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    current_user.credits -= remaster_cost
    record_credit_change(
        db=db, user_id=current_user.id, action="ai_remaster",
        amount=-remaster_cost, balance_after=current_user.credits,
        actor=current_user.id, job_id=job.id,
        note=f"file_index={file_index}, cost={remaster_cost}",
    )

    # Mark as pending immediately so the UI can show spinner on next poll
    while len(status_list) <= file_index:
        status_list.append(None)
    status_list[file_index] = "pending"
    job.ai_remaster_status = status_list
    db.commit()
    db.refresh(job)

    submit_gemini(ai_remaster_background, job_id, file_index, current_user.id, remaster_cost)
    return job


def ai_remaster_background(job_id: str, file_index: int, user_id: str, credits_charged: int = 4):
    db: Session = SessionLocal()
    try:
        job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == user_id).first()
        if not job:
            logger.error(f"AI remaster: job {job_id} not found")
            return

        # Chained input: use repaired image if available, otherwise restored image
        repaired_files = job.ai_repaired_files or []
        if file_index < len(repaired_files) and repaired_files[file_index]:
            input_path = repaired_files[file_index]
            logger.info(f"AI remaster: using repaired image as input for job {job_id} idx {file_index}")
        else:
            input_path = job.processed_files[file_index]
            logger.info(f"AI remaster: using restored image as input for job {job_id} idx {file_index}")

        stem, ext = os.path.splitext(os.path.basename(input_path))
        # Strip any prior _ai suffix so output name stays clean
        clean_stem = stem.replace("_ai", "")
        output_dir = os.path.dirname(job.processed_files[file_index])
        output_path = os.path.join(output_dir, f"{clean_stem}_remaster{ext}")

        result = ai_remaster_service.remaster_image_sync(input_path, output_path)
        output_path, thinking_tokens = result.output_path, result.thinking_tokens

        try:
            restoration.generate_preview(output_path)
        except Exception as prev_err:
            logger.warning(f"AI remaster preview generation failed: {prev_err}")

        # Re-read from DB to avoid stale-state overwrites when multiple
        # background tasks update different indices of the same job.
        db.refresh(job)

        remastered = list(job.ai_remastered_files or [])
        while len(remastered) <= file_index:
            remastered.append(None)
        remastered[file_index] = output_path
        job.ai_remastered_files = remastered

        status_list = list(job.ai_remaster_status or [])
        while len(status_list) <= file_index:
            status_list.append(None)
        status_list[file_index] = None
        job.ai_remaster_status = status_list

        tokens_list = list(job.ai_remaster_thinking_tokens or [])
        while len(tokens_list) <= file_index:
            tokens_list.append(None)
        tokens_list[file_index] = thinking_tokens
        job.ai_remaster_thinking_tokens = tokens_list

        durations_list = list(job.ai_remaster_durations or [])
        while len(durations_list) <= file_index:
            durations_list.append(None)
        durations_list[file_index] = result.duration_secs
        job.ai_remaster_durations = durations_list

        meta_list = list(job.ai_remaster_input_meta or [])
        while len(meta_list) <= file_index:
            meta_list.append(None)
        meta_list[file_index] = {"w": result.input_width, "h": result.input_height, "bytes": result.input_bytes}
        job.ai_remaster_input_meta = meta_list

        db.commit()
        logger.info(f"AI remaster complete: job {job_id} idx {file_index} → {output_path} ({result.duration_secs}s, {result.input_width}×{result.input_height}px)")

    except RemasterContentPolicyError as e:
        logger.warning(f"AI remaster content policy block job {job_id} idx {file_index}: {e}")
        try:
            db.refresh(job)
            status_list = list(job.ai_remaster_status or [])
            while len(status_list) <= file_index:
                status_list.append(None)
            status_list[file_index] = "content_policy"
            job.ai_remaster_status = status_list
            db.commit()
        except Exception as se:
            logger.error(f"Could not persist content_policy status: {se}")
        # Always refund on content policy block
        try:
            u = db.query(user.User).filter(user.User.id == user_id).first()
            if u:
                u.credits += credits_charged
                record_credit_change(
                    db=db, user_id=user_id, action="refund_remaster",
                    amount=+credits_charged, balance_after=u.credits,
                    actor="system", job_id=job_id,
                    note=f"content_policy, file_index={file_index}",
                )
                db.commit()
                logger.info(f"Refunded {credits_charged} credits (content policy) to user {user_id}")
        except Exception as refund_err:
            logger.error(f"Refund failed: {refund_err}")
    except Exception as e:
        logger.error(f"AI remaster failed job {job_id} idx {file_index}: {e}")
        # Mark failed so the UI re-enables the Retry button
        try:
            db.refresh(job)
            status_list = list(job.ai_remaster_status or [])
            while len(status_list) <= file_index:
                status_list.append(None)
            status_list[file_index] = "failed"
            job.ai_remaster_status = status_list
            db.commit()
        except Exception as se:
            logger.error(f"Could not persist failed status: {se}")
        # Auto-refund the exact amount charged
        try:
            u = db.query(user.User).filter(user.User.id == user_id).first()
            if u:
                u.credits += credits_charged
                record_credit_change(
                    db=db, user_id=user_id, action="refund_remaster",
                    amount=+credits_charged, balance_after=u.credits,
                    actor="system", job_id=job_id,
                    note=f"job_error, file_index={file_index}",
                )
                db.commit()
                logger.info(f"Refunded {credits_charged} credits to user {user_id}")
        except Exception as refund_err:
            logger.error(f"Refund failed: {refund_err}")
    finally:
        db.close()
