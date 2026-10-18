# Philippine Cascading Address Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a 3-tier cascading Philippine address dropdown ("Select a Province" -> "City / Municipality" -> "Barangay / District") in the quote inquiry flow, persist granular location fields to the backend, and reflect the location breakdown in the Staff and Admin panels.

**Architecture:** 
1. Use the pre-validated official PSGC dataset (`latest-ph-address-thanks-to-anehan`) providing offline, zero-latency hierarchy for all 83 provinces (including NCR), 1,642 cities & municipalities, and 42,011 barangays.
2. Encapsulate geographic logic in a helper module (`philippineAddresses.js`) and build a reusable, accessible cascading selector component (`PhilippineAddressSelect.jsx`).
3. Replace the plain text city input in `QuoteModal.jsx` with the cascading selector and store `province`, `city`, `barangay`, and formatted `delivery_address`.
4. Provide a SQL migration for `quote_tickets` and `customers` with backward-compatible fallback insert logic.
5. Upgrade `InquiriesScreen.jsx` (Staff & Admin desk) to render province, city, and barangay in tables, cards, filters, and walk-in creation.

**Tech Stack:** React 19, Vite, Tailwind CSS, Lucide React, Supabase PostgreSQL, `latest-ph-address-thanks-to-anehan`.

---

### Task 1: Create Address Data Service Utility
**Files:**
- Create: `frontend/src/lib/philippineAddresses.js`
- Test: `frontend/test-address-service.js`

**Step 1: Write tests for the address utility functions**
Verify `getProvinces()`, `getCities(provincePsgc)`, and `getBarangays(cityPsgc)` return correctly formatted and sorted arrays, properly mapping Metro Manila (NCR).

**Step 2: Implement `philippineAddresses.js`**
Write functions:
- `getProvinces()`: Returns sorted provinces, ensuring `-NO PROVINCE-` is mapped to `Metro Manila (NCR)`.
- `getCitiesByProvince(provinceCode)`: Returns cities & municipalities for the given province code.
- `getBarangaysByCity(cityCode)`: Returns sorted barangays for the given city code.
- `formatFullAddress({ province, city, barangay, street })`: Formats full address string.

**Step 3: Run the test to ensure all lookups pass**
Run node test and verify output.

---

### Task 2: Create Reusable UI Component `PhilippineAddressSelect.jsx`
**Files:**
- Create: `frontend/src/components/ui/PhilippineAddressSelect.jsx`

**Step 1: Implement the 3-tier cascading dropdowns**
- Dropdown 1: "Province" with first option `Select a Province`.
- Dropdown 2: "City / Municipality" (named "city"), inactive/disabled until a province is selected.
- Dropdown 3: "Barangay / District", inactive/disabled until a city is selected.
- Clean Tailwind styling matching JD Solar theme, responsive layouts, clear error messages, and keyboard accessibility.
- Support both `QuoteModal` light theme and admin surface container theme.

---

### Task 3: Integrate Cascading Selector into `QuoteModal.jsx`
**Files:**
- Modify: `frontend/src/components/QuoteModal.jsx`

**Step 1: Update form state**
Replace `city` string state with:
- `province`: name string
- `provinceCode`: PSGC code
- `city`: name string
- `cityCode`: PSGC code
- `barangay`: name string
- `barangayCode`: PSGC code

**Step 2: Update validation**
Ensure all 3 levels (Province, City, Barangay) are selected before advancing to Step 2.

**Step 3: Update Supabase insertion & fallback**
Pass `province`, `city`, `barangay`, and `delivery_address` to Supabase. Implement graceful fallback if migration columns are not yet applied.

**Step 4: Update Step 3 Ticket Pass preview**
Display full location `Brgy. ${barangay}, ${city}, ${province}` in ticket summary.

---

### Task 4: Create Backend Migration SQL
**Files:**
- Create: `customer_location_address_migration.sql`

**Step 1: Write SQL migration**
- Add `province`, `barangay`, `postal_code` to `quote_tickets`.
- Add index on `(province, city)`.
- Add `province`, `city`, `barangay` to `customers`.

---

### Task 5: Reflect Granular Address in Staff & Admin Panels
**Files:**
- Modify: `frontend/src/components/admin/InquiriesScreen.jsx`

**Step 1: Update Inquiries / Quotes table and card rows**
Display location hierarchy (`Brgy. [Barangay], [City], [Province]`).

**Step 2: Update Inquiry Details Modal**
Display a dedicated "Customer Location & Address" section with Province, City, and Barangay.

**Step 3: Update Walk-in Inquiry Registration Modal**
Replace the single text input with the cascading `PhilippineAddressSelect` component.

**Step 4: Update search & filter**
Ensure searches match customer name, ticket code, phone, city, province, and barangay.

---

### Task 6: Verification & End-to-End Build Test
**Files:**
- Run Vite production build (`npm run build`).
- Verify no TypeScript/linting/bundler errors.
- Verify full flow in browser simulation.
