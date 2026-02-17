from sqlalchemy import Column, String, Text
from ..database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=True) # Stored as string, cast as needed
    description = Column(String, nullable=True)
