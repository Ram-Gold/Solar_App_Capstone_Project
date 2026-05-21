import os
import glob
from supabase_client import get_supabase_client

# Define the bucket name (must be created in Supabase first!)
BUCKET_NAME = "product-images"

# Directory containing the images
IMAGE_DIR = "/home/ram/Downloads/data/solar streetlight"

def upload_images():
    supabase = get_supabase_client()
    if not supabase:
        print("Error: Supabase client not initialized. Check your .env file.")
        return

    # Skip bucket check since we know it exists and we have policies to upload

    # Find all PNG/JPG images in the subdirectories
    image_paths = glob.glob(os.path.join(IMAGE_DIR, "**", "*.png"), recursive=True)
    image_paths += glob.glob(os.path.join(IMAGE_DIR, "**", "*.jpg"), recursive=True)
    
    uploaded_urls = {}

    for file_path in image_paths:
        file_name = os.path.basename(file_path)
        
        # We store them at the root of the bucket with their original file name
        # If there are spaces, we can replace them or keep them, Supabase handles it (mostly).
        # Let's replace spaces with underscores for safer URLs
        storage_path = file_name.replace(" ", "_")
        
        print(f"Uploading {file_name} to {storage_path}...")
        
        with open(file_path, 'rb') as f:
            try:
                supabase.storage.from_(BUCKET_NAME).upload(
                    file=os.path.abspath(file_path),
                    path=storage_path,
                    file_options={"content-type": "image/png", "upsert": "true"}
                )
            except Exception as e:
                if "Duplicate" in str(e) or "already exists" in str(e):
                    print(f"  -> {storage_path} already exists, skipping upload.")
                else:
                    print(f"  -> Error uploading: {e}")
        
        # Get the public URL
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(storage_path)
        uploaded_urls[file_name] = public_url
        print(f"  -> URL: {public_url}")

    # Write URLs to a file for easy viewing
    with open("image_urls.csv", "w") as f:
        f.write("filename,url\n")
        for name, url in uploaded_urls.items():
            f.write(f"{name},{url}\n")
    
    print(f"\nFinished uploading {len(image_paths)} images! URLs saved to image_urls.csv")

if __name__ == "__main__":
    upload_images()
