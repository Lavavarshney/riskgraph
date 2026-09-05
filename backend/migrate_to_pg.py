import os
import sys
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.models.domain import Base, Transaction, Customer, Device, Merchant, IPAddress, PaymentMethod

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migration")

sqlite_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../riskgraph.db"))
sqlite_engine = create_engine(f"sqlite:///{sqlite_db_path}")
SqliteSession = sessionmaker(bind=sqlite_engine)

from dotenv import load_dotenv
load_dotenv()

pg_url = os.getenv("DATABASE_URL")
if not pg_url:
    raise ValueError("DATABASE_URL environment variable is not set")
pg_engine = create_engine(pg_url)
PgSession = sessionmaker(bind=pg_engine)

def migrate():
    Base.metadata.create_all(bind=pg_engine)
    
    sqlite_session = SqliteSession()
    pg_session = PgSession()
    
    # Check if PG is empty
    if pg_session.query(Transaction).count() > 0:
        logger.info("PG already has data.")
        return

    logger.info("Migrating transactions...")
    transactions = sqlite_session.query(Transaction).all()
    pg_session.bulk_save_objects(
        [Transaction(**{c.name: getattr(tx, c.name) for c in Transaction.__table__.columns}) for tx in transactions]
    )
    pg_session.commit()
    logger.info(f"Migrated {len(transactions)} transactions.")

if __name__ == "__main__":
    migrate()
