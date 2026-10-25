from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from api.routes.articles import router as articles_router
from api.routes.highlights import router as highlights_router
from api.routes.auth import router as auth_router
from api.routes.ai import router as ai_router
from api.routes.vocabulary import router as vocabulary_router

from core.database import engine, Base
import models.schema

# Automatically create tables for all registered models on startup / reload
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AARC API",
    description="Anything Anywhere Reading Companion API",
    version="0.2.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origins e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to prevent database locks and leaks during error states
@app.middleware("http")
async def db_lock_prevention_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        print(f"Unhandled error in request pipeline: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error occurred."}
        )

# Include Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(articles_router, prefix="/api/v1")
app.include_router(highlights_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/api")
app.include_router(ai_router, prefix="")
app.include_router(vocabulary_router, prefix="/api")
app.include_router(vocabulary_router, prefix="/api/v1")
app.include_router(vocabulary_router, prefix="")




@app.get("/")
async def root():
    return {"message": "Welcome to the AARC API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
