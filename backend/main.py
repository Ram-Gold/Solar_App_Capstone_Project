from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase_client import get_supabase_client
from openrouter_client import stream_recommendation
from embedder import get_embedding
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Solar App API")

# Models for Chat
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Solar App API"}

@app.get("/api/products")
def get_products():
    """Fetch all solar products for the browse page."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not configured")
        
    try:
        response = supabase.table("products").select("id,name,type,watt,price,efficiency,battery,measurements,image_url,description,product_overview,product_details,sales,stock").execute()
        return {"products": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Streaming chat endpoint using Semantic Search (RAG)."""
    supabase = get_supabase_client()
    
    products = []
    db_error = False
    
    # 1. Semantic Search with 3 Retries
    for attempt in range(3):
        try:
            # We turn the user's message into a vector
            query_vector = get_embedding(request.message)
            
            # Call the RPC function we created in Supabase
            search_res = supabase.rpc("match_products", {
                "query_embedding": query_vector,
                "match_threshold": 0.15, # Slightly lowered for better recall
                "match_count": 3
            }).execute()
            
            products = search_res.data
            db_error = False
            print(f"Search success on attempt {attempt + 1}. Products found: {len(products)}")
            break # Success, exit loop
            
        except Exception as e:
            print(f"Search attempt {attempt + 1} failed: {e}")
            db_error = True
            if attempt == 2:
                print("All search attempts failed after 3 tries.")

    # 2. Convert history to list of dicts
    history = [{"role": m.role, "content": m.content} for m in request.history]

    # 3. Stream response from OpenRouter
    return StreamingResponse(
        stream_recommendation(request.message, products, history, db_error=db_error),
        media_type="text/event-stream"
    )
