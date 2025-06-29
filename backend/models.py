from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class Scenario(Base):
    """Represents a conversation scenario a learner can practice with."""

    __tablename__ = "scenarios"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    learning_path = Column(String, nullable=False)
    difficulty = Column(String, nullable=False)
    goal = Column(Text, nullable=False)
    persona_prompt = Column(Text, nullable=False)
    opening_line = Column(Text, nullable=False)
    voice_id = Column(String)

    # Relationships
    skills = relationship(
        "ScenarioSkill",
        back_populates="scenario",
        cascade="all, delete-orphan",
    )
    evaluations = relationship(
        "Evaluation",
        back_populates="scenario",
        cascade="all, delete-orphan",
    )


class ScenarioSkill(Base):
    """Link table connecting scenarios with the skills they assess."""

    __tablename__ = "scenario_skills"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(String, ForeignKey("scenarios.id"), nullable=False)
    skill_name = Column(String, nullable=False)

    # Relationships
    scenario = relationship("Scenario", back_populates="skills")


class Evaluation(Base):
    """Stores a learner's attempt at a scenario and the AI's analysis."""

    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    scenario_id = Column(String, ForeignKey("scenarios.id"), nullable=False)
    full_transcript = Column(Text, nullable=False)

    # Relationships
    scores = relationship(
        "EvaluationScore",
        back_populates="evaluation",
        cascade="all, delete-orphan",
    )
    scenario = relationship("Scenario", back_populates="evaluations")


class EvaluationScore(Base):
    """Individual skill scores for an evaluation."""

    __tablename__ = "evaluation_scores"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(Integer, ForeignKey("evaluations.id"), nullable=False)
    skill_name = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    justification = Column(Text, nullable=False)

    # Relationships
    evaluation = relationship("Evaluation", back_populates="scores") 