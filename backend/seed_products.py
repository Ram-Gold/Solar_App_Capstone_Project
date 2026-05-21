import os
import csv
import json
from dotenv import load_dotenv
from supabase import create_client, Client
from embedder import get_embedding

load_dotenv(override=True)

# Setup Supabase
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'solar_database - Sheet1.csv')

def derive_type(name: str) -> str:
    """Derive product type from the product name."""
    name_lower = name.lower()
    if 'integrated' in name_lower:
        return 'Integrated Solar Street Light'
    elif 'road light' in name_lower:
        return 'Aviation Aluminum Solar Road Light'
    elif 'street light' in name_lower and 'aviation aluminum' in name_lower:
        return 'Aviation Aluminum Solar Street Light'
    elif 'street light' in name_lower and 'aluminum' in name_lower:
        return 'Aluminum Solar Street Light'
    elif 'solar light' in name_lower and 'aviation' in name_lower:
        return 'Aviation Aluminum Solar Light'
    elif 'streetlight' in name_lower or 'street light' in name_lower:
        return 'Solar Streetlight'
    return 'Solar Light'

def seed_database():
    print("Starting Phase 1 database seeding with embeddings...")

    csv_path = CSV_PATH
    if not os.path.exists(csv_path):
        # Fallback to local path
        csv_path = os.path.join(os.path.dirname(__file__), 'solar_database - Sheet1.csv')
        if not os.path.exists(csv_path):
            print("Error: solar_database - Sheet1.csv not found!")
            return

    # Clear existing products
    print("Clearing existing products...")
    supabase.table("products").delete().neq("id", 0).execute()

    with open(csv_path, mode='r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)

        for row in csv_reader:
            name = row.get('name', '').strip()
            if not name:
                continue

            watts = row.get('watts', '').strip().replace('W', '')
            product_name = f"{name} {row.get('watts', '').strip()}"
            product_type = derive_type(name)

            print(f"Processing: {product_name}")

            # Combine relevant info for the embedding text
            embed_text = (
                f"Product: {product_name}\n"
                f"Category: {product_type}\n"
                f"Power: {watts}W\n"
                f"Waterproof: {row.get('waterproof_grade', 'N/A')}\n"
                f"Control: {row.get('method_control', 'N/A')}\n"
                f"Material: {row.get('material', 'N/A')}\n"
                f"Solar Panel: {row.get('solar_panel', 'N/A')}\n"
                f"Battery: {row.get('battery', 'N/A')}\n"
                f"Charging Time: {row.get('charging_time', 'N/A')}\n"
                f"LED: {row.get('smd_lamp_beads', 'N/A')}\n"
                f"Lighting Time: {row.get('lighting_time', 'N/A')}\n"
                f"Size: {row.get('size', 'N/A')}"
            )

            try:
                # Generate embedding
                try:
                    embedding = get_embedding(embed_text)
                    print(f"  ✓ Generated embedding ({len(embedding)} dims)")
                except Exception as embed_error:
                    print(f"  × Embedding failed: {str(embed_error)}")
                    embedding = None

                product_data = {
                    "name": product_name,
                    "type": product_type,
                    "watt": int(watts) if watts else None,
                    "waterproof_grade": row.get('waterproof_grade', '').strip() or None,
                    "method_control": row.get('method_control', '').strip() or None,
                    "material": row.get('material', '').strip() or None,
                    "solar_panel": row.get('solar_panel', '').strip() or None,
                    "battery": row.get('battery', '').strip() or None,
                    "charging_time": row.get('charging_time', '').strip() or None,
                    "charging_type": row.get('charging_type', '').strip() or None,
                    "smd_lamp_beads": row.get('smd_lamp_beads', '').strip() or None,
                    "lighting_time": row.get('lighting_time', '').strip() or None,
                    "size": row.get('size', '').strip() or None,
                    "image_url": row.get('image_url', '').strip() or None,
                    "in_stock": True,
                    "sales": int(row.get('sales', 0)) if row.get('sales', '').strip() else 0,
                    "embedding": embedding,
                }

                supabase.table("products").insert(product_data).execute()
                print(f"  ✓ Successfully inserted: {product_name}")

            except Exception as e:
                print(f"  × Error processing {product_name}: {str(e)}")

    print("\nPhase 1 seeding complete!")

if __name__ == "__main__":
    seed_database()
