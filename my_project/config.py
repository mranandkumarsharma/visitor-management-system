from pydantic_settings import BaseSettings
from typing import List, Union
from functools import lru_cache
import json

class Settings(BaseSettings):
    # MySQL Database Configuration
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    # JWT Configuration
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Application Configuration
    DEBUG: bool = False
    API_PREFIX: str = "/api/v1"

    # CORS Configuration
    CORS_ORIGINS: Union[str, List[str]] = "*"

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    def get_cors_origins(self) -> List[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        if isinstance(self.CORS_ORIGINS, str):
            return json.loads(self.CORS_ORIGINS)
        return self.CORS_ORIGINS

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()
