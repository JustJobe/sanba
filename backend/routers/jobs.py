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
from .auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=JobSchema)
async def upload_files(
    files: List[UploadFile] = File(...), 
    photo_type: str = Form("color"),
    db: Session = Depends(get_db),
    current_user: user.User = Depends(get_current_user)
):
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
        try:
            for file_path in job.files:
                file_dir, filename = os.path.split(file_path)
                job_root = os.path.dirname(file_dir)
                processed_dir = os.path.join(job_root, "processed")
                
                output_name = f"{os.path.splitext(filename)[0]}_{operation}.jpg"
                output_path = os.path.join(processed_dir, output_name)
                
                # Use job's photo_type preference if available, default to color
                p_type = getattr(job, "photo_type", "color")
                
                # Call sync version directly since we are already in a background thread
                restoration._process_sync(file_path, output_path, operation, photo_type=p_type)
                processed_files.append(output_path)
                
            job.status = "completed"
            job.processed_files = processed_files
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
        for file_path in job.processed_files:
            if os.path.exists(file_path):
                file_name = os.path.basename(file_path)
                zip_file.write(file_path, file_name)
            else:
                logger.warning(f"File not found for zip: {file_path}")
    
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename=job_{job_id}_restored.zip"}
    )
