from sqlalchemy import Column, String, Integer, DateTime, JSON
from ..database import Base
import datetime
import uuid

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=True) 
    action = Column(String, index=True) # e.g. "login", "purchase_credits", "export_report"
    details = Column(JSON, default={})
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
