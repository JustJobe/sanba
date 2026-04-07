from sqlalchemy import Column, String, Integer, DateTime, Index
from ..database import Base
import datetime
import uuid


class CreditLedger(Base):
    __tablename__ = "credit_ledger"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)

    # What happened
    # One of: daily_claim, admin_grant, admin_deduct, purchase,
    #         refund_repair, refund_remaster, signup_bonus,
    #         restore, ai_repair, ai_remaster
    action = Column(String, nullable=False, index=True)

    amount = Column(Integer, nullable=False)        # Signed: +10 or -4
    balance_after = Column(Integer, nullable=False)  # Snapshot after this change

    # Who caused it: user_id, admin user_id, or "system"
    actor = Column(String, nullable=False)

    # Optional references for traceability
    job_id = Column(String, nullable=True)
    payment_id = Column(String, nullable=True)
    note = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    __table_args__ = (
        Index("ix_credit_ledger_user_created", "user_id", "created_at"),
    )
