from sqlalchemy import Column, Integer, String, ForeignKey, Table, JSON, DateTime, func
from sqlalchemy.orm import relationship
from core.database import Base

# Association Table for Article <-> Tag Many-to-Many Relationship
article_tag = Table(
    "article_tags",
    Base.metadata,
    Column("article_id", Integer, ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    preferences = Column(JSON, nullable=True)

    # Relationships
    articles = relationship("Article", back_populates="user", cascade="all, delete-orphan")


class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    original_url = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    clean_content = Column(String, nullable=False)
    reading_time = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="articles")
    summary = relationship("Summary", back_populates="article", uselist=False, cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=article_tag, back_populates="articles")
    highlights = relationship("Highlight", back_populates="article", cascade="all, delete-orphan")


class Summary(Base):
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), unique=True, nullable=False)
    bullet_points = Column(JSON, nullable=False)

    # Relationships
    article = relationship("Article", back_populates="summary")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    # Relationships
    articles = relationship("Article", secondary=article_tag, back_populates="tags")


class Highlight(Base):
    __tablename__ = "highlights"

    id = Column(Integer, primary_key=True, index=True)
    article_id = Column(Integer, ForeignKey("articles.id", ondelete="CASCADE"), nullable=False)
    selected_text = Column(String, nullable=False)
    note = Column(String, nullable=True)
    position_start = Column(Integer, nullable=True)
    position_end = Column(Integer, nullable=True)
    color = Column(String, default="yellow", nullable=False)

    # Relationships
    article = relationship("Article", back_populates="highlights")
