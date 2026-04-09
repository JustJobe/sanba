from sqlalchemy import Column, String, Integer, DateTime, Index
from ..database import Base
import datetime
import secrets


def _gen_share_id() -> str:
    return secrets.token_urlsafe(6)  # ~8 chars, URL-safe


class ShareLink(Base):
    __tablename__ = "share_links"

    id = Column(String, primary_key=True, default=_gen_share_id)
    job_id = Column(String, nullable=False, index=True)
    file_index = Column(Integer, nullable=False)
    comparison_type = Column(String, nullable=False)  # "restored" | "repaired" | "remastered"
    before_label = Column(String, nullable=False, default="Original")
    after_label = Column(String, nullable=False)
    model_badge = Column(String, nullable=True)
    user_id = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index("ix_share_dedup", "job_id", "file_index", "comparison_type", unique=True),
    )
