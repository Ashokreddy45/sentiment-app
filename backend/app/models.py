# backend/app/models.py
from sqlmodel import SQLModel, Field, create_engine
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from database import Base
from typing import Optional
from datetime import datetime

DATABASE_URL = "sqlite:///./reviews.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    text: str
    source: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sentiment: Optional[str] = None
    confidence: Optional[float] = None
    processed: bool = Field(default=False)

class Aspect(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    review_id: int
    aspect: str
    category: Optional[str] = None
    sentiment: Optional[str] = None
    confidence: Optional[float] = None
class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    review_text = Column(Text, nullable=False)
    sentiment = Column(String(20))
    recommendation = Column(String(20))
    analysis_date = Column(DateTime, server_default=func.now())

def init_db():
    SQLModel.metadata.create_all(engine)
