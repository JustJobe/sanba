from sqlalchemy import Column, String, Integer, DateTime, Boolean
from ..database import Base
import datetime
import uuid

class IncentivePlan(Base):
    __tablename__ = "incentive_plans"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True)
    reward_amount = Column(Integer, default=1)
    cooldown_hours = Column(Integer, default=24)
    max_balance_cap = Column(Integer, default=5)
    requires_profile_complete = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
