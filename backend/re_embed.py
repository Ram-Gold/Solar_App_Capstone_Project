"""Re-generates embeddings for all products using the Nvidia Nemotron model via OpenRouter.
Updated for Phase 1 schema (solar lights/streetlights)."""

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
    print(f"Found {len(products)} products. Re-generating embeddings...\n")

    for p in products:
        embed_text = (
            f"Product: {p['name']}\n"
            f"Category: {p['type']}\n"
            f"Power: {p['watt']}W\n"
            f"Waterproof: {p.get('waterproof_grade', 'N/A')}\n"
            f"Control: {p.get('method_control', 'N/A')}\n"
            f"Material: {p.get('material', 'N/A')}\n"
            f"Solar Panel: {p.get('solar_panel', 'N/A')}\n"
            f"Battery: {p.get('battery', 'N/A')}\n"
            f"Charging Time: {p.get('charging_time', 'N/A')}\n"
            f"LED: {p.get('smd_lamp_beads', 'N/A')}\n"
            f"Lighting Time: {p.get('lighting_time', 'N/A')}\n"
            f"Size: {p.get('size', 'N/A')}"
        )

        try:
            embedding = get_embedding(embed_text)
            supabase.table("products").update(
                {"embedding": embedding}
            ).eq("id", p["id"]).execute()
            print(f"  ✓ {p['name']} ({len(embedding)} dims)")
        except Exception as e:
            print(f"  ✗ {p['name']}: {e}")

    print("\nDone! All embeddings updated.")

if __name__ == "__main__":
    re_embed_all()
