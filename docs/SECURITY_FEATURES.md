# JD Solar Platform: Application Security Features & Architecture Guide

**Document Metadata:**
* **System:** JD Force Solar Products Trading Platform
* **Database Engine:** Supabase Managed PostgreSQL 17 (`postgres_engine: 17`, `ap-northeast-1`)
* **Hosting / Serverless Runtime:** Vercel (`vercel.json` + `/api/*` serverless functions)
* **Frontend:** React + Vite + React Router (`frontend/src/`)
* **Scope:** Full-stack security features including built-in Supabase security controls, PostgreSQL Row Level Security (RLS), hardened `SECURITY DEFINER` RPCs, serverless API protections, and frontend application best practices.

---

## 1. Executive Summary

The JD Solar platform implements a defense-in-depth security model across four layers:

1. **Supabase Auth & Identity Layer:** Native `auth.users` identity management, Bcrypt password hashing, recovery OTP/token verification, and isolated client sessions.
2. **PostgreSQL Engine Layer:** Row Level Security (RLS) enabled across all 9 `public` tables, role-resolving helper functions, `SECURITY DEFINER` stored procedures with `SET search_path` hardening, `FOR UPDATE` row-level locking, and UUID v4 tokens.
3. **Serverless API Layer (`/api/*`):** Server-side `SUPABASE_SERVICE_ROLE_KEY` isolation, anti-account-enumeration responses, server-controlled reset link origins, and HTML-escaped email templates.
4. **React Frontend Layer:** Role-based route guards (`ProtectedRoute.jsx`), centralized input sanitization (`sanitize.js`), cross-tab 15-minute inactivity session watchdog (`AuthContext.jsx`), URL token scrubbing, deterministic diagnostic engines, and zero online payment exposure.

---

## 2. Built-In Supabase Security Features

### 2.1 Supabase Auth (`auth.users`) & Password Cryptography
* **Managed Identity Store:** Staff, administrators, and activated customers authenticate against Supabase Auth (`auth.users`) rather than custom plaintext or unisolated credential tables.
* **Bcrypt Password Hashing:** Passwords set or updated through Supabase Auth and database RPCs (`admin_set_user_password`, `change_own_password`, `activate_customer_account`) are hashed using PostgreSQL `pgcrypto` Blowfish Bcrypt with cost factor 10:
  ```sql
  extensions.crypt(p_new_password, extensions.gen_salt('bf', 10))
  ```
* **Password Recovery Flow:** Password resets use Supabase Auth's native recovery tokens (`admin.auth.admin.generateLink({ type: 'recovery' })` on the server and `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` + `supabase.auth.updateUser({ password })` on the client), enforcing an 8-character minimum password length.
* **Session & JWT Management:** Authenticated staff, admin, and customer sessions receive signed Supabase JWTs. On sign-out or inactivity timeout, `supabase.auth.signOut()` invalidates the active session.

### 2.2 Row Level Security (RLS) Across All `public` Tables
Every table in the `public` schema has Row Level Security enabled (`rowsecurity = true`):
* `public.admins`
* `public.staff`
* `public.customers`
* `public.customer_purchases`
* `public.warranty_claims`
* `public.orders`
* `public.products`
* `public.categories`
* `public.quote_tickets`

Key RLS policy patterns enforced in the live database:
* **Role-Based Table Policies (`admins`, `staff`, `orders`, `products`, `categories`):**
  * `admins`: `authenticated` users can only read/insert/update/delete admin records when `get_user_role() = 'admin'`, or read their own row (`auth.uid() = id`).
  * `staff`: Admins (`get_user_role() = 'admin'`) have full management access; staff members can only read, update, or delete their own row (`auth.uid() = id`).
  * `orders`: Restricted to `authenticated` users where `get_user_role() = ANY (ARRAY['admin', 'staff'])` for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
  * `products` & `categories`: Public `SELECT` access for the storefront catalog; `INSERT` and `UPDATE` restricted to `staff` or `admin` via `get_user_role()`; `DELETE` restricted strictly to `admin`.
* **Token-Mediated Customer & Inquiry Access (`customers`, `customer_purchases`, `warranty_claims`, `quote_tickets`):**
  * Authenticated `staff` and `admin` roles have management access.
  * Anonymous/customer portal lookups and warranty claim submissions are mediated through `SECURITY DEFINER` RPCs (`get_customer_portal_data`, `submit_warranty_claim`) keyed by cryptographic UUID `access_token` values.

