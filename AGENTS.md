# Project Conventions & Behavioral Rules: JD Solar Platform

## 1. Typography & Content Tone
- **Strict Emoji Prohibition**: Never include emojis (e.g. ☀️, ⚡, 🤖, 💬) in UI copy, assistant responses, modal descriptions, or system messages. Use clean text or SVG/Lucide icons for visual affordance.
- **Tone**: Professional, technical, and industrial. Avoid hype-driven e-commerce gimmicks (e.g., artificial urgency like "48-Hour Stock Hold" or "Free Showroom Demo").

## 2. Terminology & Action Verbs
- Use **"Inquire this"** or **"Inquire Now"** instead of "Add to Quote" or "Add to Cart" on product detail views.
- Treat solar products as consultative industrial equipment requiring technical assessment and customized quotation.

## 3. Assistant & Chatbot Experience (JD Solar Assistant)
- **Simulated AI Streaming**: When generating responses in client-side decision engines (`solarBotEngine.js`, `solarDiagnosticEngine.js`), do not render responses instantaneously. Introduce realistic pacing and stream output sentence-by-sentence or word chunk by chunk to provide an organic conversational feel.
- **Rule-Based Decision Support**: Structure interactive surveys around the 5 core customer pillars:
  1. Product Specifications
  2. Pricing & Budgeting
  3. Stock Availability
  4. Installation Requirements
  5. Warranty & Post-sale Support
