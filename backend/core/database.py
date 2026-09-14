from supabase import create_client, Client
from core.config import settings

def get_supabase() -> Client:
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_KEY
    if not url or not key:
        raise ValueError("Supabase URL and Key must be set in environment variables")
    return create_client(url, key)
