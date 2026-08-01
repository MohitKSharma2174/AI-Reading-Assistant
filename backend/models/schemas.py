from datetime import datetime
from pydantic import BaseModel, HttpUrl, ConfigDict
from typing import List, Optional

class ArticleIngestRequest(BaseModel):
    url: HttpUrl

class SummaryResponse(BaseModel):
    id: int
    bullet_points: List[str]
    
    model_config = ConfigDict(from_attributes=True)

class TagResponse(BaseModel):
    id: int
    name: str
    
    model_config = ConfigDict(from_attributes=True)

class ArticleResponse(BaseModel):
    """Full article response (kept for backward-compat, includes content)."""
    id: int
    original_url: str
    title: str
    clean_content: str
    reading_time: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ArticleIngestResponse(BaseModel):
    """Lean response returned on POST /ingest — omits clean_content to reduce bandwidth."""
    id: int
    original_url: str
    title: str
    reading_time: Optional[int] = None
    created_at: datetime
    already_existed: bool = False

    model_config = ConfigDict(from_attributes=True)

class ArticleListResponse(BaseModel):
    id: int
    original_url: str
    title: str
    reading_time: Optional[int] = None
    created_at: datetime
    summary: Optional[SummaryResponse] = None
    tags: List[TagResponse] = []

    model_config = ConfigDict(from_attributes=True)

class ArticleDetailResponse(BaseModel):
    id: int
    original_url: str
    title: str
    clean_content: str
    reading_time: Optional[int] = None
    created_at: datetime
    summary: Optional[SummaryResponse] = None
    tags: List[TagResponse] = []

    model_config = ConfigDict(from_attributes=True)


class HighlightCreate(BaseModel):
    selected_text: str
    note: Optional[str] = None
    position_start: Optional[int] = None
    position_end: Optional[int] = None
    color: Optional[str] = "yellow"

class HighlightResponse(BaseModel):
    id: int
    article_id: int
    selected_text: str
    note: Optional[str] = None
    position_start: Optional[int] = None
    position_end: Optional[int] = None
    color: str

    model_config = ConfigDict(from_attributes=True)


class AskRequest(BaseModel):
    question: str
    context: Optional[str] = None  # The highlighted/selected text passage


class AskResponse(BaseModel):
    answer: str
    article_id: int


class SummarizePassageRequest(BaseModel):
    context: str  # The highlighted/selected passage to summarize


class SummarizePassageResponse(BaseModel):
    summary: str
    article_id: int


class UserCreate(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    sub: Optional[str] = None


