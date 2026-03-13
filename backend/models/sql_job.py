from sqlalchemy import Column, String, DateTime, JSON, Integer
from ..database import Base
import datetime
import uuid

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    status = Column(String, default="queued")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    execution_time = Column(Integer, nullable=True) # Time in seconds


    files = Column(JSON, default=[]) # Store list of file paths
    processed_files = Column(JSON, default=[]) # Store list of processed file paths
    file_types = Column(JSON, default=[]) # Per-file detected types: ["color", "bw", ...]
    source = Column(String, default="online")
    photo_type = Column(String, default="color") # Job-level type: 'color', 'bw', or 'auto'
    provider = Column(String, nullable=True)
    user_id = Column(String, nullable=True) # ForeignKey would be better but keeping it loose for now to avoid circular imports if not careful, though we should probably add index=True
    ai_repaired_files = Column(JSON, default=[])  # Indexed same as processed_files
    ai_repair_status  = Column(JSON, default=[])  # Per-index: "pending" | "failed" | null
