import os
from contextlib import asynccontextmanager
from pymongo import MongoClient
from fastapi import FastAPI
from httpx_oauth.clients.github import GitHubOAuth2  # GitHub-specific client (no base URLs needed)


@asynccontextmanager
async def lifespan(app: FastAPI):
    client = None
    try:
        # Connect to MongoDB (existing logic)
        MONGO_URI = os.getenv("MONGO_URI")
        if not MONGO_URI:
            raise ValueError("MONGO_URI environment variable is not set")

        client = MongoClient(MONGO_URI)
        db = client["sendora"]  # Your database name
        user_collection = db["users"]

        # Create TTL index for OTP expiration (existing logic)
        user_collection.create_index("expired_at", expireAfterSeconds=300)

        # Initialize GitHub OAuth client (fixed: no base URLs, only required params)
        GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
        GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

        if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
            raise ValueError("GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables must be set")

        github_oauth = GitHubOAuth2(
            client_id=GITHUB_CLIENT_ID,
            client_secret=GITHUB_CLIENT_SECRET,
            scopes=["user:email", "read:user"]  # Scopes for email and basic profile
        )

        # Store in app state for router access (IDE warning suppressed)
        app.state.github_oauth = github_oauth  # type: ignore

        yield  # App startup complete

    except Exception as e:
        # Fixed: Raise plain Exception (not HTTPException) for lifespan errors
        raise Exception(f"Database or OAuth initialization failed: {str(e)}")
    finally:
        # Clean up MongoDB connection
        if client:
            client.close()
