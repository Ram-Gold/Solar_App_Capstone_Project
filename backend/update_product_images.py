import csv
from supabase_client import get_supabase_client

# This dictionary maps the exact product name in the database 
# to the corresponding image file name (before upload).
# I have populated this with best guesses based on the product wattage and type.
# PLEASE REVIEW AND EDIT THIS DICTIONARY if any mappings are incorrect!
IMAGE_MAPPING = {
    "Aviation Aluminum Solar Light 200W": "BGZ048 200.png",
    "Aviation Aluminum Solar Road Light 300W": "BGZ048 300.png",
    "Aviation Aluminum Solar Road Light 400W": "BGZ048 400.png",
    "Aviation Aluminum Solar Road Light 500W": "BGZ048 500.png",
    "Aviation Aluminum Solar Road Light 600W": "BGZ048 600.png",
    
    "Aviation Aluminum Solar Street Light 100W": "UP78 100.png",
    "Aviation Aluminum Solar Street Light 150W": "UP78 150.png",
    "Aviation Aluminum Solar Street Light 200W": "UP78 200.png",
    "Aviation Aluminum Solar Street Light 250W": "UP78 250.png",
    
    "Integrated Solar Street Light 50W": "UP77 50.png",
    "Integrated Solar Street Light 100W": "UP77 100.png",
    "Integrated Solar Street Light 150W": "UP77 150.png",
    "Integrated Solar Street Light (Warm White) 150W": "UP77 150ww.png",
    "Integrated Solar Street Light 200W": "UP77 200.png",
    "Integrated Solar Street Light 300W": "UP68 300.png", # Guessing based on UP68 300
    
    "Aluminum Solar Street Light (Gray) 200W": "UP68 200.png", # Guess
    "Aluminum Solar Street Light (Gray) 300W": "UP68 300.png", # We can map the same image if needed
    
    "Solar Streetlight 200W": "UP79 200.png",
    "Solar Streetlight 300W": "UP79 300.png",
    "Solar Streetlight 400W": "UP79 400.png",
    "Solar Streetlight 500W": "UP79 500.png",
    "Solar Streetlight 600W": "UP79 600.png",
    "Solar Streetlight 800W": "UP79 600.png", # Reusing 600W image as fallback since there is no 800W image
}

def update_images():
    supabase = get_supabase_client()
    if not supabase:
        print("Error: Supabase client not initialized.")
        return

    # Read the generated URLs from the upload script
    url_map = {}
    try:
        with open("image_urls.csv", "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                url_map[row["filename"]] = row["url"]
    except FileNotFoundError:
        print("Error: image_urls.csv not found. Please run upload_images_to_supabase.py first.")
        return

    print("Updating database records...")
    updated_count = 0

    for product_name, image_filename in IMAGE_MAPPING.items():
        if image_filename in url_map:
            image_url = url_map[image_filename]
            
            # Update the product in the database
            try:
                response = supabase.table("products").update({"image_url": image_url}).eq("name", product_name).execute()
                if len(response.data) > 0:
                    print(f"✓ Updated: {product_name}")
                    updated_count += 1
                else:
                    print(f"× Product not found in DB: {product_name}")
            except Exception as e:
                print(f"× Error updating {product_name}: {e}")
        else:
            print(f"× Image URL not found for {image_filename} (Product: {product_name})")

    print(f"\nSuccessfully updated {updated_count} products!")

if __name__ == "__main__":
    update_images()
