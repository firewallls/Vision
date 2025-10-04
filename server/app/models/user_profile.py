# models/user_profile.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
from enum import Enum


class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class UserSkill(BaseModel):
    language: str
    level: SkillLevel
    confidence_score: float = Field(ge=0.0, le=1.0)
    projects_count: int = 0
    lines_of_code: int = 0


class UserProfile(BaseModel):
    github_id: str
    username: str
    skills: List[UserSkill] = []
    total_repositories: int = 0
    total_stars_earned: int = 0
    total_forks: int = 0
    followers_count: int = 0
    following_count: int = 0
    pr_raised: int = 0
    pr_merged: int = 0
    contribution_streak: int = 0
    account_age_days: int = 0
    overall_score: float = Field(ge=0.0, le=1.0, default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True
