import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("riskgraph.database")

def create_db_engine():
    postgres_url = settings.DATABASE_URL
    logger.info("Connecting to database...")
    test_engine = create_engine(
        postgres_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        connect_args={"connect_timeout": 3} if "postgresql" in postgres_url else {}
    )
    try:
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Successfully connected to database.")
        return test_engine
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> dict:
    """Verifies connection to active database engine."""
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            row = result.fetchone()
            if row:
                return {
                    "connected": True,
                    "dialect": engine.dialect.name,
                    "message": "Database connection healthy"
                }
    except Exception as e:
        return {
            "connected": False,
            "dialect": engine.dialect.name if hasattr(engine, "dialect") else "unknown",
            "error": str(e)
        }
    return {"connected": False, "error": "Unknown database check failure"}