### 2.3 Key Segregation (`VITE_SUPABASE_PUBLISHABLE_KEY` vs. `SUPABASE_SERVICE_ROLE_KEY`)
* **Frontend Client (`frontend/src/lib/supabaseClient.js`):** Uses only the public `VITE_SUPABASE_PUBLISHABLE_KEY` (anon/publishable key), which is subject to all PostgreSQL RLS policies and RPC permissions.
* **Serverless API (`frontend/api/forgot-password.js`):** Uses `process.env.SUPABASE_SERVICE_ROLE_KEY` strictly on the server inside Vercel serverless functions (`persistSession: false`, `autoRefreshToken: false`). The service role key is never bundled into Vite client assets.

### 2.4 Supabase Storage Buckets & Object Policies
* **Buckets:** `product-images` and `warranty-evidence`.
* **Object RLS Policies (`storage.objects`):**
  * `product-images`: Public `SELECT` for catalog display; `Authenticated delete` and `Authenticated update` restricted to `authenticated` users.
  * `warranty-evidence`: Public `SELECT` and `INSERT` scoped strictly by `bucket_id = 'warranty-evidence'`.

### 2.5 Hardened `SECURITY DEFINER` Stored Procedures
Critical multi-table and auth-linked operations run inside PostgreSQL `SECURITY DEFINER` functions with explicit `SET search_path` configurations to prevent search-path shadowing attacks:

| Function | `search_path` Setting | Security Purpose |
| :--- | :--- | :--- |
| `public.get_user_role()` | `'public, auth'` | Resolves the caller's role (`admin`, `staff`, or `customer`) from `auth.uid()` inside RLS policies and RPCs. |
| `public.admin_set_user_password(uuid, text)` | `'public, auth, extensions'` | Verifies `auth.uid()` is not null and `get_user_role() = 'admin'`, enforces 8+ char password, and updates `auth.users` Bcrypt hash for staff/admins. |
| `public.change_own_password(text, text)` | `'public, auth, extensions'` | Verifies `auth.uid()` belongs to `admins` or `staff`, checks current password via `extensions.crypt()`, prevents reusing the current password, and updates `auth.users`. |
| `public.activate_customer_account(...)` | `'public, auth'` / `'public, auth, extensions'` | Links an `auth.users` account to `public.customers` via `access_token`; blocks hijacking already-activated accounts and blocks linking `admins` or `staff` IDs to customer records. |
| `public.get_customer_portal_data(uuid)` | `'public'` | Validates customer `access_token` (UUID) and returns only that customer's profile, purchases, and warranty claims. |
| `public.submit_warranty_claim(...)` | `'public'` | Verifies `access_token` ownership and confirms `customer_purchases.customer_id` matches the token's customer before inserting into `warranty_claims`. |
| `public.reserve_product_stock(...)` | `''` | Uses `SELECT ... FOR UPDATE` row-level locking on `public.products` to prevent race conditions and negative stock during concurrent reservations. |
| `public.fulfill_reservation_sale(...)` | `''` | Uses `SELECT ... FOR UPDATE` on `quote_tickets` and `products` for atomic stock deduction and ticket closure. |
| `public.release_product_reservation(bigint)` | `''` | Uses `SELECT ... FOR UPDATE` on `products` to safely restore reserved stock counts. |

---

## 3. Hybrid UUID v4 vs. Sequential ID Architecture

The database separates public catalog identifiers from private customer and transaction identifiers:

* **Public Catalog Entities (Sequential `bigint`):**
  * `products.id` and `categories.id` use sequential integers because catalog listings are public, SEO-friendly, and benefit from compact B-tree indexing.
* **Private Customer & Transaction Entities (`UUID` via `gen_random_uuid()`):**
  * `customers.id`, `customers.access_token`, `customer_purchases.id`, `warranty_claims.id`, `admins.id`, `staff.id`, and `orders.id` use 128-bit UUIDs.
  * **IDOR & Enumeration Defense:** Because `customers.access_token` is a cryptographically random UUID v4 (122 random bits, roughly 5.3 x 10^36 combinations), attackers cannot iterate `?token=101`, `?token=102` to access other customers' warranty portals or enumerate total customer volume.

---

## 4. Serverless API Security (`api/` & `frontend/api/`)

