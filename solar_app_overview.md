# Solar App Comprehensive Overview

This document provides a complete, high-level overview of the Solar App system, detailing its objectives, architecture, technologies, and core concepts.

---

## 1. Objectives & Business Mission
Based on the `solarmission.md`, the Solar App serves **JD Force Solar Products Trading**, a business founded during the pandemic to provide accessible, sustainable solar energy solutions across the Philippines. 

**Core Objectives:**
- **Customer Impact:** Provide affordable solar products (streetlights, road lights) to help everyday Filipinos reduce utility costs (e.g., Meralco bills).
- **Community Growth:** Partner with Local Government Units (LGUs) for community distribution projects and provide meaningful local employment.
- **Operational Excellence:** Use an online-first approach combined with physical branches (Cavite and Quiapo, Manila) to scale effectively.

---

## 2. RAG (Retrieval-Augmented Generation) 
### What is RAG?
RAG is an AI framework that improves the quality of Large Language Model (LLM) responses by grounding the model on external sources of knowledge. Instead of relying purely on the LLM's pre-trained memory, RAG retrieves relevant information from a database and provides it to the LLM as context.

### What RAG Means to the Solar App System:
In this system, RAG powers the **SolarAI Chatbot**. 
1. A user asks a question (e.g., "I need a light for my backyard").
2. The system converts this query into a mathematical vector (Embedding).
3. The system searches the Supabase database (via `pgvector`) to find solar products that semantically match the user's intent.
4. The retrieved products are injected into the prompt sent to the LLM.
5. The LLM answers the user's question, strictly recommending only the retrieved products from the inventory.

---

## 3. "Rule-Based" vs. "Multi-Criteria"

- **Rule-Based Filtering:** This refers to traditional, strict `IF/THEN` logic. In the Solar App (e.g., the Browse Page), filtering by "IP65 Waterproof" or "Under 200W Power Output" is rule-based. A product either meets the exact criteria or is completely hidden. It's binary and rigid.
- **Multi-Criteria Semantic Search (RAG):** Instead of strict filters, the AI uses vector similarity. When a user says "I need a bright light for a rainy open road," the system uses multi-criteria vector matching to evaluate wattage, waterproof grading, and intended use-case simultaneously. It returns a *similarity score* (threshold `0.15`) rather than a binary yes/no, yielding much more nuanced and intelligent recommendations.

---

## 4. The Stack & Technologies

### Frontend (React Features)
- **Framework:** React 19 + Vite for fast build times and HMR (Hot Module Replacement).
- **Routing:** `react-router-dom` for handling pages (Landing, Browse, Admin, Staff).
- **State Management:** React Context API (`AuthContext` for user sessions/roles, `ChatContext` for AI conversation state).
- **Styling:** Tailwind CSS, utilizing a custom design token system (`jds-*` colors and typography) for a highly polished UI.
- **Animations:** `framer-motion` for smooth page transitions and list reveals.
- **Icons:** `react-icons` (specifically `hi2` Heroicons) and `lucide-react`.

### Backend (Python FastAPI)
- **Framework:** FastAPI running on Uvicorn.
- **Features:** Asynchronous endpoints, CORS middleware handling, and streaming HTTP responses for the AI chatbot (`StreamingResponse`).

### Database & Storage (Supabase)
- **PostgreSQL:** The core database.
- **pgvector:** A PostgreSQL extension used to store 2048-dimensional embeddings and perform high-speed cosine similarity searches (`match_products` RPC).
- **Storage:** Supabase Storage buckets are used to host the product images uploaded by staff/admins.

---

## 5. Security & Authentication

### Authentication Flow
- **Provider:** Supabase Auth (Email/Password).
- **State Management:** Managed globally via `AuthContext.jsx`. The context listens to Supabase auth state changes (`onAuthStateChange`).

### Role-Based Access Control (RBAC)
- The system divides users into two distinct roles: **Admin** and **Staff**.
- **Role Verification:** Upon login, the system queries the `admins` table. If the user ID isn't found, it queries the `staff` table. 
- **Permissions:** 
  - **Admins** have full CRUD (Create, Read, Update, Delete) access to the product database and staff management.
  - **Staff** have restricted permissions (e.g., they can view orders and update product details, but are restricted from deleting products or editing specific order data).
- **Environment Security:** Sensitive keys (`OPENROUTER_API_KEY`) are kept out of the frontend and safely stored in the backend `.env` file.

---

## 6. The LLM & Embedder Technique

