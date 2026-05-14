"""Re-generates embeddings for all products using the Nvidia Nemotron model via OpenRouter.
Matches the implementation in embedder.py."""

import os
from dotenv import load_dotenv
from supabase import create_client
from embedder import get_embedding

load_dotenv(override=True)

supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_KEY"]
)

def re_embed_all():
    products = supabase.table("products").select("*").execute().data
    print(f"Found {len(products)} products. Re-generating embeddings with Gemini...\n")

    for p in products:
        embed_text = (
            f"Product: {p['name']}\n"
            f"Category: {p['type']}\n"
            f"Specs: {p['watt']}W, {p['efficiency']}% efficiency\n"
            f"Features: {'Includes battery' if p.get('battery') else 'No battery'}\n"
            f"Measurements: {p.get('measurements', 'Any')}\n"
            f"Overview: {p.get('product_overview', '')}\n"
            f"Price: {p['price']}\n"
            f"Description: {p['description']}"
        )

        try:
            embedding = get_embedding(embed_text)
            supabase.table("products").update(
                {"embedding": embedding}
            ).eq("id", p["id"]).execute()
            print(f"  ✓ {p['name']} ({len(embedding)} dims)")
        except Exception as e:
            print(f"  ✗ {p['name']}: {e}")

    print("\nDone! All embeddings updated to Gemini text-embedding-004.")

if __name__ == "__main__":
    re_embed_all()
