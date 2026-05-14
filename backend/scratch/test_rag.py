import os
from dotenv import load_dotenv
from supabase import create_client, Client
import httpx

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_embedding(text: str) -> list[float]:
    response = httpx.post(
        "https://openrouter.ai/api/v1/embeddings",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "nvidia/llama-nemotron-embed-vl-1b-v2:free",
            "input": text
        },
        timeout=30.0
    )
    if response.status_code != 200:
        print(f"Error: {response.text}")
        return None
    data = response.json()
    return data["data"][0]["embedding"]

def test_search(query: str):
    print(f"Searching for: {query}")
    vector = get_embedding(query)
    if not vector:
        print("Failed to get embedding")
        return

    print(f"Embedding generated. Dims: {len(vector)}")
    
    try:
        res = supabase.rpc("match_products", {
            "query_embedding": vector,
            "match_threshold": 0.0, # Set to 0 to see what it returns
            "match_count": 5
        }).execute()
        
        print(f"Results: {len(res.data)}")
        for i, p in enumerate(res.data):
            print(f"{i+1}. {p['name']} (Sim: {p['similarity']:.4f})")
    except Exception as e:
        print(f"RPC Error: {e}")

if __name__ == "__main__":
    test_search("cheap solar panel")
    test_search("tesla powerwall")
