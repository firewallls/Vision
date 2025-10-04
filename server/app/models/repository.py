# models/repository.py
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class RepositoryHealth(BaseModel):
    stars: int = 0
    forks: int = 0
    open_issues: int = 0
    closed_issues: int = 0
    watchers: int = 0
    contributors_count: int = 0
    commits_last_month: int = 0
    commits_last_year: int = 0
    last_commit_date: Optional[datetime] = None
    creation_date: Optional[datetime] = None


class RepositoryComplexity(BaseModel):
    lines_of_code: int = 0
    file_count: int = 0
    directory_depth: int = 0
    dependency_count: int = 0
    readme_length: int = 0
    has_contributing_guide: bool = False
    has_code_of_conduct: bool = False
    has_license: bool = False


class Repository(BaseModel):
    github_id: str
    name: str
    full_name: str
    description: Optional[str] = None
    primary_language: Optional[str] = None
    languages: Dict[str, int] = {}  # language: bytes
    topics: List[str] = []
    health: RepositoryHealth
    complexity: RepositoryComplexity
    good_first_issues: int = 0
    help_wanted_issues: int = 0
    difficulty_score: float = Field(ge=0.0, le=1.0, default=0.5)
    quality_score: float = Field(ge=0.0, le=1.0, default=0.5)
    beginner_friendly_score: float = Field(ge=0.0, le=1.0, default=0.5)
    overall_score: float = Field(ge=0.0, le=1.0, default=0.5)
    cached_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        use_enum_values = True
