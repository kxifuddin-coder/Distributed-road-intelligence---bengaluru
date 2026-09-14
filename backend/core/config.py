import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Pothole Prevention System (DRIS)"
    API_V1_STR: str = "/api/v1"
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Resend Email API
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
