from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request, Query, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, cast, String as SqlString
from typing import List

from api.routes.articles import router as articles_router
from api.routes.highlights import router as highlights_router
from api.routes.auth import router as auth_router
from api.routes.ai import router as ai_router
from api.routes.vocabulary import router as vocabulary_router

from core.database import engine, Base, get_db
from core.deps import get_current_user, get_optional_current_user
from models.schema import User, Article, Summary
from models.schemas import SearchResultResponse
import models.schema
from typing import Optional

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




@app.get("/api/search", response_model=List[SearchResultResponse])
@app.get("/api/v1/search", response_model=List[SearchResultResponse])
@app.get("/search", response_model=List[SearchResultResponse])
async def search_articles_endpoint(
    q: str = Query("", description="Search query string"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Global search across title, clean content, and AI summary bullet points."""
    term = q.strip()
    if not term:
        return []

    search_pattern = f"%{term}%"
    query = (
        db.query(Article)
        .outerjoin(Summary, Article.id == Summary.article_id)
        .filter(
            or_(
                Article.title.ilike(search_pattern),
                Article.clean_content.ilike(search_pattern),
                cast(Summary.bullet_points, SqlString).ilike(search_pattern)
            )
        )
        .order_by(Article.created_at.desc())
        .limit(20)
    )

    results = query.all()
    return [
        SearchResultResponse(
            id=a.id,
            title=a.title,
            media_type=getattr(a, "media_type", "article") or "article",
            reading_time=a.reading_time
        )
        for a in results
    ]

@app.get("/")
async def root():
    return {"message": "Welcome to the AARC API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
