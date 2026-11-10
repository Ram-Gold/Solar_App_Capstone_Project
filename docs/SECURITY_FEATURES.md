# JD Solar Platform: Application Security Features & Architecture Guide

**Document Metadata:**
* **System:** JD Force Solar Products Trading Platform
* **Target Audience:** Junior Software Developers, Technical Reviewers, and Security Auditors
* **Format:** Bullet-point reference guide with conceptual breakdowns and code examples
* **Scope:** Full-stack security features including Supabase PostgreSQL database policies, UUID vs. Sequential ID implementation, PostgreSQL vs. MySQL security comparison, and frontend application defense mechanisms.

---

## 1. Executive Summary

The JD Solar platform employs a defense-in-depth architecture. Security is not handled at a single checkpoint (such as a frontend route); instead, security controls are layered across the user interface, client-side routing, API communication, and the database engine.

Key principles enforced across the application:
* **Principle of Least Privilege:** Users and frontend clients receive only the permissions strictly required to perform their role.
* **Database Engine Enforcement:** Critical authorization rules are enforced inside the database engine (PostgreSQL Row Level Security and stored procedures), so a compromised or modified frontend cannot bypass security controls.
* **Separation of Concerns:** Public catalog data is separated from private customer purchase and warranty data.
* **Zero Payment Exposure:** The platform operates on an Online-to-Offline (O2O) consultative workflow, eliminating credit card processing, digital wallet storage, and payment gateway vulnerabilities.

---

## 2. Supabase & PostgreSQL Database Security Features

The primary database is managed through Supabase and runs on PostgreSQL 15+. Below are the database security features built into the system:

* **Engine-Level Row Level Security (RLS):**
  * Tables containing sensitive information enforce RLS at the database engine level.
  * Even if a malicious user uses the public browser console to query `supabase.from('customer_passwords').select('*')`, PostgreSQL rejects the query immediately with an access denied error.
  * Policy example on `customer_passwords`:
    * Public anonymous users have direct `SELECT` access set to `false`.
    * Only internal `authenticated` service accounts or verified stored procedures can query credential rows.

* **Hardened Stored Procedures (`SECURITY DEFINER` with `SET search_path = ''`):**
  * Critical workflows (such as logging in, setting customer passwords, deleting accounts, and purging stale records) are executed through PostgreSQL functions declared with `SECURITY DEFINER`.
  * **What `SECURITY DEFINER` means:** The function executes with the permissions of the database creator, allowing an unauthenticated visitor to execute a safe, sandboxed routine without giving them direct table access.
  * **Search Path Hardening (`SET search_path = ''`):** In PostgreSQL, if `search_path` is left unconfigured, a malicious actor might create a malicious table or function in a public schema that shadows system functions. Setting `search_path = ''` forces every table reference inside the function to be fully qualified (e.g., `public.customers`), preventing search-path hijacking attacks.

* **Cryptographic Password Hashing (`pgcrypto` with Bcrypt):**
  * Passwords are never stored in plaintext anywhere in the database or server logs.
  * Hashing is executed inside the PostgreSQL database engine using the `pgcrypto` extension:
    ```sql
    v_new_hash := crypt(p_password, gen_salt('bf', 10));
    ```
  * Blowfish (`bf`) with an iteration cost of 10 generates a salted, non-reversible cryptographic hash.
  * Password verification uses constant-time comparison via `crypt()` to defend against timing attacks.

* **Two-Tier Key Segregation (Anon Public Key vs. Service Role Key):**
  * The frontend client only has access to `VITE_SUPABASE_ANON_KEY`. This public key is subject to all RLS policies and can only perform public or strictly owned operations.
  * The administrative `SERVICE_ROLE_KEY` bypasses RLS and is used exclusively in secure, server-side environments (such as internal background ingestion scripts). It is never bundled into frontend JavaScript files or committed to public version control.

* **Account Deletion Safeguards (Last-Admin Protection):**
  * In the stored procedure `delete_platform_user`, the system runs a count check on administrators before executing a deletion:
    ```sql
    IF v_is_target_admin THEN
        SELECT COUNT(*) INTO v_admin_count FROM public.admins;
        IF v_admin_count <= 1 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Cannot delete the last remaining administrator account.');
        END IF;
    END IF;
    ```
  * This prevents administrative lockout if an admin accidentally triggers a self-deletion or batch deletion.

