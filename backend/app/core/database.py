import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("riskgraph.database")

def create_db_engine():
    # Attempt connecting to PostgreSQL
    postgres_url = settings.DATABASE_URL
    try:
        test_engine = create_engine(
            postgres_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            connect_args={"connect_timeout": 3} if "postgresql" in postgres_url else {}
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Successfully connected to PostgreSQL database.")
        return test_engine
    except Exception as e:
        logger.warning(f"PostgreSQL not reachable ({e}). Falling back to local SQLite database.")
        sqlite_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../riskgraph.db"))
        sqlite_url = f"sqlite:///{sqlite_db_path}"
        return create_engine(
            sqlite_url,
            connect_args={"check_same_thread": False},
            echo=False
        )

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
