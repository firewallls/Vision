from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth,GithubOAuth,discovery
from .lifespans import lifespan
import uvicorn


app = FastAPI(lifespan=lifespan)

origins = [
        "http://localhost:5173",
        "http://10.7.25.105:5173"# Your React app's URL
        # Add other allowed origins if needed
    ]

app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router)
app.include_router(GithubOAuth.router)  # New GitHub routes
app.include_router(discovery.router)
@app.get("/")
async def root():
    return {"message": "Welcome to the Nexus", "status": "running", 'status_code': 200}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.1", port=8000)