### The Embedder
- **Model:** `nvidia/llama-nemotron-embed-vl-1b-v2:free` (Accessed via OpenRouter).
- **Technique:** Text strings (user queries or product descriptions) are passed to the API, which returns a **2048-dimensional vector** array representing the semantic meaning of the text. 
- **Robustness:** The backend (`embedder.py`) implements a 3-retry mechanism to ensure reliability if the embedding API fails.

### The LLM
- **Model:** `openai/gpt-oss-120b:free` (Accessed via OpenRouter).
- **Prompt Engineering:** The backend (`openrouter_client.py`) uses a highly specific System Prompt that:
  - Defines the AI persona ("SolarAI").
  - Injects business details (Location, Owner, Contact).
  - Enforces strict rules ("NEVER invent products not in the Context").
  - Defines formatting (No markdown tables, no LaTeX math blocks).

### Token Usage
- **Max Tokens:** The generation output is capped at `max_tokens: 800`.
- **Context Window Utilization:** Tokens are consumed by:
  1. The System Prompt (Instructions + Business Details).
  2. The Conversation History (Previous user/assistant messages).
  3. The RAG Context (The formatted string of up to 3 retrieved products).
  4. The user's current prompt.
- **Streaming:** Tokens are streamed back to the frontend chunk-by-chunk in real-time, providing a fast, typewriter-like UX.

---

## 7. Common Criticisms & Clarifications

### The "AI" Buzzword: "Why shouldn't I just consider this a glorified dropdown filter?"
**The premise of this question is factually incorrect.** The system is *not* purely rule-based, and it relies heavily on actual Machine Learning. 

While the frontend *does* offer traditional, rule-based dropdown filters (like clicking "IP65" or "Under 200W") for users who want to manually browse the catalog, the **SolarAI Chatbot** operates on a completely different paradigm: **Retrieval-Augmented Generation (RAG)**.

- **It uses Machine Learning Embeddings:** When a user types a query (e.g., *"I need a bright light for a rainy open road"*), the backend does not use `IF/THEN` rules to parse those words. Instead, it sends the text to an ML embedding model (`nvidia/llama-nemotron-embed-vl-1b-v2`) which converts the sentence into a 2048-dimensional mathematical vector representing its semantic intent.
- **It uses Vector Similarity Search:** It compares this vector against the pre-embedded vectors of all products in the database using PostgreSQL's `pgvector` extension to find the closest semantic matches—evaluating multiple criteria simultaneously based on meaning, not exact keyword matches.
- **It uses Generative AI:** The matched products are then fed into a Large Language Model (`openai/gpt-oss-120b`) which synthesizes the data to generate a conversational, highly personalized recommendation. 

It is a true AI system capable of understanding nuanced natural language, not a glorified dropdown filter.

### Security Flaws: "RLS disabled on `public.suppliers` and bypassing RLS for embeddings"
There are two parts to this, both of which have secure, standard explanations:

- **The `public.suppliers` Table:** During recent development cycles, the decision was made to entirely remove Supplier Management functionality to streamline the application. The `suppliers` table—and any potential security risks associated with its disabled RLS—has been completely deleted from the database. It no longer exists in the system.
- **Bypassing RLS for Database Embeddings:** This is not a security flaw; it is a standard, secure backend architectural pattern. Row Level Security (RLS) is designed to restrict access for *client-side* requests coming from the frontend web browser. However, generating and saving vector embeddings requires reading the entire database and writing massive data structures back to it. This is done via backend Python scripts (`re_embed.py`) running in a trusted server environment. By using the Supabase `SERVICE_ROLE_KEY`, the backend intentionally and securely bypasses RLS to perform administrative operations. As long as this key remains safely hidden in the backend `.env` file and never reaches the frontend, the system is fully secure.

### Lack of Core Functionality: "Why not just use Facebook if there are no online payments?"
The decision to exclude a traditional shopping cart and payment gateway is an intentional business strategy based on JD Force Solar's operational model. 

