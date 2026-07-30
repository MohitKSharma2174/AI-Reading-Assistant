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
    id: int
    original_url: str
    title: str
    clean_content: str
    reading_time: Optional[int] = None
    created_at: datetime

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
