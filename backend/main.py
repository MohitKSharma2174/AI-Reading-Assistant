from dotenv import load_dotenv

load_dotenv()

import os
from fastapi import FastAPI, Request, Query, Depends, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from api.routes.articles import router as articles_router, ingest_article, search_articles_route
from api.routes.highlights import router as highlights_router
from api.routes.auth import router as auth_router
from api.routes.ai import router as ai_router
from api.routes.vocabulary import router as vocabulary_router

from core.database import engine, Base, get_db
from core.deps import get_current_user
from models.schema import User
from models.schemas import SearchResultResponse, ArticleIngestResponse
import models.schema

# Automatically create tables for all registered models on startup / reload
Base.metadata.create_all(bind=engine)

def ensure_database_schema():
    """Ensure newly added columns exist in SQLite/Postgres without requiring manual migration."""
    try:
        with engine.connect() as conn:
            try:
                if str(engine.url).startswith("sqlite"):
                    cursor = conn.exec_driver_sql("PRAGMA table_info(articles);")
                    cols = [row[1] for row in cursor.fetchall()]
                    if "media_type" not in cols:
                        conn.exec_driver_sql("ALTER TABLE articles ADD COLUMN media_type VARCHAR DEFAULT 'article';")
                        conn.commit()
                else:
                    conn.exec_driver_sql("ALTER TABLE articles ADD COLUMN IF NOT EXISTS media_type VARCHAR DEFAULT 'article';")
                    conn.commit()
            except Exception as e:
                print(f"Schema update note: {e}")
    except Exception as e:
        print(f"Database connection note: {e}")

ensure_database_schema()

app = FastAPI(
    title="AARC API",
    description="Anything Anywhere Reading Companion API",
    version="0.2.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
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
app.include_router(auth_router, prefix="/api")
app.include_router(auth_router, prefix="")
app.include_router(articles_router, prefix="/api/v1")
app.include_router(articles_router, prefix="/api")
app.include_router(articles_router, prefix="")
app.include_router(highlights_router, prefix="/api/v1")
app.include_router(highlights_router, prefix="/api")
app.include_router(highlights_router, prefix="")
app.include_router(ai_router, prefix="/api")
app.include_router(ai_router, prefix="/api/v1")
app.include_router(ai_router, prefix="/api/api")
app.include_router(ai_router, prefix="")
app.include_router(vocabulary_router, prefix="/api")
app.include_router(vocabulary_router, prefix="/api/v1")
app.include_router(vocabulary_router, prefix="")

# Ingestion Route Aliases
app.post("/api/articles", response_model=ArticleIngestResponse, status_code=status.HTTP_201_CREATED)(ingest_article)
app.post("/api/ingest", response_model=ArticleIngestResponse, status_code=status.HTTP_201_CREATED)(ingest_article)
app.post("/api/v1/ingest", response_model=ArticleIngestResponse, status_code=status.HTTP_201_CREATED)(ingest_article)





@app.get("/api/search", response_model=List[SearchResultResponse])
@app.get("/api/v1/search", response_model=List[SearchResultResponse])
@app.get("/search", response_model=List[SearchResultResponse])
async def search_articles_endpoint(
    q: str = Query("", description="Search query string"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Global search across current_user's article titles, clean content, and AI summary bullet points."""
    return await search_articles_route(q=q, db=db, current_user=current_user)

@app.get("/")
async def root():
    return {"message": "Welcome to the AARC API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
