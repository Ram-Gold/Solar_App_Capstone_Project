# Roles and Permissions

Canonical reference for actor roles, UI workspace capabilities, route guards, database RPCs, and live Supabase Row-Level Security (RLS) enforcement across the JD Solar platform.

> [!NOTE]
> This document reflects **current implemented behavior (as-is)** verified against both the frontend codebase and live Supabase (`gkrdwzbxpstpqpvqlwbt`, Postgres 17). Discrepancies between frontend UI gating and database RLS policies are documented in [Known Enforcement Gaps and Audit Notes](#known-enforcement-gaps-and-audit-notes).

---

## 1. Role Definitions and Resolution

All actor terminology follows [GLOSSARY.md](../../GLOSSARY.md):

| Role | Canonical Term | Primary Workspace | Role Resolution Source |
| :--- | :--- | :--- | :--- |
| `admin` | **Administrator** | **Admin Console** (`/admin/*`) | Row in `public.admins` matching `auth.uid()` |
| `staff` | **Staff Member** | **Staff Workspace** (`/staff/*`) | Row in `public.staff` matching `auth.uid()` |
| `customer` | **Customer** | **Customer Portal** (`/portal`) | Row in `public.customers` matching `user_id = auth.uid()` (or email fallback) |
| `null` | **Public Guest** | **Product Catalog** (`/browse`), **Product Matcher** (`/match`) | Unauthenticated (`auth.uid() IS NULL`) |

### Resolution Order
1. **Frontend (`frontend/src/context/AuthContext.jsx`)**: `fetchRole(userId, email)` checks `admins` first, then `staff`, then `customers` (by `user_id`, falling back to `email`). If none match, `role` resolves to `null`.
2. **Database (`public.get_user_role()`)**: `SECURITY DEFINER` function checks `public.admins`, then `public.staff`, then `public.customers` (`user_id = auth.uid()`), returning `'admin'`, `'staff'`, `'customer'`, or `NULL`.

---

## 2. Quick-Reference Summary

| Capability Area | Administrator | Staff Member | Customer | Public Guest | Database / RLS Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Route Access** | `/admin/*`, `/portal`, public routes | `/staff/*`, `/portal`, public routes | `/portal`, public routes | Public routes only | Enforced in `App.jsx` (`ProtectedRoute`) |
| **Users & Role Management** | Full CRUD + password reset for admins and staff | Hidden (`adminOnly`) | None | None | `admins` & `staff` RLS + `admin_set_user_password` RPC |
| **Own Profile & Password** | View, edit, change password, delete own row | View, edit, change password, delete own row | Manage portal access | None | `admins` / `staff` own-row RLS + `change_own_password` RPC |
| **Products & Pricing** | Full CRUD, archive, delete, view `price_range` | View, add, edit specs/stock, archive; **no price visibility or delete** | Public catalog view (in-stock only; no prices) | Public catalog view (in-stock only; no prices) | `products` RLS allows `staff`/`admin` insert/update, `admin` delete (see gap note) |
| **Categories** | Create, rename, delete | Create only; **cannot rename or delete** | Read only | Read only | `categories` RLS: `staff`/`admin` insert; `admin`-only update/delete |
| **Inventory & Stock Holds** | Edit branch stock, staged save, reserve/release/fulfill holds | Edit branch stock, staged save, reserve/release/fulfill holds | Triggers 48-hour **Stock Hold** on **Store Pickup** submission | Triggers 48-hour **Stock Hold** on **Store Pickup** submission | `reserve_product_stock`, `release_product_reservation`, `fulfill_reservation_sale` RPCs |
| **Inquiries & Calendar** | Full CRUD, bulk cleanup, calendar drag-and-drop reschedule, rate-limit exempt | Create, view, edit status/notes, delete; **no calendar drag-and-drop** | Submit inquiries (subject to **Inquiry Rate Limit**) | Submit inquiries (subject to **Inquiry Rate Limit**) | `quote_tickets` RLS is `{public}` `ALL`; trigger enforces rate limit |
| **Orders** | View, sort by total, view prices, Add, Edit, Delete | View orders (sorted by newest/name); **no prices, Add, Edit, or Delete** | None | None | `orders` RLS grants `admin` & `staff` `SELECT`/`INSERT`/`UPDATE`/`DELETE` (see gap note) |
| **Customers & Sales** | Register sale, edit profile, void/unvoid/extend/remove purchase, **Delete Account** | Register sale, edit profile, void/unvoid/extend/remove purchase; **no Delete Account** | View own registered equipment via `/portal` | None | `customers` & `customer_purchases` RLS grant `{authenticated}` `ALL` (see gap note) |
| **Warranty Claims** | Inspect, advance/reverse any stage, reopen terminal claims, archive, restore, delete | Inspect, **forward-only** stage progression; **cannot change terminal, archive, restore, or delete** | Submit 1 lifetime claim per purchase; track status | None | `warranty_claims` RLS grants `{authenticated}` `ALL`; `submit_warranty_claim` RPC |

---

## 3. Domain-Grouped Permission Matrices

### 3.1 Navigation, Workspaces, and Routes

| Capability | Administrator | Staff Member | Customer | Public Guest | Database / RLS Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Public routes (`/`, `/about`, `/browse`, `/match`, `/product/:id`, `/chat`) | Yes | Yes | Yes | Yes | Public `SELECT` on `products` and `categories` |
| **Admin Console** (`/admin/*`) | Yes | Redirected | Redirected | Redirected to `/login` | `ProtectedRoute allowedRoles={['admin']}` in `App.jsx` |
| **Staff Workspace** (`/staff/*`) | Redirected | Yes | Redirected | Redirected to `/login` | `ProtectedRoute allowedRoles={['staff']}` in `App.jsx` |
| **Customer Portal** (`/portal`) | Allowed by route guard | Allowed by route guard | Yes | Redirected to `/login` | `ProtectedRoute allowedRoles={['customer', 'admin', 'staff']}` |
| Sidebar **Users** link (`OperationsSidebar.jsx`) | Visible | Hidden (`adminOnly: true`) | N/A | N/A | N/A (UI navigation) |
| Sidebar `Ctrl+K` live search across products, inquiries, claims, customers, orders | Yes | Yes | N/A | N/A | Queries `products`, `quote_tickets`, `warranty_claims`, `customers`, `orders` |
| Dashboard KPI: **Open Warranty Claims** card | Not shown on `DashboardScreen` | Shown (`isStaff` KPI card) | N/A | N/A | Queries `warranty_claims` count |

---

### 3.2 Products and Categories

| Capability | Administrator | Staff Member | Customer | Public Guest | Database / RLS Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| View out-of-stock products in **Product Catalog** (`/browse`) | Yes (`isPrivileged`) | Yes (`isPrivileged`) | Hidden | Hidden | `products` public `SELECT` |
| View product pricing (`price_range`, `min_price`) in operations tables & inspector | Yes | Hidden (`!isStaff`) | Hidden on public views | Hidden on public views | Columns readable via `SELECT`; hidden in UI for staff |
| Add product (`AddProductScreen`) | Yes | Yes | No | No | `Staff insert products` (`get_user_role() IN ('staff', 'admin')`) |
| Edit product specs & branch stock (`ProductsScreen`, `DashboardScreen`) | Yes | Yes | No | No | `Staff update products` (`get_user_role() IN ('staff', 'admin')`) |
| Archive / restore product | Yes | Yes | No | No | `Staff update products` (`get_user_role() IN ('staff', 'admin')`) |
| Delete product (single row or bulk selection) | Yes | Hidden (`role === 'admin'`) | No | No | `Admin delete products` (`get_user_role() = 'admin'`); see gap note on legacy policy |
| Add category (`CategoryModal`) | Yes | Yes | No | No | `Staff and admin insert categories` (`get_user_role() IN ('staff', 'admin')`) |
| Rename or delete category (`CategoryModal`) | Yes | Hidden (`isAdmin`) | No | No | `Admin update categories` & `Admin delete categories` (`get_user_role() = 'admin'`) |

---

### 3.3 Inventory and Stock Holds

| Capability | Administrator | Staff Member | Customer | Public Guest | Database / RLS Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Edit **Physical Stock / Available Stock** (`stock_quiapo`, `stock_cavite`, `stock_quantity`) | Yes | Yes | No | No | `Staff update products` |
| Staged inventory save bar (`useStagedInventoryChanges`) | Yes | Yes | No | No | Batch updates via `products` `UPDATE` |
| Create 48-hour **Stock Hold** (`reserve_product_stock`) | Yes | Yes | Yes (via **Store Pickup**) | Yes (via **Store Pickup**) | `SECURITY DEFINER` RPC `reserve_product_stock` |
| Release **Stock Hold** (`release_product_reservation`) | Yes | Yes | No | No | `SECURITY DEFINER` RPC `release_product_reservation` |
| Fulfill pickup sale (`fulfill_reservation_sale`) | Yes | Yes | No | No | `SECURITY DEFINER` RPC `fulfill_reservation_sale` |

---

### 3.4 Inquiries and Calendar

| Capability | Administrator | Staff Member | Customer | Public Guest | Database / RLS Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Submit **Consultation Inquiry** or **Store Pickup** | Yes | Yes | Yes | Yes | `Public insert access for quote_tickets` |
| **Inquiry Rate Limit** (3 inquiries / 60 min per IP/session) | Exempt | Exempt | Enforced | Enforced | Trigger `enforce_inquiry_rate_limit()` on `quote_tickets` |
| View, filter, and search inquiries (`InquiriesScreen`) | Yes | Yes | Own portal summary | No | `Public read access for quote_tickets` |
| Update inquiry status and `staff_notes` | Yes | Yes | No | No | `Public update access for quote_tickets` |
| Create walk-in / phone inquiry from calendar | Yes | Yes | No | No | `Public insert access for quote_tickets` |
| Calendar drag-and-drop reschedule (`handleDragStart` / `handleDrop`) | Yes | Disabled (`if (!isAdmin) return`) | N/A | N/A | UI-only gate; DB allows `UPDATE` |
| Delete single inquiry or bulk-clean inactive inquiries | Yes | Yes | No | No | `Public delete access for quote_tickets` |

---

### 3.5 Orders

| Capability | Administrator | Staff Member | Customer | Public Guest | Database / RLS Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| View orders list (`OrdersScreen`) | Yes | Yes | No | No | `Admins and staff can select orders` (`admin`, `staff`) |
| View order `price` / `Total Price` and sort by `total_desc` / `total_asc` | Yes | Hidden (`role !== 'staff'`) | No | No | UI-only gate; `orders` `SELECT` returns full row |
| Add order (`Add Order` button & modal) | Yes | Hidden (`role === 'admin'`) | No | No | `Admins and staff can insert orders` (see gap note) |
| Edit order | Yes | Hidden (`role === 'admin'`) | No | No | `Admins and staff can update orders` (see gap note) |
| Delete order | Yes | Hidden (`role === 'admin'`) | No | No | `Admins and staff can delete orders` (see gap note) |

---

### 3.6 Sales Registration and Customers

| Capability | Administrator | Staff Member | Customer | Public Guest | Database / RLS Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Register a new sale (`RegisterSaleScreen`) | Yes | Yes | No | No | `Staff and Admin full access` on `customers` & `customer_purchases` |
| View customer directory and purchase history (`CustomersScreen`) | Yes | Yes | Own equipment via `/portal` | No | `Staff and Admin full access on customers` |
| Edit customer profile details | Yes | Yes | No | No | `Staff and Admin full access on customers` |
| Void, unvoid, extend warranty, or remove a registered purchase | Yes | Yes | No | No | `Staff and Admin full access on customer_purchases` |
| Delete customer account (`Delete Account` button) | Yes | Hidden (`role === 'admin'`) | No | No | UI-only gate; `{authenticated}` has `ALL` on `customers` |

---

### 3.7 Warranty Claims

| Capability | Administrator | Staff Member | Customer | Public Guest | Database / RLS Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Submit **Warranty Claim** (1 lifetime claim per registered purchase) | Can log/manage in console | Can log/manage in console | Yes (via `/portal`) | No | `submit_warranty_claim` RPC (`SECURITY DEFINER`) + `trg_enforce_single_claim_per_purchase` trigger |
| View & inspect active claims (`WarrantyClaimsScreen`) | Yes | Yes | Own claims via `/portal` | No | `Staff and Admin full access on warranty_claims` |
| Advance claim forward (`in_review` -> `checking` -> `approved` -> `ready_for_release` -> `resolved` / `rejected`) | Yes | Yes | No | No | `Staff and Admin full access on warranty_claims` |
| Reverse stage or reopen terminal claim (`resolved` / `rejected`) | Yes (logged in `staff_notes`) | Blocked (forward-only; terminal locked) | No | No | UI-only state machine (`warrantyClaimWorkflow.js`) |
| Archive, restore, or permanently delete warranty claim | Yes | Hidden (`isAdmin`) | No | No | UI-only gate; `{authenticated}` has `ALL` on `warranty_claims` |

---

### 3.8 Users and Own Profile

| Capability | Administrator | Staff Member | Customer | Public Guest | Database / RLS Enforcement |
| :--- | :--- | :--- | :--- | :--- | :--- |
| List all **Administrators** and **Staff Members** (`UsersScreen`) | Yes | No | No | No | `Admins can read all admins` / `Admins can read all staff` |
| Create **Administrator** or **Staff Member** account | Yes | No | No | No | `Admins can insert admins` / `Admins can insert staff` |
| Edit any **Administrator** or **Staff Member** record | Yes | No | No | No | `Admins can update admins` / `Admins can update staff` |
| Reset another user's password (`admin_set_user_password` RPC) | Yes | No | No | No | Enforced in RPC (`get_user_role() = 'admin'`) |
| Delete another **Administrator** or **Staff Member** | Yes | No | No | No | `Admins can delete admins` / `Admins can delete staff` |
| View, edit, or delete **own** profile (`ProfileScreen`) | Yes | Yes | No | No | `Admins can read own row`; `Staff can read/update/delete own row` (`auth.uid() = id`) |
| Change **own** password (`change_own_password` RPC) | Yes | Yes | No | No | Enforced in RPC (`admins` or `staff` matching `auth.uid()`) |

---

### 3.9 Database RPCs (`public` schema)

| RPC Function | Security Mode | Permitted Callers | Purpose |
| :--- | :--- | :--- | :--- |
| `get_user_role()` | `SECURITY DEFINER` | Authenticated / Public | Returns `'admin'`, `'staff'`, `'customer'`, or `NULL` |
| `admin_set_user_password(p_target_user_id, p_new_password)` | `SECURITY DEFINER` | **Administrator** only | Updates `auth.users.encrypted_password` for target admin/staff |
| `change_own_password(p_current_password, p_new_password)` | `SECURITY DEFINER` | **Administrator**, **Staff Member** | Verifies current password and updates caller's password |
| `activate_customer_account(p_access_token, p_user_id, p_email, [p_password])` | `SECURITY DEFINER` | **Customer** (activation flow) | Links `auth.users` ID to `customers` record via `access_token` |
| `get_customer_portal_data(p_token)` | `SECURITY DEFINER` | **Customer** | Fetches **Customer Portal** purchases and claims by token |
| `submit_warranty_claim(p_token, p_purchase_id, p_category, p_description, p_media_urls)` | `SECURITY DEFINER` | **Customer** | Validates token ownership and inserts **Warranty Claim** |
| `reserve_product_stock(p_ticket_id, p_product_id, p_quantity, p_expires_hours)` | `SECURITY DEFINER` | All callers (Store Pickup) | Deducts branch/total stock and records 48-hour **Stock Hold** |
| `release_product_reservation(p_ticket_id)` | `SECURITY DEFINER` | **Administrator**, **Staff Member** | Restores held units to sellable stock on cancellation/expiry |
| `fulfill_reservation_sale(p_ticket_id, p_product_id, p_quantity, [p_branch])` | `SECURITY DEFINER` | **Administrator**, **Staff Member** | Converts **Store Pickup** hold into a completed sale |
| `enforce_inquiry_rate_limit()` | `SECURITY DEFINER` (Trigger) | Triggered on `quote_tickets` `INSERT` | Caps non-privileged callers at 3 inquiries per 60-minute window |

---

## 4. Known Enforcement Gaps and Audit Notes

The following discrepancies were observed between frontend UI checks and live Supabase RLS/trigger definitions. They are documented here for visibility without modifying application code or database policies in this pass:

1. **`orders` RLS vs. `OrdersScreen.jsx`**: The UI hides Add, Edit, Delete, and order pricing from **Staff Members**, but live RLS policies (`Admins and staff can insert/update/delete/select orders`) grant both `admin` and `staff` full CRUD access.
2. **`products` legacy permissive policy**: Alongside `Admin delete products` (`get_user_role() = 'admin'`), live Supabase still has `Admin can manage products` (`ALL`, `auth.role() = 'authenticated'`), which allows any authenticated user (including `staff` or `customer`) to bypass role-specific product restrictions at the API level.
3. **`warranty_claims` UI-only state machine**: Forward-only stage transitions for **Staff Members** and archive/restore/delete restrictions are enforced in `WarrantyClaimsScreen.jsx` and `warrantyClaimWorkflow.js`, whereas live RLS (`Staff and Admin full access on warranty_claims`) grants `{authenticated}` `ALL` access.
4. **`quote_tickets` open RLS**: Calendar drag-and-drop rescheduling is restricted to **Administrators** in `InquiriesScreen.jsx`, while live RLS grants `{public}` `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
5. **`customers` and `customer_purchases` broad RLS**: `Delete Account` is restricted to **Administrators** in `CustomersScreen.jsx`, while live RLS grants `{authenticated}` `ALL` access on both tables (and `{anon}` `SELECT` / `DELETE` on `customers`).
6. **`staff` self-deletion**: `ProfileScreen.jsx` and `Staff can delete own row` RLS both allow a **Staff Member** to permanently delete their own `staff` record.
