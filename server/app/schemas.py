from pydantic import BaseModel , EmailStr

# Models
class UserSignup(BaseModel):
    name: str
    email: EmailStr

class UserLogin(BaseModel):
    email: EmailStr

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: EmailStr

class GitHubUser(BaseModel):
    github_id: str
    name: str
    email: str