* **Automated Data Hygiene & Retention Purging:**
  * Stored procedure `purge_inactive_quote_tickets()` automatically deletes obsolete quote tickets (completed or cancelled tickets older than 7 days, and stale pending tickets older than 14 days).
  * This limits data liability by automatically pruning unused customer contact information, preventing unnecessary data exposure in case of an audit or incident.

* **Relational Referential Integrity & Cascade Rules:**
  * Strict foreign key constraints (`ON DELETE CASCADE` and `ON DELETE RESTRICT`) prevent orphaned data across `customers`, `customer_purchases`, `customer_passwords`, and `warranty_claims`.
  * Modifying or deleting records preserves a mathematically consistent relational state.

---

## 3. UUID vs. Sequential ID: Security & Privacy Breakdown

A fundamental architectural decision in the JD Solar database is the hybrid ID model: public catalog products use sequential integers (`products.id`), while user accounts, purchases, and warranty records use UUIDs (`customers.id`, `customer_purchases.id`, `access_token`).

### 3.1 The Vulnerability of Sequential Numeric IDs (`id: 1, 2, 3...`)

* **What is an Insecure Direct Object Reference (IDOR)?**
  * If a customer portal URL looks like `solarapp.com/portal?customer_id=104`, any visitor can change the number to `?customer_id=105` to view the next customer's purchase history, full name, phone number, and address.
* **Predictable Enumeration & Business Intelligence Leakage:**
  * Sequential IDs allow competitors or scraping bots to know exact business numbers. For example, if a quote ticket is created with `ticket_id: 420` on Monday and `ticket_id: 450` on Tuesday, a competitor knows the company received exactly 30 inquiries in 24 hours.
* **Automated Scraping Vulnerability:**
  * Attackers can write a simple loop from `1` to `10000` to harvest the entire database via API endpoints.

### 3.2 Why UUID v4 (`gen_random_uuid()`) is Secure

* **Cryptographic Randomness:**
  * A Version 4 Universally Unique Identifier (UUID) is a 128-bit value containing 122 bits of cryptographically secure random data (e.g., `550e8400-e29b-41d4-a716-446655440000`).
* **Astronomical Search Space (Unbrute-forceable):**
  * The number of possible UUIDs is 2^122, or roughly 5.3 x 10^36 combinations.
  * Even if an attacker generates 1 billion random UUID requests per second for 100 years, the probability of guessing a single valid customer token is effectively zero.
* **No Information Leakage:**
  * UUIDs reveal nothing about the order of creation, total customer count, or registration timestamps.

### 3.3 The Hybrid Architecture Used in JD Solar

* **Catalog Entities (Sequential Integer/BigInt):**
  * `products.id` and `categories.id` use numeric IDs.
  * Catalog items are fully public, intended for search engine indexing, and do not contain private user information. Sequential integers maximize database B-tree indexing speed and memory cache efficiency.
* **Private Customer & Transaction Entities (UUID):**
  * `customers.id`, `customers.access_token`, `customer_passwords.id`, `customer_purchases.id`, and `warranty_claims.id` use native PostgreSQL `UUID` values generated by `gen_random_uuid()`.
  * A customer accessing their warranty dashboard uses their dedicated `access_token` (UUID). Even without a password, an unauthorized third party cannot guess or iterate into their private records.

---

## 4. PostgreSQL Security vs. MySQL Security: Junior Developer Comparison

Both PostgreSQL and MySQL are relational database systems, but their approach to engine-level security and permission controls differs significantly.

### 4.1 Side-by-Side Comparison

