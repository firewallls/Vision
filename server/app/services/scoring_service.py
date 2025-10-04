# services/scoring_service.py
import math
from datetime import datetime, timedelta
from typing import List, Dict
from app.models.repository import Repository, RepositoryHealth, RepositoryComplexity
from app.models.user_profile import UserProfile, SkillLevel


class ScoringService:

    @staticmethod
    def calculate_repository_quality_score(repo: Repository) -> float:
        """Calculate repository quality based on community health metrics"""
        health = repo.health
        complexity = repo.complexity

        # Base metrics (0-1 normalized)
        star_score = min(math.log10(health.stars + 1) / 5, 1.0)  # Log scale, max at 100k stars
        fork_score = min(math.log10(health.forks + 1) / 4, 1.0)  # Max at 10k forks

        # Issue management score
        total_issues = health.open_issues + health.closed_issues
        issue_closure_rate = health.closed_issues / max(total_issues, 1)

        # Recent activity score
        days_since_last_commit = 0
        if health.last_commit_date:
            days_since_last_commit = (datetime.utcnow() - health.last_commit_date).days
        activity_score = max(0, 1 - (days_since_last_commit / 365))  # Decay over year

        # Documentation quality
        doc_score = (
                (0.3 if complexity.readme_length > 1000 else 0.1) +
                (0.2 if complexity.has_contributing_guide else 0) +
                (0.2 if complexity.has_code_of_conduct else 0) +
                (0.3 if complexity.has_license else 0)
        )

        # Community engagement
        contributor_score = min(math.log10(health.contributors_count + 1) / 2, 1.0)

        # Weighted average
        quality_score = (
                star_score * 0.15 +
                fork_score * 0.10 +
                issue_closure_rate * 0.25 +
                activity_score * 0.25 +
                doc_score * 0.15 +
                contributor_score * 0.10
        )

        return min(max(quality_score, 0.0), 1.0)

    @staticmethod
    def calculate_difficulty_score(repo: Repository) -> float:
        """Calculate repository complexity/difficulty"""
        complexity = repo.complexity
        health = repo.health

        # Code complexity indicators
        loc_score = min(complexity.lines_of_code / 100000, 1.0)  # Max at 100k LOC
        file_count_score = min(complexity.file_count / 1000, 1.0)  # Max at 1k files
        dependency_score = min(complexity.dependency_count / 100, 1.0)  # Max at 100 deps

        # Project maturity (more mature = potentially more complex)
        age_months = 0
        if complexity.creation_date:
            age_months = (datetime.utcnow() - complexity.creation_date).days / 30
        maturity_score = min(age_months / 60, 1.0)  # Max at 5 years

        # Community size (larger community = potentially more complex)
        community_score = min(math.log10(health.contributors_count + 1) / 2, 1.0)

        difficulty_score = (
                loc_score * 0.25 +
                file_count_score * 0.15 +
                dependency_score * 0.20 +
                maturity_score * 0.20 +
                community_score * 0.20
        )

        return min(max(difficulty_score, 0.0), 1.0)

    @staticmethod
    def calculate_beginner_friendly_score(repo: Repository) -> float:
        """Calculate how beginner-friendly a repository is"""

        # Good first issues availability
        gfi_score = min(repo.good_first_issues / 10, 1.0)  # Max at 10 issues
        help_wanted_score = min(repo.help_wanted_issues / 5, 1.0)  # Max at 5 issues

        # Documentation quality (reuse from quality score)
        doc_score = (
                (0.4 if repo.complexity.readme_length > 500 else 0.1) +
                (0.3 if repo.complexity.has_contributing_guide else 0) +
                (0.3 if repo.complexity.has_code_of_conduct else 0)
        )

        # Recent activity indicates maintained project
        activity_score = 0
        if repo.health.last_commit_date:
            days_since_commit = (datetime.utcnow() - repo.health.last_commit_date).days
            activity_score = max(0, 1 - (days_since_commit / 90))  # Active within 3 months

        # Inverse relationship with complexity
        complexity_penalty = 1 - repo.difficulty_score

        beginner_score = (
                gfi_score * 0.30 +
                help_wanted_score * 0.15 +
                doc_score * 0.25 +
                activity_score * 0.15 +
                complexity_penalty * 0.15
        )

        return min(max(beginner_score, 0.0), 1.0)

    @staticmethod
    def calculate_user_skill_level(profile: UserProfile, language: str) -> float:
        """Calculate user's skill level for a specific language (0-1)"""

        # Find user's skill for the language
        user_skill = next((s for s in profile.skills if s.language.lower() == language.lower()), None)

        if not user_skill:
            return 0.0

        # Base skill level
        skill_mapping = {
            SkillLevel.BEGINNER: 0.25,
            SkillLevel.INTERMEDIATE: 0.50,
            SkillLevel.ADVANCED: 0.75,
            SkillLevel.EXPERT: 1.0
        }

        base_score = skill_mapping.get(user_skill.level, 0.0)

        # Adjust based on experience metrics
        experience_factors = [
            min(user_skill.projects_count / 10, 1.0),  # Max at 10 projects
            min(user_skill.lines_of_code / 50000, 1.0),  # Max at 50k LOC
            user_skill.confidence_score,
            min(profile.pr_merged / 20, 1.0),  # Max at 20 merged PRs
        ]

        experience_boost = sum(experience_factors) / len(experience_factors) * 0.3

        return min(base_score + experience_boost, 1.0)

    @staticmethod
    def calculate_user_overall_score(profile: UserProfile) -> float:
        """Calculate user's overall development experience score"""

        # Account age factor (more experience over time)
        age_score = min(profile.account_age_days / 1095, 1.0)  # Max at 3 years

        # Repository portfolio
        repo_score = min(math.log10(profile.total_repositories + 1) / 2, 1.0)  # Max at 100 repos

        # Community recognition
        star_score = min(math.log10(profile.total_stars_earned + 1) / 3, 1.0)  # Max at 1k stars

        # Collaboration experience
        pr_ratio = profile.pr_merged / max(profile.pr_raised, 1)
        collaboration_score = (
                min(profile.pr_merged / 50, 1.0) * 0.6 +  # Absolute merged PRs
                pr_ratio * 0.4  # Success rate
        )

        # Network effect
        network_score = min(math.log10(profile.followers_count + 1) / 2, 1.0)

        # Activity consistency
        streak_score = min(profile.contribution_streak / 365, 1.0)  # Max at 1 year streak

        overall_score = (
                age_score * 0.15 +
                repo_score * 0.20 +
                star_score * 0.15 +
                collaboration_score * 0.25 +
                network_score * 0.10 +
                streak_score * 0.15
        )

        return min(max(overall_score, 0.0), 1.0)
