from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.articles import router as articles_router
from api.routes.highlights import router as highlights_router

app = FastAPI(
    title="FastAPI Backend",
    description="Clean FastAPI application template for monorepo",
    version="0.1.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with specific origins e.g. ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(articles_router, prefix="/api/v1")
app.include_router(highlights_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Welcome to the FastAPI Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