| Security Dimension | PostgreSQL 15+ (Used in JD Solar) | MySQL (Standard 8.0) | Practical Impact for Junior Developers |
| :--- | :--- | :--- | :--- |
| **Row Level Security (RLS)** | Native engine-level feature. Policies are checked on every `SELECT`, `UPDATE`, `DELETE`. | No native RLS in standard editions. Requires manual application `WHERE` clauses or complex views. | In PostgreSQL, forgotten query filters in application code will not leak other users' data because the database engine enforces isolation. |
| **Native UUID Generation** | First-class `UUID` type with `gen_random_uuid()`. Stored efficiently as 16 bytes. | Stored as text `CHAR(36)` or manual `BINARY(16)` with helper functions. | PostgreSQL optimizes storage and indexing natively, eliminating custom conversion boilerplate. |
| **In-Database Cryptography** | Native `pgcrypto` module supports standard Bcrypt, HMAC, and asymmetric encryption. | Native `SHA2()` and `AES_ENCRYPT()`. Bcrypt hashing typically requires application runtime (Node.js/PHP). | PostgreSQL can verify and salt passwords directly within stored procedures without sending credentials across multiple application hops. |
| **Function Privilege Sandboxing** | Explicit `SECURITY DEFINER` and `SECURITY INVOKER` modes with configurable `SET search_path`. | Stored routines support `SQL SECURITY DEFINER` / `INVOKER`, but schema search path handling is less granular. | PostgreSQL provides strict isolation against schema-shadowing attacks in multi-tenant environments. |
| **Schema Isolation** | Supports true schemas within databases (`public`, `auth`, `storage`, `vault`). | Schema is synonymous with database. Cross-schema privilege boundaries are flatter. | Supabase keeps internal authentication credentials in the protected `auth` schema, isolated from the public catalog. |

### 4.2 Why PostgreSQL was Selected for JD Solar

1. **Zero-Trust Database Queries:** In traditional MySQL applications, if an API endpoint forgets `WHERE customer_id = current_user`, all customer purchases are returned to the caller. In PostgreSQL with RLS, the database engine returns zero rows unless the active policy conditions are met.
2. **Built-in Session Context:** PostgreSQL allows session settings like `current_setting('request.jwt.claim.sub')` to identify the caller directly inside SQL policies.
3. **Data Type Integrity:** Native `UUID`, `JSONB`, and `TIMESTAMPTZ` data types enforce strict schema validation at write time, eliminating data corruption caused by loose type coercion.

---

## 5. Frontend & Application-Level Security Features

Beyond the database engine, the React frontend (`frontend/src/`) implements application-level safeguards to protect against user input attacks, unauthorized route navigation, and operational risks.

### 5.1 Centralized Input Sanitization & XSS Defense (`frontend/src/lib/sanitize.js`)

User inputs from the consultation wizard, contact forms, warranty claims, and search inputs are processed through centralized sanitization filters:

* **Cross-Site Scripting (XSS) Stripping:**
  * Removes complete `<script>...</script>` and `<style>...</style>` blocks along with their inner contents.
  * Strips all remaining HTML/XML tags via regular expression replacement.
  * Neutralizes inline event handlers and URI schemes (`javascript:`, `vbscript:`, `data:`, `on*=` handlers).
* **Zero-Width & Control Character Removal:**
  * Strips invisible Unicode characters (`\u200B` to `\u200D`, `\uFEFF`, ASCII control codes `\u0000` to `\u001F`).
  * Prevents homograph attacks, database delimiter corruption, and filters-bypass techniques that use hidden characters.
* **Input Length Limiting:**
  * Enforces maximum character boundaries (e.g., standard text capped at 1,000 characters, emails at 254 characters, serial numbers at 64 characters) to protect against memory exhaustion or buffer bloat.
* **Strict Format Normalization:**
  * **Phone Numbers (`sanitizePhone`):** Strips non-digits, normalizes to Philippine mobile format (`09XXXXXXXXX`, exactly 11 digits), and verifies valid telecommunications prefixes via `isValidPhMobile`.
  * **Emails (`sanitizeEmail` / `isValidEmail`):** Strips whitespace, converts to lowercase, removes quotation/tag injection characters, and validates RFC standard structure.
  * **Hardware Serial Numbers (`sanitizeSerialNumber`):** Restricts characters to uppercase alphanumeric characters, hyphens, and underscores (`[^A-Z0-9-_]`), preventing SQL wildcard or script injection in inventory searches.
  * **Numeric Clamping (`sanitizeNumber`):** Parses numbers strictly, provides default fallbacks on `NaN`, and clamps values within allowable `[min, max]` intervals.

