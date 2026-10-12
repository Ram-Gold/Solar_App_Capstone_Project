# Customer Onboarding, QR Dashboard & Warranty Diagnostic System
## Architectural Design Specification

---

## 1. Executive Summary

This feature extends **JD Force Solar Products Trading**'s platform to bridge in-store physical purchases (Cavite and Quiapo branches) with digital customer support. 

At the counter, store staff generate customer profiles and log product purchases in seconds. The system immediately outputs an on-screen and printable QR code containing a secure, persistent access link. By scanning the QR code with their mobile phone, customers gain instant access to a personalized **Customer Dashboard** showing their purchase history, live warranty timers, and a direct **Fault Diagnostic Questionnaire** to submit warranty/repair claims with photo and video proof.

---

## 2. Decision Log

| # | Decision | Alternatives Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **1** | **Instant Token QR Access** | Passwords, SMS OTP, Magic links | Zero counter friction. Customer scans and opens portal immediately without typing credentials. |
| **2** | **Phone Number Lookup** | Email, Loyalty ID card | Universal and fastest in-person customer identifier in the Philippines. |
| **3** | **Automatic Warranty Duration** | Manual entry, strict serial enforcement | Fast checkout with auto-calculated expiration from catalog terms; optional serial number field. |
| **4** | **Direct Fault Questionnaire** | Conversational AI troubleshooter | Objective evidence collection (symptom categories + photos/videos) for fast staff triage. |
| **5** | **Dual QR Presentation** | Screen-only, slip-only | Instant camera scan plus printable receipt for customer physical records. |
| **6** | **Dedicated Claims Tab** | Sub-tab in Orders screen | Clean separation of logistics order records vs. RMA / warranty triage. |
| **7** | **Supabase Direct Token Model** | Magic Links via backend, standalone PWA | Fits existing React 19 + Supabase stack with zero extra operational overhead. |

---

## 3. Assumptions & Non-Functional Requirements

1. **Access Security & Longevity:**
   * Each customer has a unique, 128-bit cryptographically secure UUID `access_token` generated natively by PostgreSQL (`gen_random_uuid()`).
   * The token is passed via URL query parameter (`/portal?token=[uuid]`) and saved to `localStorage` on initial mobile load.
   * Customers can re-scan their QR code or bookmark the URL on their mobile browser to view their portal anytime.
2. **Performance & Scalability:**
   * Fast phone lookups (< 500ms) supported by a PostgreSQL unique index on `customers.phone_number`.
   * Mobile Customer Portal loads in < 1.5s on mobile 4G/5G connections.
3. **Storage & Assets:**
   * Claim photos and short videos are stored in a dedicated Supabase Storage bucket (`warranty-evidence`) with a 15MB file limit.
4. **Non-Goals:**
   * No online shopping checkout or payment gateways (cash, bank transfers, or LGU procurement handled in-store).
   * No complex conversational AI troubleshooting bot.
   * No mandatory customer password or SMS OTP wall.

---

## 4. Architecture & Supabase Data Model

```
                    ┌──────────────────────────────────────┐
                    │ Store Counter (Admin / Staff Portal) │
                    └──────────────────┬───────────────────┘
                                       │ 
                 1. Register Customer & Record Sale
                                       ▼
                   ┌────────────────────────────────────────┐
                   │    Supabase PostgreSQL & Storage       │
                   │  - customers (Phone, Token)            │
                   │  - customer_purchases (Warranties)     │
                   │  - warranty_claims (Tickets, Media)    │
                   │  - warranty-evidence (Storage Bucket)  │
                   └──────────────────┬─────────────────────┘
                                      │
                 2. Generates QR Link: /portal?token=[uuid]
                                      ▼
                   ┌────────────────────────────────────────┐
                   │        Customer Mobile Portal          │
                   │  - View all past purchases             │
                   │  - Live warranty expiration timers     │
                   │  - Submit Fault Questionnaire + Media  │
                   └────────────────────────────────────────┘
```

### 4.1 PostgreSQL Schema

