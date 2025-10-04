from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .mongo import get_db  # Adjust path
from pymongo import MongoClient


load_dotenv()  # Load once at startup
security = HTTPBearer()



def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db_client: MongoClient = Depends(get_db)
) -> str:
    try:
        payload = jwt.decode(credentials.credentials, os.getenv('SECRET_KEY'), algorithms=[os.getenv('ALGORITHM')])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        db = db_client["sendora"]
        user = db["users"].find_one({"user_id": user_id})
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def create_access_token(data: dict, expiry_time_in_min: int = 30) -> str:
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = os.getenv('ALGORITHM')
    to_encode = data.copy()
    to_encode.update({"exp": datetime.now() + timedelta(minutes= expiry_time_in_min)})

    if not SECRET_KEY:
        raise ValueError("SECRET_KEY not set in environment variables")
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
