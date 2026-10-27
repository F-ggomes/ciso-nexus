"""CISO Nexus API."""
from __future__ import annotations

import os
import time
from collections import defaultdict
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import ai, auth, compliance, connectors, easm, evidence, incidents, isms, policies, reports, repository, risks, tasks, vendors
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.db.session import SessionLocal, init_db
from app.services.repository import load_content_packs
from app.workers import scheduler

log = get_logger(__name__)
_RATE: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT, RATE_WINDOW = 300, 60.0  # requests per minute per client, excluding health


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    s = get_settings()
    if s.environment == "prod" and (s.secret_key.get_secret_value() == "change-me-in-production" or not os.getenv("NEXUS_ENCRYPTION_KEY")):
        raise RuntimeError("Refusing to start in prod with the default SECRET_KEY or without NEXUS_ENCRYPTION_KEY")
    init_db()
    db = SessionLocal()
    try:
        load_content_packs(db)
    finally:
        db.close()
    scheduler.start()
    log.info("app.started", env=get_settings().environment)
    yield
    scheduler.stop()


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title=s.app_name, version="0.1.0", lifespan=lifespan,
                  docs_url="/api/docs" if s.environment != "prod" else None, redoc_url=None, openapi_url="/api/openapi.json")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins,
        allow_origin_regex=r"https?://.*" if s.environment != "prod" else None,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def security_headers_and_rate_limit(request: Request, call_next):
        client = request.client.host if request.client else "unknown"
        now = time.time()
        if not request.url.path.endswith("/health"):
            bucket = [t for t in _RATE[client] if now - t < RATE_WINDOW]
            if len(bucket) >= RATE_LIMIT:
                return JSONResponse({"detail": "Too many requests"}, status_code=429)
            bucket.append(now)
            _RATE[client] = bucket
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        if request.url.path.startswith("/api/docs"):
            response.headers["Content-Security-Policy"] = ("default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                                                           "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://fastapi.tiangolo.com")
        else:
            response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
        if s.environment == "prod":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    prefix = s.api_prefix
    for r in (auth, compliance, connectors, repository, isms, policies, risks, vendors, incidents, evidence, tasks, reports, ai, easm):
        app.include_router(r.router, prefix=prefix)

    @app.get("/health")
    @app.get(f"{prefix}/health")
    def health():
        return {"status": "ok", "app": s.app_name, "environment": s.environment}

    return app


app = create_app()
