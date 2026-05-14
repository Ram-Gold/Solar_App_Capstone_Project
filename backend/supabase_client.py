import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def get_supabase_client() -> Client | None:
    """Returns an authenticated Supabase client."""
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key or supabase_url == "https://your-project.supabase.co":
        return None
        
    return create_client(supabase_url, supabase_key)
