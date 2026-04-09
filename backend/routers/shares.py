from fastapi import APIRouter, HTTPException, Depends, Request, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Optional
import logging
import os

from ..database import get_db
from ..models.share import ShareLink
from ..models import sql_job
from ..services.model_tiers import MODEL_TIERS
from .auth import get_current_user
from ..models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

MODEL_SHORT = {"pro": "30pp", "flash": "31fp"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_file_url(path: str) -> str:
    """Convert on-disk path like 'uploads/abc/processed/x.jpg' → '/files/abc/processed/x.jpg'"""
    return "/files/" + path.replace("\\", "/").removeprefix("uploads/")


def _to_preview_url(url: str) -> str:
    """Insert '_preview' before the extension: '/files/a/b.jpg' → '/files/a/b_preview.jpg'"""
    dot = url.rfind(".")
    if dot == -1:
        return url
    return url[:dot] + "_preview" + url[dot:]


def _get_model_display(tier_id: Optional[str]) -> str:
    if not tier_id:
        return "Gemini 3 Pro"
    t = MODEL_TIERS.get(tier_id)
    return t["display_name"] if t else tier_id


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CreateShareRequest(BaseModel):
    job_id: str
    file_index: int
    comparison_type: str  # "restored" | "repaired" | "remastered"


class ShareResponse(BaseModel):
    id: str
    url: str


class ShareDataResponse(BaseModel):
    share_id: str
    before: str
    after: str
    before_preview: str
    after_preview: str
    before_label: str
    after_label: str
    comparison_type: str
    model_badge: Optional[str] = None
    og_image: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=ShareResponse)
@limiter.limit("20/minute")
async def create_share(
    request: Request,
    body: CreateShareRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a shareable link for a before/after comparison."""

    if body.comparison_type not in ("restored", "repaired", "remastered"):
        raise HTTPException(status_code=400, detail="Invalid comparison_type")

    job = db.query(sql_job.Job).filter(
        sql_job.Job.id == body.job_id,
        sql_job.Job.user_id == current_user.id,
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Job is not completed")

    idx = body.file_index

    # Validate the output file exists for the requested comparison type
    if body.comparison_type == "restored":
        if not job.processed_files or idx >= len(job.processed_files) or not job.processed_files[idx]:
            raise HTTPException(status_code=400, detail="No restored file at that index")
    elif body.comparison_type == "repaired":
        if not job.ai_repaired_files or idx >= len(job.ai_repaired_files) or not job.ai_repaired_files[idx]:
            raise HTTPException(status_code=400, detail="No repaired file at that index")
    elif body.comparison_type == "remastered":
        if not job.ai_remastered_files or idx >= len(job.ai_remastered_files) or not job.ai_remastered_files[idx]:
            raise HTTPException(status_code=400, detail="No remastered file at that index")

    # Deduplicate — return existing share if one already exists
    existing = db.query(ShareLink).filter(
        ShareLink.job_id == body.job_id,
        ShareLink.file_index == idx,
        ShareLink.comparison_type == body.comparison_type,
    ).first()
    if existing:
        return ShareResponse(id=existing.id, url=f"https://sanba.my/share/{existing.id}")

    # Build labels
    before_label = "Original"
    model_badge = None

    if body.comparison_type == "restored":
        after_label = "Restored\n(Sanba Restore)"
    elif body.comparison_type == "repaired":
        tier = (job.ai_repair_models or [None])[idx] if job.ai_repair_models and idx < len(job.ai_repair_models) else None
        after_label = f"Repaired\n({_get_model_display(tier)})"
        model_badge = MODEL_SHORT.get(tier, tier) if tier else None
    else:  # remastered
        tier = (job.ai_remaster_models or [None])[idx] if job.ai_remaster_models and idx < len(job.ai_remaster_models) else None
        after_label = f"Remastered\n({_get_model_display(tier)})"
        model_badge = MODEL_SHORT.get(tier, tier) if tier else None

    share = ShareLink(
        job_id=body.job_id,
        file_index=idx,
        comparison_type=body.comparison_type,
        before_label=before_label,
        after_label=after_label,
        model_badge=model_badge,
        user_id=current_user.id,
    )
    db.add(share)
    db.commit()
    db.refresh(share)

    logger.info(f"Share created: {share.id} for job {body.job_id} idx {idx} type={body.comparison_type}")
    return ShareResponse(id=share.id, url=f"https://sanba.my/share/{share.id}")


@router.get("/{share_id}", response_model=ShareDataResponse)
async def get_share(share_id: str, db: Session = Depends(get_db)):
    """Public endpoint — fetch share data for rendering the comparison page."""

    share = db.query(ShareLink).filter(ShareLink.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")

    job = db.query(sql_job.Job).filter(sql_job.Job.id == share.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Shared photo is no longer available")

    idx = share.file_index

    # Original image
    if not job.files or idx >= len(job.files):
        raise HTTPException(status_code=404, detail="Shared photo is no longer available")
    before_url = _to_file_url(job.files[idx])

    # Output image based on comparison type
    if share.comparison_type == "restored":
        path = (job.processed_files or [None])[idx] if job.processed_files and idx < len(job.processed_files) else None
    elif share.comparison_type == "repaired":
        path = (job.ai_repaired_files or [None])[idx] if job.ai_repaired_files and idx < len(job.ai_repaired_files) else None
    elif share.comparison_type == "remastered":
        path = (job.ai_remastered_files or [None])[idx] if job.ai_remastered_files and idx < len(job.ai_remastered_files) else None
    else:
        path = None

    if not path:
        raise HTTPException(status_code=404, detail="Shared photo is no longer available")

    after_url = _to_file_url(path)

    return ShareDataResponse(
        share_id=share.id,
        before=before_url,
        after=after_url,
        before_preview=_to_preview_url(before_url),
        after_preview=_to_preview_url(after_url),
        before_label=share.before_label,
        after_label=share.after_label,
        comparison_type=share.comparison_type,
        model_badge=share.model_badge,
        og_image=after_url,
    )
