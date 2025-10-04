# routers/discovery.py
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Optional, Any
from pymongo import MongoClient
from datetime import datetime, timedelta

from ..mongo import get_db
from ..models.user_profile import UserProfile
from ..models.repository import Repository
from ..services.github_service import GitHubService
from ..services.scoring_service import ScoringService
from ..services.recommendation_service import RecommendationService
from ..Oauth2 import get_current_user
import os
import asyncio

router = APIRouter(prefix="/discovery", tags=["discovery"])
security = HTTPBearer()

# Initialize services
github_service = GitHubService(os.getenv("GITHUB_TOKEN"))
scoring_service = ScoringService()
recommendation_service = RecommendationService(scoring_service)


@router.post("/analyze-profile")
async def analyze_user_profile(
        current_user_id: str = Depends(get_current_user),
        db_client: MongoClient = Depends(get_db),
        background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Analyze GitHub user profile and store skill analysis"""

    db = db_client["sendora"]
    users_collection = db["users"]
    profiles_collection = db["user_profiles"]

    # Get user's GitHub username from auth data
    user = users_collection.find_one({"user_id": current_user_id})
    if not user or not user.get("github_id"):
        raise HTTPException(status_code=404, detail="GitHub account not linked")

    github_username = user.get("github_username") or user.get("name")  # Fallback to name

    try:
        async with github_service as gh:
            # Analyze user profile
            profile = await gh.analyze_user_profile(github_username)

            # Store in database
            profile_dict = profile.dict()
            profiles_collection.replace_one(
                {"github_id": profile.github_id},
                profile_dict,
                upsert=True
            )

            # Update user record with profile link
            users_collection.update_one(
                {"user_id": current_user_id},
                {"$set": {"profile_analyzed": True, "profile_analyzed_at": datetime.utcnow()}}
            )

            # Schedule background repository discovery
            background_tasks.add_task(discover_repositories_for_user, profile.github_id, db)

            return {
                "message": "Profile analyzed successfully",
                "profile": profile_dict,
                "repositories_discovery": "scheduled"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile analysis failed: {str(e)}")


@router.get("/recommendations")
async def get_personalized_recommendations(
        current_user_id: str = Depends(get_current_user),
        languages: Optional[List[str]] = Query(None),
        difficulty: Optional[str] = Query(None, regex="^(beginner|intermediate|advanced|expert)$"),
        category: Optional[str] = Query(None),
        limit: int = Query(20, ge=1, le=100),
        db_client: MongoClient = Depends(get_db)
):
    """Get personalized repository recommendations"""

    db = db_client["sendora"]
    profiles_collection = db["user_profiles"]
    repositories_collection = db["repositories"]

    # Get user profile
    user = db["users"].find_one({"user_id": current_user_id})
    if not user or not user.get("github_id"):
        raise HTTPException(status_code=404, detail="GitHub account not linked")

    profile_doc = profiles_collection.find_one({"github_id": user["github_id"]})
    if not profile_doc:
        raise HTTPException(status_code=404, detail="Profile not analyzed. Please analyze profile first.")

    profile = UserProfile(**profile_doc)

    # Build repository query
    repo_query = {}
    if languages:
        repo_query["primary_language"] = {"$in": languages}

    # Get repositories (limit to recently cached)
    cache_threshold = datetime.utcnow() - timedelta(days=7)
    repo_query["cached_at"] = {"$gte": cache_threshold}

    repo_docs = list(repositories_collection.find(repo_query).limit(500))
    repositories = [Repository(**doc) for doc in repo_docs]

    if not repositories:
        raise HTTPException(status_code=404,
                            detail="No repositories found. Please wait for repository discovery to complete.")

    # Get recommendations
    if category == "categories":
        recommendations = recommendation_service.get_repositories_by_category(profile, repositories)
        return {"categories": recommendations}
    else:
        scored_recommendations = recommendation_service.get_personalized_recommendations(
            profile, repositories, languages, limit
        )

        result = []
        for repo, score in scored_recommendations:
            repo_dict = repo.dict()
            repo_dict["match_score"] = score
            result.append(repo_dict)

        return {"recommendations": result, "total": len(result)}


@router.get("/search")
async def search_repositories(
        query: str = Query(..., min_length=1),
        language: Optional[str] = Query(None),
        min_stars: Optional[int] = Query(None, ge=0),
        max_difficulty: Optional[float] = Query(None, ge=0.0, le=1.0),
        has_good_first_issues: Optional[bool] = Query(None),
        sort_by: str = Query("relevance", regex="^(relevance|stars|updated|quality|difficulty)$"),
        limit: int = Query(20, ge=1, le=100),
        offset: int = Query(0, ge=0),
        db_client: MongoClient = Depends(get_db)
):
    """Search repositories with advanced filtering"""

    db = db_client["sendora"]
    repositories_collection = db["repositories"]

    # Build search query
    search_query = {
        "$or": [
            {"name": {"$regex": query, "$options": "i"}},
            {"description": {"$regex": query, "$options": "i"}},
            {"topics": {"$in": [query.lower()]}}
        ]
    }

    # Apply filters
    filters = {}
    if language:
        filters["primary_language"] = {"$regex": f"^{language}$", "$options": "i"}

    if min_stars is not None:
        filters["health.stars"] = {"$gte": min_stars}

    if max_difficulty is not None:
        filters["difficulty_score"] = {"$lte": max_difficulty}

    if has_good_first_issues:
        filters["good_first_issues"] = {"$gt": 0}

    # Combine query and filters
    final_query = {"$and": [search_query, filters]} if filters else search_query

    # Sorting
    sort_mapping = {
        "relevance": [("overall_score", -1), ("health.stars", -1)],
        "stars": [("health.stars", -1)],
        "updated": [("health.last_commit_date", -1)],
        "quality": [("quality_score", -1)],
        "difficulty": [("difficulty_score", 1)]
    }

    sort_criteria = sort_mapping.get(sort_by, [("overall_score", -1)])

    # Execute query
    cursor = repositories_collection.find(final_query).sort(sort_criteria).skip(offset).limit(limit)
    repositories = list(cursor)

    # Get total count
    total_count = repositories_collection.count_documents(final_query)

    return {
        "repositories": repositories,
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "query": query,
        "filters": filters
    }


@router.post("/repositories/discover")
async def discover_repositories(
        languages: Optional[List[str]] = Query(None),
        topics: Optional[List[str]] = Query(None),
        min_stars: int = Query(10, ge=0),
        max_repositories: int = Query(200, ge=1, le=1000),
        current_user_id: str = Depends(get_current_user),
        background_tasks: BackgroundTasks = BackgroundTasks(),
        db_client: MongoClient = Depends(get_db)
):
    """Discover and cache new repositories"""

    # Check if user is authorized (could add admin check)
    user = db_client["sendora"]["users"].find_one({"user_id": current_user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Schedule background discovery
    background_tasks.add_task(
        discover_repositories_background,
        languages, topics, min_stars, max_repositories, db_client
    )

    return {
        "message": "Repository discovery started",
        "parameters": {
            "languages": languages,
            "topics": topics,
            "min_stars": min_stars,
            "max_repositories": max_repositories
        }
    }


@router.get("/profile/stats")
async def get_profile_stats(
        current_user_id: str = Depends(get_current_user),
        db_client: MongoClient = Depends(get_db)
):
    """Get user profile statistics"""

    db = db_client["sendora"]

    # Get user and profile
    user = db["users"].find_one({"user_id": current_user_id})
    if not user or not user.get("github_id"):
        raise HTTPException(status_code=404, detail="GitHub account not linked")

    profile = db["user_profiles"].find_one({"github_id": user["github_id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not analyzed")

    # Get recommendation stats
    total_repos = db["repositories"].count_documents({})

    return {
        "profile": {
            "username": profile["username"],
            "overall_score": profile["overall_score"],
            "skills_count": len(profile["skills"]),
            "pr_success_rate": profile["pr_merged"] / max(profile["pr_raised"], 1),
            "account_age_days": profile["account_age_days"]
        },
        "repository_stats": {
            "total_cached": total_repos,
            "last_discovery": profile.get("updated_at")
        },
        "skills": profile["skills"]
    }


@router.delete("/cache/refresh")
async def refresh_repository_cache(
        current_user_id: str = Depends(get_current_user),
        background_tasks: BackgroundTasks = BackgroundTasks(),
        db_client: MongoClient = Depends(get_db)
):
    """Refresh repository cache (admin function)"""

    # Could add admin check here

    # Clear old repositories (older than 30 days)
    db = db_client["sendora"]
    old_threshold = datetime.datetime.now(datetime.UTC) - timedelta(days=30)

    result = db["repositories"].delete_many({"cached_at": {"$lt": old_threshold}})

    # Schedule fresh discovery
    background_tasks.add_task(
        discover_popular_repositories, db
    )

    return {
        "message": "Cache refresh initiated",
        "deleted_old_repositories": result.deleted_count
    }


# Background Tasks

async def discover_repositories_for_user(github_id: str, db):
    """Background task to discover repositories based on user profile"""

    try:
        profile = db["user_profiles"].find_one({"github_id": github_id})
        if not profile:
            return

        user_languages = [skill["language"] for skill in profile["skills"]]

        async with GitHubService(os.getenv("GITHUB_TOKEN")) as gh:
            # Discover repositories for user's languages
            for language in user_languages[:3]:  # Limit to top 3 languages
                query = f"language:{language} stars:>10 good-first-issues:>0"
                repos = await gh.search_repositories(query, per_page=50)

                for repo_data in repos:
                    await cache_repository(gh, repo_data, db)

                # Rate limiting delay
                await asyncio.sleep(1)

    except Exception as e:
        print(f"Error in repository discovery for user {github_id}: {e}")


async def discover_repositories_background(
        languages: Optional[List[str]],
        topics: Optional[List[str]],
        min_stars: int,
        max_repositories: int,
        db
):
    """Background task for repository discovery"""

    try:
        async with GitHubService(os.getenv("GITHUB_TOKEN")) as gh:
            discovered = 0

            # Search by languages
            if languages:
                for language in languages:
                    if discovered >= max_repositories:
                        break

                    query = f"language:{language} stars:>={min_stars}"
                    if topics:
                        query += f" topic:{' topic:'.join(topics)}"

                    repos = await gh.search_repositories(query, per_page=100)

                    for repo_data in repos[:max_repositories - discovered]:
                        await cache_repository(gh, repo_data, db)
                        discovered += 1

                    await asyncio.sleep(1)  # Rate limiting

            # Search by topics if no languages specified
            elif topics:
                for topic in topics:
                    if discovered >= max_repositories:
                        break

                    query = f"topic:{topic} stars:>={min_stars}"
                    repos = await gh.search_repositories(query, per_page=100)

                    for repo_data in repos[:max_repositories - discovered]:
                        await cache_repository(gh, repo_data, db)
                        discovered += 1

                    await asyncio.sleep(1)

    except Exception as e:
        print(f"Error in background repository discovery: {e}")


async def discover_popular_repositories(db):
    """Discover popular repositories across different categories"""

    try:
        languages = ["Python", "JavaScript", "TypeScript", "Java", "Go", "Rust", "C++", "C#"]

        async with GitHubService(os.getenv("GITHUB_TOKEN")) as gh:
            for language in languages:
                # Popular repos
                query = f"language:{language} stars:>100"
                repos = await gh.search_repositories(query, sort="stars", per_page=50)

                for repo_data in repos:
                    await cache_repository(gh, repo_data, db)

                # Beginner-friendly repos
                query = f"language:{language} good-first-issues:>0 stars:>10"
                repos = await gh.search_repositories(query, per_page=30)

                for repo_data in repos:
                    await cache_repository(gh, repo_data, db)

                await asyncio.sleep(2)  # Rate limiting

    except Exception as e:
        print(f"Error discovering popular repositories: {e}")


async def cache_repository(gh: GitHubService, repo_data: Dict[str, Any], db):
    """Cache a single repository with full analysis"""

    try:
        # Check if already cached recently
        existing = db["repositories"].find_one(
            {
                "github_id": str(repo_data["id"]),
                "cached_at": {"$gte": datetime.datetime.now(datetime.UTC) - timedelta(days=1)}
            }
        )

        if existing:
            return  # Skip if recently cached

        # Fetch full repository details
        owner = repo_data["owner"]["login"]
        name = repo_data["name"]

        repository = await gh.fetch_repository_details(owner, name)

        # Store in database
        db["repositories"].replace_one(
            {"github_id": repository.github_id},
            repository.model_dump(),
            upsert=True
        )

    except Exception as e:
        print(f"Error caching repository {repo_data.get('full_name')}: {e}")
