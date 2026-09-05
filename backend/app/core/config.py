import os
from typing import List, Union
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Ensure .env is explicitly loaded so os.getenv can see it if it exists
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "RISKGRAPH Engine"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://riskgraph.vercel.app",


    ]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

settings = Settings()

if not settings.DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")
