# services/recommendation_service.py
from typing import List, Dict, Tuple
import numpy as np
from ..models.repository import Repository
from ..models.user_profile import UserProfile, SkillLevel
from app.services.scoring_service import ScoringService


class RecommendationService:

    def __init__(self, scoring_service: ScoringService):
        self.scoring_service = scoring_service

    def get_personalized_recommendations(
            self,
            user_profile: UserProfile,
            repositories: List[Repository],
            preferred_languages: List[str] = None,
            limit: int = 20
    ) -> List[Tuple[Repository, float]]:
        """Get personalized repository recommendations with match scores"""

        scored_repos = []

        for repo in repositories:
            match_score = self._calculate_match_score(user_profile, repo, preferred_languages)
            scored_repos.append((repo, match_score))

        # Sort by match score descending
        scored_repos.sort(key=lambda x: x[1], reverse=True)

        return scored_repos[:limit]

    def _calculate_match_score(
            self,
            user_profile: UserProfile,
            repo: Repository,
            preferred_languages: List[str] = None
    ) -> float:
        """Calculate how well a repository matches a user's profile"""

        # Language compatibility
        language_score = self._calculate_language_match(user_profile, repo, preferred_languages)

        # Difficulty alignment
        difficulty_score = self._calculate_difficulty_alignment(user_profile, repo)

        # Interest alignment based on user's previous work
        interest_score = self._calculate_interest_alignment(user_profile, repo)

        # Progressive challenge factor
        challenge_score = self._calculate_progressive_challenge(user_profile, repo)

        # Repository quality weight
        quality_weight = repo.quality_score

        # Combine scores with weights
        match_score = (
                language_score * 0.25 +
                difficulty_score * 0.25 +
                interest_score * 0.20 +
                challenge_score * 0.15 +
                quality_weight * 0.15
        )

        return min(max(match_score, 0.0), 1.0)

    def _calculate_language_match(
            self,
            user_profile: UserProfile,
            repo: Repository,
            preferred_languages: List[str] = None
    ) -> float:
        """Calculate language compatibility score"""

        if not repo.primary_language:
            return 0.3  # Neutral score for repos without clear language

        # Check if user has experience with the primary language
        user_skill_score = self.scoring_service.calculate_user_skill_level(
            user_profile, repo.primary_language
        )

        # Bonus for preferred languages
        preference_bonus = 0.0
        if preferred_languages and repo.primary_language.lower() in [l.lower() for l in preferred_languages]:
            preference_bonus = 0.2

        # Check secondary languages in the repository
        secondary_language_score = 0.0
        total_bytes = sum(repo.languages.values())

        if total_bytes > 0:
            for lang, bytes_count in repo.languages.items():
                lang_proportion = bytes_count / total_bytes
                if lang_proportion > 0.1:  # At least 10% of codebase
                    lang_skill = self.scoring_service.calculate_user_skill_level(user_profile, lang)
                    secondary_language_score += lang_skill * lang_proportion

        return min(user_skill_score + preference_bonus + secondary_language_score * 0.3, 1.0)

    def _calculate_difficulty_alignment(self, user_profile: UserProfile, repo: Repository) -> float:
        """Calculate if repository difficulty matches user skill level"""

        user_experience = user_profile.overall_score
        repo_difficulty = repo.difficulty_score

        # Optimal difficulty should be slightly above user's comfort zone
        optimal_difficulty = min(user_experience + 0.2, 1.0)

        # Calculate distance from optimal difficulty
        difficulty_distance = abs(repo_difficulty - optimal_difficulty)

        # Convert distance to alignment score (closer = higher score)
        alignment_score = 1.0 - difficulty_distance

        # Boost for beginner-friendly repos if user is beginner
        if user_experience < 0.4 and repo.beginner_friendly_score > 0.6:
            alignment_score += 0.2

        return min(max(alignment_score, 0.0), 1.0)

    def _calculate_interest_alignment(self, user_profile: UserProfile, repo: Repository) -> float:
        """Calculate interest alignment based on topics and previous work"""

        # This would ideally analyze user's repository topics/descriptions
        # For now, use a simplified approach based on language diversity

        user_languages = {skill.language.lower() for skill in user_profile.skills}
        repo_languages = {lang.lower() for lang in repo.languages.keys()}

        # Language intersection
        common_languages = len(user_languages.intersection(repo_languages))
        total_languages = len(user_languages.union(repo_languages))

        language_similarity = common_languages / max(total_languages, 1)

        # Topic-based scoring (would need more user data in real implementation)
        topic_score = 0.5  # Default neutral score

        # Check for educational/beginner-friendly topics
        educational_topics = {'education', 'learning', 'tutorial', 'beginner', 'starter'}
        if any(topic.lower() in educational_topics for topic in repo.topics):
            if user_profile.overall_score < 0.5:  # Beginner user
                topic_score += 0.3

        return min((language_similarity + topic_score) / 2, 1.0)

    def _calculate_progressive_challenge(self, user_profile: UserProfile, repo: Repository) -> float:
        """Calculate progressive challenge factor based on user's PR history"""

        # Users with successful PR history should get slightly more challenging projects
        pr_success_rate = user_profile.pr_merged / max(user_profile.pr_raised, 1)

        if user_profile.pr_merged == 0:
            # Complete beginner - prioritize very beginner-friendly repos
            return repo.beginner_friendly_score

        elif user_profile.pr_merged < 5:
            # Novice - slight challenge increase
            target_difficulty = min(user_profile.overall_score + 0.1, 0.6)
            return 1.0 - abs(repo.difficulty_score - target_difficulty)

        elif user_profile.pr_merged < 20:
            # Intermediate - moderate challenge
            target_difficulty = min(user_profile.overall_score + 0.2, 0.8)
            return 1.0 - abs(repo.difficulty_score - target_difficulty)

        else:
            # Advanced - can handle complex projects
            return min(repo.difficulty_score + 0.2, 1.0)

    def get_repositories_by_category(
            self,
            user_profile: UserProfile,
            repositories: List[Repository]
    ) -> Dict[str, List[Repository]]:
        """Categorize repositories based on user profile"""

        categories = {
            "perfect_match": [],
            "good_first_issues": [],
            "challenging": [],
            "explore_new_tech": [],
            "trending": []
        }

        for repo in repositories:
            match_score = self._calculate_match_score(user_profile, repo)

            # Perfect match (high overall compatibility)
            if match_score > 0.8:
                categories["perfect_match"].append(repo)

            # Good first issues (high beginner-friendly score)
            if repo.beginner_friendly_score > 0.7 and repo.good_first_issues > 0:
                categories["good_first_issues"].append(repo)

            # Challenging (difficulty above user level)
            if repo.difficulty_score > user_profile.overall_score + 0.3:
                categories["challenging"].append(repo)

            # New tech exploration (different languages)
            user_langs = {s.language.lower() for s in user_profile.skills}
            if repo.primary_language and repo.primary_language.lower() not in user_langs:
                categories["explore_new_tech"].append(repo)

            # Trending (high activity and quality)
            if repo.quality_score > 0.7 and repo.health.commits_last_month > 10:
                categories["trending"].append(repo)

        # Sort each category by relevance
        for category in categories:
            categories[category].sort(
                key=lambda r: self._calculate_match_score(user_profile, r),
                reverse=True
            )
            categories[category] = categories[category][:10]  # Limit to top 10

        return categories

