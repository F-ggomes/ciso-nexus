from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def _engine():
    url = get_settings().database_url
    kwargs = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
    return create_engine(url, **kwargs)


engine = _engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.db import models  # noqa: F401  (register models)

    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "postgresql":
        # Trigram index keeps ILIKE search fast once the document library holds thousands of texts.
        with engine.begin() as conn:
            conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS pg_trgm")
            conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_knowledge_documents_text_trgm "
                                 "ON knowledge_documents USING gin (text gin_trgm_ops)")
