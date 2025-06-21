from sqlalchemy import Column, Integer, String, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
from database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    scenario_id = Column(String, nullable=True)
    full_transcript = Column(Text)
    empathy_score = Column(Integer)
    investigative_questioning_score = Column(Integer)
    collaborative_problem_solving_score = Column(Integer)
    ai_justifications = Column(JSONB) 