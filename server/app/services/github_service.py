# services/github_service.py
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from app.models.user_profile import UserProfile, UserSkill, SkillLevel
from app.models.repository import Repository, RepositoryHealth, RepositoryComplexity


class GitHubService:

    def __init__(self, github_token: str):
        self.token = github_token
        self.base_url = "https://api.github.com"
        self.graphql_url = "https://api.github.com/graphql"
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def analyze_user_profile(self, username: str) -> UserProfile:
        """Analyze GitHub user and extract skill profile"""

        # Get basic user info
        user_data = await self._fetch_user_data(username)

        # Get user repositories
        repos = await self._fetch_user_repositories(username)

        # Get PR statistics
        pr_stats = await self._fetch_pr_statistics(username)

        # Analyze programming languages and skills
        skills = await self._analyze_user_skills(repos)

        # Calculate derived metrics
        account_age_days = (
                    datetime.datetime.now(datetime.UTC) - datetime.fromisoformat(user_data['created_at'].replace('Z', '+00:00'))).days

        profile = UserProfile(
            github_id=str(user_data['id']),
            username=username,
            skills=skills,
            total_repositories=user_data['public_repos'],
            total_stars_earned=sum(repo.get('stargazers_count', 0) for repo in repos),
            total_forks=sum(repo.get('forks_count', 0) for repo in repos),
            followers_count=user_data['followers'],
            following_count=user_data['following'],
            pr_raised=pr_stats['total_prs'],
            pr_merged=pr_stats['merged_prs'],
            contribution_streak=await self._calculate_contribution_streak(username),
            account_age_days=account_age_days
        )

        # Calculate overall score
        from app.services.scoring_service import ScoringService
        profile.overall_score = ScoringService.calculate_user_overall_score(profile)

        return profile

    async def fetch_repository_details(self, owner: str, repo_name: str) -> Repository:
        """Fetch comprehensive repository details"""

        # Basic repo info
        repo_data = await self._fetch_repository_data(owner, repo_name)

        # Language statistics
        languages = await self._fetch_repository_languages(owner, repo_name)

        # Issue statistics
        issues_data = await self._fetch_repository_issues(owner, repo_name)

        # Commit statistics
        commit_stats = await self._fetch_commit_statistics(owner, repo_name)

        # Contributors
        contributors_count = await self._fetch_contributors_count(owner, repo_name)

        # Repository complexity analysis
        complexity = await self._analyze_repository_complexity(owner, repo_name)

        # Create repository object
        health = RepositoryHealth(
            stars=repo_data['stargazers_count'],
            forks=repo_data['forks_count'],
            open_issues=repo_data['open_issues_count'],
            closed_issues=issues_data['closed_issues'],
            watchers=repo_data['watchers_count'],
            contributors_count=contributors_count,
            commits_last_month=commit_stats['last_month'],
            commits_last_year=commit_stats['last_year'],
            last_commit_date=datetime.fromisoformat(repo_data['pushed_at'].replace('Z', '+00:00')),
            creation_date=datetime.fromisoformat(repo_data['created_at'].replace('Z', '+00:00'))
        )

        repository = Repository(
            github_id=str(repo_data['id']),
            name=repo_data['name'],
            full_name=repo_data['full_name'],
            description=repo_data['description'],
            primary_language=repo_data['language'],
            languages=languages,
            topics=repo_data.get('topics', []),
            health=health,
            complexity=complexity,
            good_first_issues=issues_data['good_first_issues'],
            help_wanted_issues=issues_data['help_wanted_issues']
        )

        # Calculate scores
        from app.services.scoring_service import ScoringService
        repository.quality_score = ScoringService.calculate_repository_quality_score(repository)
        repository.difficulty_score = ScoringService.calculate_difficulty_score(repository)
        repository.beginner_friendly_score = ScoringService.calculate_beginner_friendly_score(repository)
        repository.overall_score = (repository.quality_score + repository.beginner_friendly_score) / 2

        return repository

    async def search_repositories(
            self,
            query: str,
            language: str = None,
            sort: str = "stars",
            order: str = "desc",
            per_page: int = 100
    ) -> List[Dict[str, Any]]:
        """Search repositories using GitHub Search API"""

        params = {
            "q": query,
            "sort": sort,
            "order": order,
            "per_page": per_page
        }

        if language:
            params["q"] += f" language:{language}"

        async with self.session.get(f"{self.base_url}/search/repositories", params=params) as response:
            data = await response.json()
            return data.get('items', [])

    async def _fetch_user_data(self, username: str) -> Dict[str, Any]:
        """Fetch basic user information"""
        async with self.session.get(f"{self.base_url}/users/{username}") as response:
            return await response.json()

    async def _fetch_user_repositories(self, username: str) -> List[Dict[str, Any]]:
        """Fetch user's public repositories"""
        repos = []
        page = 1

        while page <= 10:  # Limit to first 10 pages (1000 repos max)
            async with self.session.get(
                    f"{self.base_url}/users/{username}/repos",
                    params={"per_page": 100, "page": page, "sort": "updated"}
            ) as response:
                page_repos = await response.json()
                if not page_repos:
                    break
                repos.extend(page_repos)
                page += 1

        return repos

    async def _analyze_user_skills(self, repositories: List[Dict[str, Any]]) -> List[UserSkill]:
        """Analyze user's programming skills from repositories"""
        language_stats = {}

        for repo in repositories:
            if repo['language'] and not repo['fork']:  # Only count original repos
                lang = repo['language']
                if lang not in language_stats:
                    language_stats[lang] = {
                        'projects': 0,
                        'stars': 0,
                        'size': 0
                    }

                language_stats[lang]['projects'] += 1
                language_stats[lang]['stars'] += repo.get('stargazers_count', 0)
                language_stats[lang]['size'] += repo.get('size', 0)

        skills = []
        for lang, stats in language_stats.items():
            # Determine skill level based on projects and engagement
            if stats['projects'] >= 10 or stats['stars'] >= 100:
                level = SkillLevel.ADVANCED
                confidence = 0.9
            elif stats['projects'] >= 5 or stats['stars'] >= 20:
                level = SkillLevel.INTERMEDIATE
                confidence = 0.7
            elif stats['projects'] >= 2:
                level = SkillLevel.BEGINNER
                confidence = 0.5
            else:
                level = SkillLevel.BEGINNER
                confidence = 0.3

            skills.append(UserSkill(
                language=lang,
                level=level,
                confidence_score=confidence,
                projects_count=stats['projects'],
                lines_of_code=stats['size'] * 50  # Rough estimate: 1KB ≈ 50 LOC
            ))

        return skills

    async def _fetch_pr_statistics(self, username: str) -> Dict[str, int]:
        """Fetch user's pull request statistics"""

        # Search for PRs created by user
        search_query = f"author:{username} type:pr"

        async with self.session.get(
                f"{self.base_url}/search/issues",
                params={"q": search_query, "per_page": 100}
        ) as response:
            pr_data = await response.json()
            total_prs = pr_data.get('total_count', 0)

        # Search for merged PRs
        merged_query = f"author:{username} type:pr is:merged"

        async with self.session.get(
                f"{self.base_url}/search/issues",
                params={"q": merged_query, "per_page": 100}
        ) as response:
            merged_data = await response.json()
            merged_prs = merged_data.get('total_count', 0)

        return {"total_prs": total_prs, "merged_prs": merged_prs}

    async def _calculate_contribution_streak(self, username: str) -> int:
        """Calculate current contribution streak (simplified)"""
        # This would require parsing contribution graph
        # For now, return a placeholder based on recent activity
        return 30  # Default 30-day streak

    async def _fetch_repository_data(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetch repository basic information"""
        async with self.session.get(f"{self.base_url}/repos/{owner}/{repo}") as response:
            return await response.json()

    async def _fetch_repository_languages(self, owner: str, repo: str) -> Dict[str, int]:
        """Fetch repository language statistics"""
        async with self.session.get(f"{self.base_url}/repos/{owner}/{repo}/languages") as response:
            return await response.json()

    async def _fetch_repository_issues(self, owner: str, repo: str) -> Dict[str, int]:
        """Fetch repository issue statistics"""

        # Count good first issues
        async with self.session.get(
                f"{self.base_url}/search/issues",
                params={
                    "q": f"repo:{owner}/{repo} label:\"good first issue\" state:open",
                    "per_page": 1
                }
        ) as response:
            gfi_data = await response.json()
            good_first_issues = gfi_data.get('total_count', 0)

        # Count help wanted issues
        async with self.session.get(
                f"{self.base_url}/search/issues",
                params={
                    "q": f"repo:{owner}/{repo} label:\"help wanted\" state:open",
                    "per_page": 1
                }
        ) as response:
            hw_data = await response.json()
            help_wanted = hw_data.get('total_count', 0)

        # Count closed issues (approximation)
        async with self.session.get(
                f"{self.base_url}/search/issues",
                params={
                    "q": f"repo:{owner}/{repo} type:issue state:closed",
                    "per_page": 1
                }
        ) as response:
            closed_data = await response.json()
            closed_issues = closed_data.get('total_count', 0)

        return {
            "good_first_issues": good_first_issues,
            "help_wanted_issues": help_wanted,
            "closed_issues": closed_issues
        }

    async def _fetch_commit_statistics(self, owner: str, repo: str) -> Dict[str, int]:
        """Fetch commit statistics for different time periods"""

        now = datetime.datetime.now(datetime.UTC)
        last_month = now - timedelta(days=30)
        last_year = now - timedelta(days=365)

        # Get commits from last month
        async with self.session.get(
                f"{self.base_url}/repos/{owner}/{repo}/commits",
                params={"since": last_month.isoformat(), "per_page": 100}
        ) as response:
            month_commits = await response.json()
            last_month_count = len(month_commits) if isinstance(month_commits, list) else 0

        # Get commits from last year (sample)
        async with self.session.get(
                f"{self.base_url}/repos/{owner}/{repo}/commits",
                params={"since": last_year.isoformat(), "per_page": 100}
        ) as response:
            year_commits = await response.json()
            # Estimate total commits in year based on sample
            last_year_count = len(year_commits) * 4 if isinstance(year_commits, list) else 0

        return {
            "last_month": last_month_count,
            "last_year": min(last_year_count, 1000)  # Cap at reasonable number
        }

    async def _fetch_contributors_count(self, owner: str, repo: str) -> int:
        """Fetch number of contributors"""
        try:
            async with self.session.get(f"{self.base_url}/repos/{owner}/{repo}/contributors") as response:
                contributors = await response.json()
                return len(contributors) if isinstance(contributors, list) else 0
        except:
            return 0

    async def _analyze_repository_complexity(self, owner: str, repo: str) -> RepositoryComplexity:
        """Analyze repository complexity metrics"""

        # Get repository content to analyze structure
        try:
            async with self.session.get(f"{self.base_url}/repos/{owner}/{repo}/contents") as response:
                contents = await response.json()

                # Check for important files
                filenames = [item['name'].lower() for item in contents if item['type'] == 'file']

                has_contributing = any('contributing' in f for f in filenames)
                has_code_of_conduct = any('code_of_conduct' in f or 'code-of-conduct' in f for f in filenames)
                has_license = any('license' in f for f in filenames)

                # Get README length
                readme_length = 0
                readme_files = [item for item in contents if item['name'].lower().startswith('readme')]
                if readme_files:
                    readme_url = readme_files[0]['download_url']
                    async with self.session.get(readme_url) as readme_response:
                        readme_content = await readme_response.text()
                        readme_length = len(readme_content)

                return RepositoryComplexity(
                    file_count=len([item for item in contents if item['type'] == 'file']),
                    readme_length=readme_length,
                    has_contributing_guide=has_contributing,
                    has_code_of_conduct=has_code_of_conduct,
                    has_license=has_license,
                    lines_of_code=0,  # Would need additional API calls
                    directory_depth=2,  # Default estimate
                    dependency_count=0  # Would need to parse package files
                )
        except:
            return RepositoryComplexity()

