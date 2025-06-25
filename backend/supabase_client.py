from dotenv import load_dotenv
import os
from supabase import create_client, Client

# Load environment variables from .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in your .env file.")

# Initialize a single, reusable Supabase client instance
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

__all__ = ["supabase"]