- **B2B and High-Ticket Nature:** According to the company's mission, a massive part of their business involves partnering with Local Government Units (LGUs) for community distribution projects and moving high volumes (up to 1,000 units daily). Heavy, expensive solar streetlights purchased in bulk are almost never paid for via standard e-commerce credit card gateways. They are paid via bank transfers, corporate checks, or government invoicing.
- **Lead Qualification over Checkout:** A Facebook page is unstructured. Customers messaging a Facebook page often ask the same questions repeatedly (*"What wattage do I need?" "Is this waterproof?"*), which bottlenecks the human staff. The Solar App serves as an **AI-powered Digital Product Guide**. It allows users to self-serve, use the AI to figure out exact technical specifications, and qualify themselves. 
- **The Value Proposition:** When a customer finally walks into the Cavite or Quiapo branch—or contacts the staff for a bulk LGU order—they already know exactly what they need based on the AI's consultation. This drastically reduces the sales cycle time, frees up staff from answering basic queries, and provides a structured, professional catalog that a simple Facebook page cannot offer.

### Maintenance Reality: "Built with a complex stack by students, who will maintain this?"
While the tech stack (React, FastAPI, pgvector, Supabase) may sound complex, it was chosen precisely to *minimize* long-term maintenance overhead. 
- **Managed Infrastructure:** Supabase is a fully managed Backend-as-a-Service. It handles the database, authentication, and vector indexing automatically, entirely eliminating the need for a dedicated database administrator.
- **Industry Standards:** React and FastAPI are ubiquitous, heavily documented industry standards. Because the architecture relies on managed services rather than raw, hand-rolled virtual machines, the infrastructure requires virtually zero DevOps maintenance. If future feature development is needed, any standard full-stack web developer can easily read the documentation and understand the codebase.

### Inventory Syncing: "How does the inventory stay updated without online transactions?"
The system is built as a highly synchronized "Digital Guide" paired with an administrative backend, managed directly by the staff at the physical branches.
- **Manual Dashboard Control:** The application includes a dedicated Admin/Staff dashboard. When physical stock at the Cavite or Quiapo branch runs out, staff simply log into the dashboard and toggle the `in_stock` status for that item.
- **Real-Time Reflection:** Because the frontend and the AI RAG context are directly tied to the Supabase database, toggling an item out of stock immediately updates its visibility on the client side. The AI relies on the exact data returned by the backend `match_products` search, meaning it acts only on the inventory data the staff provides.

### AI Liability: "How can you guarantee the LLM won't give dangerous installation advice?"
The risk of AI hallucination or giving dangerous out-of-scope advice is aggressively mitigated through strict **System Prompt Engineering** combined with the RAG architecture.
- **Strict Scoping:** The backend explicitly instructs the AI with rigid rules: *"SCOPE: Only answer solar-related questions. Redirect anything else politely."* and *"CRITICAL RULES: You MUST ONLY recommend products from the 'Context' section."*
- **Anchoring to Context:** Because the AI is forced to pull its answers directly from the retrieved database context (RAG) rather than "guessing" based on its open-ended training data, its "creativity" is severely restricted. It acts as a catalog assistant, not an electrician. Its purpose is to guide users to the right product based on wattage and use-case, not to provide complex, unverified electrical wiring tutorials.

---

## 8. Frontend React Deep-Dive

This section details the architectural implementation of the React client, explaining how components, routing, security, state management, and real-time AI streams operate.

### 8.1 Setup & Build Configuration
- **Framework & Core:** Built using **React 19** paired with **Vite** for rapid hot module replacement (HMR) and optimized build bundles.
- **Routing Engine:** Configured using [App.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/App.jsx) and `react-router-dom` to support deep linking and dynamic parameter matching:
  - `/product/:id` maps to [ProductInfoPage.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/pages/ProductInfoPage.jsx), fetching the specified product ID directly from the database.
  - Page shell layout logic dynamically toggles the visibility of the [Navbar.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/Navbar.jsx) and [Footer.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/Footer.jsx) based on matching routes (e.g., hiding them on [LoginPage.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/pages/LoginPage.jsx) and suppressing the footer in admin/staff dashboards).
  - The [ChatWidget.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/ChatWidget.jsx) floating bubble is hidden when navigating to the full-screen [ChatboxPage.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/pages/ChatboxPage.jsx) to prevent UI duplication.

### 8.2 Global State & Context Providers
Global states are maintained in React Contexts located in `/src/context` and wrapped inside `App.jsx`:

1. **Authentication Context ([AuthContext.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/context/AuthContext.jsx)):**
   - **Real-Time State Listening:** Connects directly to the Supabase client state change listener via `supabase.auth.onAuthStateChange`.
   - **Role Fetching:** On login, `fetchRole` queries the `admins` table. If the user's ID exists, the role is set to `'admin'`. If not found, it checks the `staff` table, setting the role to `'staff'`.
   - **Performance Optimization:** Value exposure is memoized with `useMemo` to minimize unnecessary re-renders of nested routing branches.
