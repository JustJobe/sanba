from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List
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
from ..database import get_db
from ..services import restoration
from ..services import ai_repair as ai_repair_service
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILES_PER_BATCH = 50

@router.post("/upload", response_model=JobSchema)
async def upload_files(
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

from fastapi import BackgroundTasks
from ..database import SessionLocal

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
async def process_job(
    job_id: str, 
    background_tasks: BackgroundTasks,
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
    cost = len(job.files)
    if current_user.credits < cost:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    # Update Status
    job.status = "processing"
    # Deduct credits
    current_user.credits -= cost
    db.commit()
    db.refresh(job)
    
    # Offload to background task
    background_tasks.add_task(process_job_background, job.id, operation, current_user.id)
    
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
    
    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=job_{job_id}_restored.zip"}
    )


AI_REPAIR_COST = 3


@router.post("/{job_id}/ai_repair/{file_index}", response_model=JobSchema)
async def ai_repair_image(
    job_id: str,
    file_index: int,
    background_tasks: BackgroundTasks,
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

    if current_user.credits < AI_REPAIR_COST:
        raise HTTPException(status_code=402, detail="Insufficient credits")

    current_user.credits -= AI_REPAIR_COST

    # Mark as pending immediately so the UI can show spinner on next poll
    while len(status_list) <= file_index:
        status_list.append(None)
    status_list[file_index] = "pending"
    job.ai_repair_status = status_list
    db.commit()
    db.refresh(job)

    background_tasks.add_task(ai_repair_background, job_id, file_index, current_user.id)
    return job


def ai_repair_background(job_id: str, file_index: int, user_id: str):
    db: Session = SessionLocal()
    try:
        job = db.query(sql_job.Job).filter(sql_job.Job.id == job_id, sql_job.Job.user_id == user_id).first()
        if not job:
            logger.error(f"AI repair: job {job_id} not found")
            return

        input_path = job.processed_files[file_index]
        stem, ext = os.path.splitext(os.path.basename(input_path))
        output_path = os.path.join(os.path.dirname(input_path), f"{stem}_ai{ext}")

        ai_repair_service.repair_image_sync(input_path, output_path)

        try:
            restoration.generate_preview(output_path)
        except Exception as prev_err:
            logger.warning(f"AI repair preview generation failed: {prev_err}")

        # Store result and clear pending status
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

        db.commit()
        logger.info(f"AI repair complete: job {job_id} idx {file_index} → {output_path}")

    except Exception as e:
        logger.error(f"AI repair failed job {job_id} idx {file_index}: {e}")
        # Mark failed so the UI re-enables the Retry button
        try:
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
                u.credits += AI_REPAIR_COST
                db.commit()
                logger.info(f"Refunded {AI_REPAIR_COST} credits to user {user_id}")
        except Exception as refund_err:
            logger.error(f"Refund failed: {refund_err}")
    finally:
        db.close()