### 4.1 Anti-Account-Enumeration (`/api/forgot-password.js`)
* Always returns `{ success: true }` with HTTP `200` for valid-format emails, regardless of whether the email exists in `auth.users`, encountered a generation error, or failed SMTP delivery.
* Never returns the raw `hashed_token` in the HTTP response; the token is sent exclusively via SMTP email.
* Uses `POST` method enforcement (`405` for non-POST requests) and validates email length (<= 254 chars) and format before processing.

### 4.2 Server-Controlled Link Origin
* Password reset links (`${cleanOrigin}/reset-password?token_hash=...&type=recovery`) are constructed strictly from server-side environment variables (`PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or fallback `https://jdforcesolar.com`).
* Request headers (`Host`, `Origin`, `X-Forwarded-Host`) are never trusted for link generation, preventing Host Header Injection / phishing link redirection.

### 4.3 Email HTML Escaping (`forgot-password.js` & `send-confirmation-email.js`)
* All dynamic values interpolated into HTML email templates (customer names, emails, phone numbers, branch names, product names, serial numbers, URLs) pass through `escapeHtml()`, encoding `&`, `<`, `>`, `"`, and `'` to prevent HTML/XSS injection in email clients.

---

## 5. Frontend & Application-Level Best Practices

### 5.1 Isolated Auth Client (`frontend/src/lib/supabaseClient.js`)
* `createIsolatedAuthClient()` creates a non-persistent Supabase client (`persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`).
* Used during admin/staff provisioning of customer accounts (`provisionCustomerAuthAccount`) and current-password verification (`changePlatformUserPassword`, `setCustomerPassword`) so secondary auth calls never overwrite or corrupt the logged-in user's active session in `localStorage`.

### 5.2 Role-Based Access Control & Route Guarding (`ProtectedRoute.jsx` & `AuthContext.jsx`)
* **Database-Backed Role Resolution:** `AuthContext.jsx` resolves user roles by querying `admins`, `staff`, and `customers` in Supabase rather than trusting client-side claims alone.
* **Protected Routes (`frontend/src/App.jsx`):**
  * `/admin/*` restricted to `['admin']`.
  * `/staff/*` restricted to `['staff']`.
  * `/portal` restricted to `['customer', 'admin', 'staff']`.
* **QR / URL Token Isolation (`ProtectedRoute.jsx`):** When navigating to `/portal?token=...` or `/portal?uuid=...`, if the visitor is unauthenticated, logged in as `staff`/`admin`, or logged in as a different customer, `ProtectedRoute` redirects to `/login` with the query string preserved, preventing session contamination and cross-customer token viewing.

### 5.3 Cross-Tab 15-Minute Inactivity Watchdog (`AuthContext.jsx`)
* **Idle Timeout (`INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000`):** Monitors `mousemove`, `mousedown`, `keydown`, `scroll`, and `touchstart` (throttled to 10-second intervals) using `jd_last_activity_timestamp` in `localStorage`.
* **Cross-Tab Synchronization:** Listens to `window` `storage` events so activity in any open tab resets the timer across all tabs.
* **Sleep / Tab Wake-Up Check:** Listens to `document` `visibilitychange` events and immediately signs out if the 15-minute threshold elapsed while the device was asleep or the tab was backgrounded.
* **Clean Token Purge & Audit Redirect:** Clears `jd_customer_token` and `jd_last_activity_timestamp`, calls `supabase.auth.signOut()`, preserves non-sensitive login email hints (`jd_remembered_email`), and redirects to `/login?reason=timeout`.

### 5.4 URL Token Scrubbing & Reset Cooldown (`ResetPasswordPage.jsx`, `ForgotPasswordPage.jsx`)
* **History Scrubbing:** `ResetPasswordPage.jsx` captures `token_hash` / `token` into React state on mount and immediately strips query parameters from the address bar via `window.history.replaceState(null, '', '/reset-password')`, preventing token leakage via browser history or `Referer` headers.
* **Rate-Limiting UX:** `ForgotPasswordPage.jsx` enforces a 60-second client-side resend cooldown (`RESEND_COOLDOWN_SECONDS = 60`).

### 5.5 Centralized Input Sanitization (`frontend/src/lib/sanitize.js`)
User inputs across consultation wizards, profile forms, warranty claims, and inventory screens pass through deterministic sanitizers before state storage or database submission:
* **`sanitizeText`:** Strips invisible Unicode zero-width and control characters (`\u200B-\u200D`, `\uFEFF`, `\u0000-\u001F`, `\u007F-\u009F`), removes `<script>...</script>` and `<style>...</style>` blocks, strips HTML/XML tags, neutralizes `javascript:`, `data:`, `vbscript:`, and `on*=` attributes, normalizes whitespace, and enforces `maxLength` (default `1000`).
* **`sanitizePhone` & `isValidPhone`:** Strips non-digits and enforces 11-digit Philippine mobile format (`09XXXXXXXXX`).
* **`sanitizeEmail` & `isValidEmail`:** Trims, lowercases, strips whitespace and injection characters (`<>"'\;`), caps at 254 characters, and validates email structure.
* **`sanitizeSerialNumber`:** Restricts characters to uppercase alphanumeric, hyphens, and underscores (`[^A-Z0-9-_]`), capped at 64 characters.
* **`sanitizeNumber`:** Parses strictly, falls back safely on `NaN`, and clamps within `[min, max]`.

### 5.6 Account Deletion Safeguards (`ProfileScreen.jsx` & `customerService.js`)
* **Last-Admin Protection:** `deletePlatformUser()` checks the count of `public.admins` before deleting an admin record and blocks deletion if `count <= 1`, preventing administrative lockout.

### 5.7 Deterministic AI Assistant & Electrical Safety Boundaries (`solarBotEngine.js`, `solarDiagnosticEngine.js`)
* **Rule-Based Decision Trees:** Both the FAQ assistant and diagnostic troubleshooting engine use deterministic local logic rather than open-ended LLM generation, eliminating prompt injection and ungrounded data-leakage risks.
* **Electrical Safety Boundaries:** High-voltage AC wiring and hazardous hardware modifications are excluded and routed to licensed technicians or showroom staff.

### 5.8 Zero Online Payment Exposure & Data Privacy Compliance
* **No Online Payment Processing:** The platform operates on an Online-to-Offline (O2O) consultative reservation model with zero credit card, debit card, or e-wallet API integration, eliminating PCI-DSS scope and payment-interception risk.
* **RA 10173 Consent & Warranty Gates (`QuoteModal.jsx`, `TermsOfServiceModal.jsx`, `WarrantyTermsModal.jsx`):** Requires explicit checkbox consent under the Philippine Data Privacy Act of 2012 before inquiry submission and mandatory warranty terms acknowledgment on first customer portal access.

---

## 6. Live Supabase Security Advisor Observations

Running Supabase's built-in Security Advisor (`get_advisors`) against the live `solar-app` project surfaces the following items for ongoing hardening:

1. **Leaked Password Protection (`auth_leaked_password_protection`):** Currently disabled in Supabase Auth settings; enabling HaveIBeenPwned password checks in the Supabase Dashboard is recommended.
2. **Vector Extension Schema (`extension_in_public`):** The `vector` (`pgvector`) extension is installed in `public`; moving it to a dedicated `extensions` schema is recommended by Supabase linter `0014_extension_in_public`.
3. **Publicly Executable `SECURITY DEFINER` Functions (`0028` / `0029`):** Functions such as `reserve_product_stock`, `fulfill_reservation_sale`, and `release_product_reservation` are currently granted `EXECUTE` to `anon` and `authenticated`; restricting `EXECUTE` on internal staff/admin stock functions to `authenticated` (and checking `get_user_role()` inside them) is recommended.

---

## 7. Security Checklist for Developers

1. **Sanitize All Inputs:** Use helpers from `frontend/src/lib/sanitize.js` before sending user data to Supabase, and avoid `dangerouslySetInnerHTML`.
2. **Never Expose `SUPABASE_SERVICE_ROLE_KEY`:** Keep it strictly in server-side Vercel environment variables (`api/`, `frontend/api/`), never in `VITE_*` variables.
3. **Enable RLS on Every New Table:** Run `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;` and define explicit policies for `anon` and `authenticated`.
4. **Harden New `SECURITY DEFINER` Functions:** Always set `SET search_path = ''` (or explicit trusted schemas) and validate caller identity/role via `auth.uid()` and `public.get_user_role()`.
5. **Use UUIDs for Private Records:** Never expose sequential integer IDs for customer accounts, purchases, or private tokens.
6. **Verify Against Live Supabase:** Always inspect live tables, policies, and RPCs via `supabase_mcp` rather than assuming local SQL files in `docs/database/migrations/` reflect production state.
