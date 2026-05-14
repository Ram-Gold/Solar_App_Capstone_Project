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
        response = supabase.table("products").select("id,name,type,watt,price,efficiency,battery,roof_size,image_url,description").execute()
        return {"products": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Streaming chat endpoint using Semantic Search (RAG)."""
    supabase = get_supabase_client()
    
    # 1. Semantic Search
    # We turn the user's message into a vector and find matching products in Supabase
    try:
        query_vector = get_embedding(request.message)
        
        # Call the RPC function we created in Supabase
        search_res = supabase.rpc("match_products", {
            "query_embedding": query_vector,
            "match_threshold": 0.2,
            "match_count": 3
        }).execute()
        
        products = search_res.data
    except Exception as e:
        print(f"Search failed: {e}. Falling back to general knowledge.")
        products = []

    # 2. Convert history to list of dicts
    history = [{"role": m.role, "content": m.content} for m in request.history]

    # 3. Stream response from OpenRouter
    return StreamingResponse(
        stream_recommendation(request.message, products, history),
        media_type="text/event-stream"
    )