2. **Chat Communication Context ([ChatContext.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/context/ChatContext.jsx)):**
   - Stores global message history and coordinates query states.
   - Provides a `sendMessage(content)` method that updates `initialMessage`. This enables seamless redirection logic: when a user clicks *"Ask SolarAI About This"* on a product description page, the app updates the context, navigates to `/chat`, and automatically submits the query.

### 8.3 Route Guarding & Access Control
- **Security Guard Component:** Guarding is handled via [ProtectedRoute.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/ProtectedRoute.jsx).
- **Control Rules:**
  - Evaluates authorization status based on context loading state. If verification is pending, it displays a loading screen.
  - Unauthenticated users are redirected to `/login`.
  - Authenticated users attempting to view unauthorized routes (e.g., staff attempting to access `/admin`) are redirected to their appropriate landing dashboards.

### 8.4 Database Client Integration & CRUD Operations
- The client directly imports the Supabase JS SDK client initialized in [supabaseClient.js](file:///home/ram/Desktop/School/Solar_App/frontend/src/lib/supabaseClient.js).
- **Client-Side Fetching:** Product listings in [BrowsePage.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/pages/BrowsePage.jsx) and individual specifications in [ProductInfoPage.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/pages/ProductInfoPage.jsx) are retrieved directly from the database using standard Supabase builder syntax: `supabase.from('products').select('*')`.
- **Administrative Portal Screen Swapping:** Both [AdminPage.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/pages/AdminPage.jsx) and [StaffPage.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/pages/StaffPage.jsx) use local state toggles to dynamically mount different sub-screens in a sidebar layout:
  - **Dashboard Metrics:** Renders [DashboardScreen.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/admin/DashboardScreen.jsx) to display stock statistics and order volume.
  - **Inventory List:** [ProductsScreen.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/admin/ProductsScreen.jsx) renders a dense table that supports inline editing, stock toggle switches, filtering by wattage/categories, and delete actions.
  - **Inventory Ingestion:** [AddProductScreen.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/admin/AddProductScreen.jsx) provides structured validation forms to insert new rows.
  - **Order Log Tracking:** [OrdersScreen.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/admin/OrdersScreen.jsx) manages customer requests.
  - **User & Role Administration:** Exclusive to admins, [UsersScreen.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/admin/UsersScreen.jsx) manages staff logins and credentials.

### 8.5 Streaming AI Integration & UI Typewriter Effect
The AI interfaces ([ChatWidget.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/components/ChatWidget.jsx) and [ChatboxPage.jsx](file:///home/ram/Desktop/School/Solar_App/frontend/src/pages/ChatboxPage.jsx)) leverage real-time streaming endpoints from the Python backend `/api/chat`:
1. **Readable Streams API:** The client sends queries to the FastAPI endpoint and retrieves a stream reader via `response.body.getReader()`.
2. **Asynchronous Processing Loop:** An async `while(!done)` loop reads binary packets, translates them into text strings via `TextDecoder`, and appends them chunk-by-chunk to the message list state. This produces a smooth typewriter UX.
3. **Rich Rendering Override:** Messages are processed using `ReactMarkdown`. To ensure that AI-recommended products do not cause full browser reloads, standard HTML anchors (`a`) are intercepted and converted into client-side dynamic React Router `Link` components.

### 8.6 Designing Systems & Tailwind Customizations
- **Styling Architecture:** Extends the Tailwind layout system via [tailwind.config.js](file:///home/ram/Desktop/School/Solar_App/frontend/tailwind.config.js) to specify Material Design 3-inspired **JD Solar Design System (JDS)** tokens:
  - Custom color palettes prefixed with `jds-` (e.g., `jds-surface`, `jds-primary`, and surface container variations).
  - Explicit typographic sizing presets (`headline-xl`, `headline-lg`, `label-md`, `label-sm`) matching the design standards.
- **Custom Global Styles:** Extended in [index.css](file:///home/ram/Desktop/School/Solar_App/frontend/src/index.css) to support rich visual enhancements, including a radial sunburst background (`.sunlight-bg`), card elevation levels (`.card-shadow`), glass badges (`.glass-badge`), and noise-enhanced SVG grain overlays (`.grain-texture`).
- **Smooth Animations:** Integrated with `framer-motion` inside pages and interactive widgets to provide spring animations on bento grids, menu items, and chat popup toggles (`AnimatePresence` elements).
