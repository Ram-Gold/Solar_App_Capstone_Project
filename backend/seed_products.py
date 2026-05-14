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

def seed_database():
    print("Starting database seeding with embeddings...")
    
    if not os.path.exists('mock_products.csv'):
        print("Error: mock_products.csv not found!")
        return

    with open('mock_products.csv', mode='r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        
        for row in csv_reader:
            name = row['name']
            print(f"Processing: {name}")
            
            # Combine relevant info for the embedding text
            # This is what the AI will use to "understand" the product
            embed_text = (
                f"Product: {row['name']}\n"
                f"Category: {row['type']}\n"
                f"Specs: {row['watt']}W, {row['efficiency']}% efficiency\n"
                f"Features: {'Includes battery' if row['battery'].lower() == 'true' else 'No battery'}\n"
                f"Measurements: {row.get('measurements', 'Any')}\n"
                f"Overview: {row.get('product_overview', '')}\n"
                f"Description: {row['description']}"
            )
            
            try:
                # Generate embedding using our fixed embedder
                try:
                    embedding = get_embedding(embed_text)
                    print(f"  ✓ Generated embedding ({len(embedding)} dims)")
                except Exception as embed_error:
                    print(f"  × Embedding failed: {str(embed_error)}")
                    embedding = None
                
                # Format data for Supabase
                is_battery = row['battery'].lower() == 'true'
                
                product_data = {
                    "name": row['name'],
                    "type": row['type'],
                    "watt": int(row['watt']) if row['watt'] else None,
                    "price": float(row['price']) if row['price'] else None,
                    "efficiency": float(row['efficiency']) if row['efficiency'] else None,
                    "battery": is_battery,
                    "measurements": row.get('measurements', ''),
                    "image_url": row['image_url'],
                    "description": row['description'],
                    "product_overview": row.get('product_overview', ''),
                    "product_details": row.get('product_details', '{}'),
                    "sales": int(row.get('sales', 0)) if row.get('sales') else 0,
                    "embedding": embedding
                }
                
                # UPSERT based on name to avoid duplicates if re-running
                # We'll use a simple insert here but you might want to clear first
                supabase.table("products").insert(product_data).execute()
                print(f"  ✓ Successfully inserted: {name}")
                
            except Exception as e:
                print(f"  × Error processing {name}: {str(e)}")
                
    print("\nSeeding complete!")

if __name__ == "__main__":
    seed_database()