```sql
-- 1. Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    access_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON public.customers(phone_number);
CREATE INDEX idx_customers_token ON public.customers(access_token);

-- 2. Customer Purchases Table
CREATE TABLE public.customer_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    serial_number TEXT,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    warranty_months INT NOT NULL DEFAULT 12,
    warranty_expires_at DATE GENERATED ALWAYS AS (
        purchase_date + (warranty_months || ' months')::interval
    ) STORED,
    branch_location TEXT NOT NULL DEFAULT 'Cavite',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_purchases_customer ON public.customer_purchases(customer_id);

-- 3. Warranty Claims Table
CREATE TABLE public.warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.customer_purchases(id) ON DELETE CASCADE,
    issue_category TEXT NOT NULL,
    description TEXT NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_review, approved, resolved, rejected
    staff_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_warranty_claims_purchase ON public.warranty_claims(purchase_id);
CREATE INDEX idx_warranty_claims_status ON public.warranty_claims(status);
```

### 4.2 Security Definer RPC Functions

```sql
-- Fetch Customer Portal Data safely without exposing full customer tables
CREATE OR REPLACE FUNCTION public.get_customer_portal_data(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer RECORD;
    v_purchases JSONB;
    v_claims JSONB;
BEGIN
    SELECT id, phone_number, full_name, access_token INTO v_customer
    FROM public.customers
    WHERE access_token = p_token;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', cp.id,
            'product_id', cp.product_id,
            'product_name', p.name,
            'product_image', p.image_url,
            'serial_number', cp.serial_number,
            'purchase_date', cp.purchase_date,
            'warranty_expires_at', cp.warranty_expires_at,
            'branch_location', cp.branch_location,
            'is_warranty_active', (cp.warranty_expires_at >= CURRENT_DATE)
        ) ORDER BY cp.purchase_date DESC
    ), '[]'::jsonb)
    INTO v_purchases
    FROM public.customer_purchases cp
    JOIN public.products p ON p.id = cp.product_id
    WHERE cp.customer_id = v_customer.id;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', wc.id,
            'purchase_id', wc.purchase_id,
            'product_name', p.name,
            'issue_category', wc.issue_category,
            'description', wc.description,
            'media_urls', wc.media_urls,
            'status', wc.status,
            'staff_notes', wc.staff_notes,
            'created_at', wc.created_at
        ) ORDER BY wc.created_at DESC
    ), '[]'::jsonb)
    INTO v_claims
    FROM public.warranty_claims wc
    JOIN public.customer_purchases cp ON cp.id = wc.purchase_id
    JOIN public.products p ON p.id = cp.product_id
    WHERE cp.customer_id = v_customer.id;

    RETURN jsonb_build_object(
        'customer', jsonb_build_object(
            'name', v_customer.full_name,
            'phone', v_customer.phone_number
        ),
        'purchases', v_purchases,
        'claims', v_claims
    );
END;
$$;
```

---

## 5. Frontend UI Components

### 5.1 Staff / Admin Portal Additions
1. **`RegisterSaleScreen.jsx`**:
   * Phone lookup with auto-fill for returning customers.
   * Product dropdown selector, branch selector, and optional serial number.
   * Action button: *"Register Sale & Generate QR"*.
2. **`QRReceiptModal.jsx`**:
   * Renders dynamic SVG QR code using `qrcode.react`.
   * Printable receipt layout formatted with `@media print` for 80mm thermal printers or standard paper.
3. **`WarrantyClaimsScreen.jsx`**:
   * Filter claims by status: `Pending Review`, `In Review`, `Approved`, `Resolved`, `Rejected`.
   * Lightbox gallery to inspect uploaded evidence photos/videos.
   * Status change controls and technician notes input.

### 5.2 Customer Portal
1. **`CustomerPortalPage.jsx` (`/portal?token=...`)**:
   * Reads token from URL and saves to `localStorage`.
   * Lists past purchases with product photos and active warranty indicators.
   * Displays live status cards for submitted claims.
2. **`FaultDiagnosticModal.jsx`**:
   * **Step 1:** Issue category selection (chips).
   * **Step 2:** Fault description textarea.
   * **Step 3:** Photo/video proof attachment directly uploading to Supabase Storage.
   * **Step 4:** Ticket submission confirmation with reference ID.

---

## 6. Verification & Testing Matrix

* **Lookup & Registration:** Phone query latency, returning customer detection, duplicate protection.
* **QR Formatting:** Token extraction, mobile persistence, invalid token error state handling.
* **Print Rendering:** Thermal receipt formatting (clean monochrome margins, centered QR).
* **Warranty Calculation:** Accurate expiration countdowns and active/expired state transitions.
* **Evidence Uploads:** Size constraints (max 15MB), format filtering (JPG, PNG, WebP, MP4).
* **Claims Lifecycle:** End-to-end status updates and customer view synchronization.