### 5.2 Role-Based Access Control (RBAC) & Route Guarding

* **Protected Route Wrapper (`ProtectedRoute.jsx`):**
  * Client routes (`/admin`, `/staff`) are wrapped in `ProtectedRoute`.
  * Checks authentication status and compares the current user role against `allowedRoles`.
  * Unauthorized or unauthenticated attempts are intercepted immediately and redirected to `/login` or the appropriate dashboard.
* **Role Verification via Dedicated Database Tables (`AuthContext.jsx`):**
  * When a user logs in via Supabase Auth, their role is not trusted from client-side claims alone.
  * The system queries the `public.admins` and `public.staff` relational tables to verify their role identity before assigning authorization state in the frontend.
* **Administrative Scope Segregation:**
  * **Administrators:** Have access to product catalog deletion, user management, staff profile provisioning, and system configuration.
  * **Staff Members:** Restricted to inventory stock toggles, inquiry ticket reviews, warranty registration, and customer lookup. Staff cannot delete product models or alter administrative configurations.

### 5.3 AI Assistant Scoping & Electrical Safety Guardrails

The consultative chatbot (`solarBotEngine.js`, `solarDiagnosticEngine.js`) includes safety boundaries to protect users and limit operational liability:

* **Deterministic Decision Trees:**
  * Fault diagnostics and recommendation workflows follow rule-based decision logic rather than open-ended, ungrounded language generation.
  * Prevents prompt injection, model jailbreaking, or data extraction attacks.
* **Electrical Safety Disclaimers:**
  * High-voltage AC grid wiring, complex panel soldering, and hazardous battery teardowns are excluded from advice.
  * The assistant directs users to showroom technicians or licensed electrical contractors, eliminating safety hazards and legal liability for physical hardware modifications.

### 5.4 Zero Online Payment & Financial Risk

* **Scope Delimitation:**
  * The platform intentionally excludes online payment processing (no credit card checkouts, GCash API integrations, or debit cards).
* **Security Benefits:**
  * Zero PCI-DSS compliance overhead.
  * Immune to carding bots, stolen credit card testing, payment interception, and fraudulent chargebacks.
  * All financial exchanges occur in person at the Quiapo or Cavite showrooms with physical equipment inspection.

### 5.5 Cross-Tab Inactivity Session Timeout Watchdog (`frontend/src/context/AuthContext.jsx`)

To protect customer warranty/invoice records, staff panels, and administrative operations on shared showroom terminals or unattended devices, the platform implements an automated 15-minute inactivity session watchdog:

* **Enforced Across All Authenticated Roles:**
  * Protects Customers, Staff, and Administrators. Anonymous public visitors browsing the product catalog remain uninterrupted.
* **15-Minute Interaction Monitoring:**
  * Tracks user input (`mousemove`, `mousedown`, `keydown`, `scroll`, `touchstart`) with a 10-second throttle to minimize CPU overhead.
  * Calculates idle time against a centralized timestamp (`jd_last_activity_timestamp`).
* **Multi-Tab Cross-Synchronization:**
  * Synchronizes activity across all open browser tabs via `window.addEventListener('storage', ...)`. User actions in one tab reset the inactivity countdown across all concurrent tabs.
* **Device Sleep & Wake-up Verification:**
  * Evaluates idle duration immediately via `document.addEventListener('visibilitychange', ...)` when a tab resumes or a laptop is opened, terminating sessions immediately if the 15-minute threshold lapsed in sleep mode.
* **Token Invalidation with Email Retention:**
  * Upon timeout, active credentials and authentication tokens (`jd_customer_token`, Supabase JWT) are invalidated and purged.
  * Non-sensitive email identifiers (`jd_customer_email`, `jd_remembered_email`) are preserved in storage, pre-populating the login input field so legitimate users need only enter their password.
* **Audit Notice Banner (`LoginPage.jsx`):**
  * Redirects to `/login?reason=timeout` and renders a clear notification banner indicating the session expired due to 15 minutes of inactivity.

