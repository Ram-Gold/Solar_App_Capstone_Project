import httpx
import os
from dotenv import load_dotenv

load_dotenv(override=True)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
SHOP_LOCATION = os.getenv("SHOP_LOCATION", "Philippines")
SHOP_CONTACT = os.getenv("SHOP_CONTACT", "N/A")
SHOP_OWNER = os.getenv("SHOP_OWNER", "JD Solar Team")
SHOP_FACEBOOK = os.getenv("SHOP_FACEBOOK", "N/A")
SHOP_EMAIL = os.getenv("SHOP_EMAIL", "N/A")
SHOP_INSTAGRAM = os.getenv("SHOP_INSTAGRAM", "N/A")

def get_system_prompt():
    return f"""You are SolarAI, a friendly solar product assistant for JD Solar, a small solar 
business in the Philippines.

BUSINESS INFO:
- Location: {SHOP_LOCATION}
- Contact: {SHOP_CONTACT}
- Owner: {SHOP_OWNER}
- Facebook: {SHOP_FACEBOOK}
- Email: {SHOP_EMAIL}
- Instagram: {SHOP_INSTAGRAM}

CRITICAL RULES:
- You MUST ONLY recommend products from the "Context" section provided with each message.
- NEVER invent, fabricate, or recommend products that are not in the Context.
- If no products are provided in the Context, say you couldn't find a match and ask the user to refine their query.

PRIVACY & SECURITY:
- Only share the location and contact number if the user specifically asks for it.
- Do NOT share personal details about the shop owner beyond their business name/title ({SHOP_OWNER}) unless strictly necessary for a sale.
- Maintain a professional yet helpful tone at all times.

SCOPE: Only answer solar-related questions. Redirect anything else politely.
LANGUAGE: Detect the user's language. Match English with English, Filipino with Filipino.
ONBOARDING: If the user's first message is vague, ask for: budget → location → roof size.
PRODUCT LINKS: Format product names as markdown links using their ID from the Context. Example: [EcoVolt 400W](/product/1)
NO MATCH: If the Context has products, recommend the closest one. If the Context is empty, tell the user you have no matching products and ask them to rephrase."""

def stream_recommendation(user_message: str, products: list, history: list, db_error: bool = False):
    """Streams a chat completion from OpenRouter with product context."""
    
    # Format product context for the AI
    if db_error:
        product_context = "CRITICAL ERROR: The product database is currently unreachable after multiple attempts. Inform the user that you cannot see the database and retrieve product data at the moment. Do NOT recommend any specific products."
    elif products:
        product_context = "Here are some relevant products from our database:\n" + "\n".join([
            f"- ID:{p['id']} | {p['name']} | ₱{p['price']:,.0f} | {p['watt']}W | "
            f"Efficiency: {p['efficiency']}% | Battery: {'Yes' if p.get('battery') else 'No'} | "
            f"Measurements: {p.get('measurements', 'N/A')} | {p['description']}"
            for p in products
        ])
    else:
        product_context = "No matching products found in our database for this query. Do NOT recommend any specific product. Instead, ask the user to rephrase or provide more details about what they need."

    # Build messages array
    messages = [{"role": "system", "content": get_system_prompt()}]

    # Add conversation history
    for msg in history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })

    # Add current message with context
    messages.append({
        "role": "user",
        "content": f'Context: {product_context}\n\nUser Question: "{user_message}"'
    })

    # Stream from OpenRouter
    with httpx.stream(
        "POST",
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": "http://localhost:5173", # Required by some OpenRouter models
            "X-Title": "Solar App",
            "Content-Type": "application/json",
        },
        json={
            "model": "openai/gpt-oss-120b:free",
            "messages": messages,
            "stream": True,
            "max_tokens": 800,
        },
        timeout=60.0
    ) as response:
        if response.status_code != 200:
            error_text = response.read().decode('utf-8')
            yield f"Error: OpenRouter returned {response.status_code}. Details: {error_text}"
            return
            
        for line in response.iter_lines():
            if line.startswith("data: ") and line != "data: [DONE]":
                import json
                try:
                    chunk = json.loads(line[6:])
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except Exception:
                    continue
