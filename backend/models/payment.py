from sqlalchemy import Column, String, Integer, DateTime, JSON
from ..database import Base
import datetime
import uuid


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)

    # Stripe references
    stripe_checkout_session_id = Column(String, unique=True, index=True, nullable=False)
    stripe_payment_intent_id = Column(String, unique=True, index=True, nullable=True)

    # Package details (snapshot at time of purchase)
    package_key = Column(String, nullable=False)
    credits_amount = Column(Integer, nullable=False)
    price_myr_cents = Column(Integer, nullable=False)  # RM 9.90 = 990
    currency = Column(String, default="myr", nullable=False)
    price_cents = Column(Integer, nullable=True)  # amount in charged currency's smallest unit

    # Status tracking
    status = Column(String, default="pending", index=True)  # pending | completed | expired | failed
    credits_delivered = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Raw Stripe event data for audit
    stripe_event_data = Column(JSON, nullable=True)