### 5.6 Consumer Data-Sharing Consent Gate (`QuoteModal.jsx`)

To uphold compliance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) and protect consumer rights when requesting technical sizing or showroom product reservations, the inquiry interface enforces a mandatory data-sharing consent gate:

* **Explicit Unchecked Checkbox (Pre-Submission Gate):**
  * Submission of consultation or reservation passes is hard-blocked until the user explicitly marks the agreement checkbox.
  * Phrasing: *"I agree to share my contact and location details for technical consultation, quotation, and showroom scheduling in accordance with the Data Privacy Act."*
* **Visual Form Enforcement:**
  * The submission button is visually disabled (`opacity-50`, `cursor-not-allowed`) and programmatically prevented from executing until consent is confirmed.
* **Interactive RA 10173 Disclosure Modal:**
  * Clicking the "Data Privacy Act" anchor renders a dedicated disclosure modal detailing purpose limitation, zero third-party disclosure, automated 14-day hygiene purging, and zero financial data collection.
* **Step State Preservation:**
  * Checkbox state is preserved across Step 1 and Step 2 navigation, avoiding input reset when customers revise phone numbers or delivery addresses.

### 5.7 First-Time Customer Warranty & Disqualification Gate (`WarrantyTermsModal.jsx`)

To establish clear legal terms, manage operational liability, and ensure transparent expectations regarding hardware handling, new customer accounts entering the customer portal are gated by a mandatory first-time warranty onboarding modal:

* **Default 24-Month (2-Year) Official Coverage Notice:**
  * Affirms that registered solar units are protected against factory defects, internal MPPT/PWM charge controller malfunctions, dusk-to-dawn sensor faults, abnormal battery degradation, and solar cell delamination for 24 months.
* **1-Time Unit Replacement Entitlement:**
  * Clarifies that each registered serial number is eligible for exactly one (1) unit replacement or major sub-assembly exchange during its 2-year warranty term, concluding warranty coverage upon fulfillment.
* **Explicit Disqualification & Customer Carelessness Exclusions:**
  * Outlines that damage from physical drops, shattered tempered glass, casing impact trauma, moisture ingress from unsealed cable ports, modified wiring, broken warranty seals, or customer negligence strictly disqualifies the unit from free warranty replacement.
* **Post-Warranty / Disqualified Local Servicing Support:**
  * Clarifies that disqualified units remain eligible for local bench repairs, component swaps, and servicing at cost at the Quiapo Showroom or Cavite Hub.
* **Mandatory Interactive Acknowledgment:**
  * First-time portal access is hard-blocked until the customer checks the acknowledgment checkbox and submits the confirmation. Acknowledgment status is persisted per customer token in storage (`jd_warranty_ack_<token>`), preventing repetitive prompts on subsequent visits while remaining accessible via the "Terms & Policy" review button.

---

## 6. Security Checklist for Junior Developers

When adding new features or modifying code in this repository, follow these standard practices:

1. **Always Sanitize User Inputs:**
   * Import helper functions from `frontend/src/lib/sanitize.js` before sending data to Supabase.
   * Never render raw user input using `dangerouslySetInnerHTML`.
2. **Never Expose the Service Role Key:**
   * Only `VITE_SUPABASE_ANON_KEY` belongs in frontend `.env` files.
   * If an operation requires elevated permissions, write a PostgreSQL stored procedure with `SECURITY DEFINER` and appropriate authorization checks instead of exposing administrative keys.
3. **Use UUIDs for New Private Tables:**
   * Any table containing customer identities, confidential notes, or transaction histories must use `UUID PRIMARY KEY DEFAULT gen_random_uuid()` rather than sequential integers.
4. **Always Enable RLS on New Tables:**
   * Run `ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;` on every new table created in PostgreSQL.
   * Create explicit `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies for `anon` and `authenticated` roles.
5. **Secure Stored Procedures:**
   * When creating `SECURITY DEFINER` functions, always add `SET search_path = ''` to prevent search path hijacking.
   * Include caller verification checks using `auth.uid()` or role checking functions.

