from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from httpx_oauth.clients.github import GitHubOAuth2
from ..mongo import get_db
from app.models.model import User
from ..Oauth2 import create_access_token, get_current_user  # Your JWT functions
from pymongo import MongoClient
from typing import Optional
from datetime import datetime, timezone
import random
import os
# from ..main import app  # To access app.state.github_oauth

router = APIRouter(tags=["auth-github"])


@router.get("/github")
async def github_login(request: Request):
    """Initiate GitHub login - redirect to GitHub for authorization."""
    redirect_uri = str(request.url_for("github_callback"))  # Full callback URL
    github_oauth: GitHubOAuth2 = router.state.github_oauth  # From lifespan
    # Generate simple state (use secure random/session in prod)
    state = "your-app-state"  # Or generate dynamically
    auth_url = github_oauth.get_authorization_url(redirect_uri, state=state)
    return RedirectResponse(auth_url)


@router.get("/github/callback")
async def github_callback(
        code: str,
        state: Optional[str] = None,
        db_client: MongoClient = Depends(get_db)
):
    """Handle GitHub callback: exchange code, fetch user, create/link account, issue JWT."""
    db = db_client["sendora"]
    users_collection = db["users"]

    # Validate state (CSRF protection)
    if state != "your-app-state":  # Match the state from login
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    github_oauth: GitHubOAuth2 = app.state.github_oauth

    # Exchange code for GitHub access token
    try:
        token = await github_oauth.get_access_token(code)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid authorization code")

    # Fetch GitHub user profile
    async with github_oauth.get_client(token) as client:
        user_resp = await client.get("https://api.github.com/user")
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub user")
        user_data = user_resp.json()

        # Fetch emails to get verified primary email
        emails_resp = await client.get("https://api.github.com/user/emails")
        if emails_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch GitHub emails")
        emails = emails_resp.json()
        primary_email = next(
            (e["email"] for e in emails if e.get("primary") and e.get("verified")), None
        )

        if not primary_email:
            raise HTTPException(status_code=400, detail="No verified primary email on GitHub")

    # Check for existing user by email or GitHub ID
    existing_user = users_collection.find_one({
        "$or": [
            {"email": primary_email},
            {"github_id": str(user_data["id"])}
        ]
    })

    if existing_user:
        # Link GitHub if not already
        if existing_user.get("github_id") != str(user_data["id"]):
            users_collection.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {
                    "github_id": str(user_data["id"]),
                    "github_access_token": token["access_token"]
                }}
            )
        user_id = existing_user["user_id"]
        # Verify email if pending
        if not existing_user.get("email_verified", False):
            users_collection.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"email_verified": True}}
            )
    else:
        # Create new user
        user_id = f"{user_data['login'].lower()}_{random.randint(10000, 99999)}"  # Adapt your logic
        new_user = User(
            user_id=user_id,
            name=user_data.get("name") or user_data["login"],
            email=primary_email,
            github_id=str(user_data["id"]),
            github_access_token=token["access_token"],
            email_verified=True,
            account_verified=True,
            created_at=datetime.now(timezone.utc)
        ).model_dump(by_alias=True)
        result = users_collection.insert_one(new_user)
        user_id = new_user["user_id"]

    # Generate JWT using your create_access_token (matches OTP flow)
    jwt_token = create_access_token(data={"sub": user_id}, expiry_time_in_min=30)

    # Redirect to frontend with token (use secure cookie in prod)
    redirect_url = f"http://localhost:5173/dashboard?token={jwt_token}"
    return RedirectResponse(redirect_url, status_code=302)


@router.get("/github/user")
async def get_github_user(
        current_user_id: str = Depends(get_current_user),
        db_client: MongoClient = Depends(get_db)
):
    """Get current user's GitHub-linked info (protected by JWT)."""
    db = db_client["sendora"]
    users_collection = db["users"]
    user = users_collection.find_one({"user_id": current_user_id})
    if not user or not user.get("github_id"):
        raise HTTPException(status_code=404, detail="GitHub account not linked")
    return {
        "github_id": user["github_id"],
        "name": user["name"],
        "email": user["email"]
    }
