from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from enum import Enum
from datetime import datetime

class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class JobSource(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"

class JobBase(BaseModel):
    source: JobSource = JobSource.ONLINE
    provider: Optional[str] = None # e.g., "gdrive", "sharepoint"

class JobCreate(JobBase):
    pass

class Job(JobBase):
    id: UUID
    status: JobStatus = JobStatus.QUEUED
    created_at: datetime
    files: List[str] = []
    processed_files: List[str] = []
    file_types: List[str] = []
    ai_repaired_files: List[Optional[str]] = []
    ai_repair_status: List[Optional[str]] = []
    ai_repair_thinking_tokens: List[Optional[int]] = []
    ai_remastered_files: List[Optional[str]] = []
    ai_remaster_status: List[Optional[str]] = []
    ai_remaster_thinking_tokens: List[Optional[int]] = []
    ai_repair_models: List[Optional[str]] = []
    ai_remaster_models: List[Optional[str]] = []

    class Config:
        from_attributes = True
