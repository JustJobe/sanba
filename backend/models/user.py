from sqlalchemy import Column, String, Integer, DateTime
from ..database import Base
import datetime
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    credits = Column(Integer, default=10)
    last_credit_replenishment = Column(DateTime, default=datetime.datetime.utcnow)
    
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_admin = Column(Integer, default=0) # SQLite boolean 0/1
