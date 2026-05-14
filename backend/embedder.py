import httpx
import os
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

def get_embedding(text: str) -> list[float]:
    """Generates a 2048-dimension vector embedding using OpenRouter (Nvidia Nemotron)."""
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is missing in .env")

    try:
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
            raise Exception(f"OpenRouter Embeddings Error: {response.text}")

        data = response.json()
        return data["data"][0]["embedding"]

    except Exception as e:
        print(f"Embedding failed: {e}")
        raise e