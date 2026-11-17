# Admin & Staff Workspace Simplification and Table-First UX Research & Audit

Research and codebase audit conducted to inform the navigation simplification, Table-first / Card-toggle standardization, compact filter bar + mode switcher architecture, and bulk Archive/Delete workflows across the JD Solar `Admin Console` ([AdminPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/AdminPage.jsx)) and `Staff Workspace` ([StaffPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/StaffPage.jsx)).

---

## 1. Primary-Source UX & Frontend Design Findings

### 1.1 Navigation Simplification, Information Scent & Progressive Disclosure (NN/g)
- **Single-Concept Destinations & Strong Information Scent**: Nielsen Norman Group (NN/g) emphasizes that navigation labels must maximize *information scent*—users scan left-aligned labels rather than reading full descriptions, and bundled `"X & Y"` labels create category ambiguity by forcing two distinct mental models into one link ([NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)). Splitting bundled sidebar labels (`Register Sale & QR`, `Inquiries & Pickups`, `Warranty & Claims`, `Products & Media`, `Customers & Tokens`) into clean single-noun top-level destinations (`Dashboard`, `Register Sale`, `Inquiries`, `Claims`, `Orders`, `Products`, `Customers`, `Users`) makes each sidebar item unambiguous and matches [MobileBottomNav.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/MobileBottomNav.jsx#L3-L8), which already uses single-word labels (`Dashboard`, `Inquiries`, `Claims`, `Register`).
- **Two-Level Progressive Disclosure via In-Page Mode Switcher**: NN/g's progressive disclosure rule separates primary destinations (Level 1: sidebar) from secondary sub-views and mode controls (Level 2: in-page view/mode dropdown and filter bar), warning against exceeding two levels of hierarchy ([NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)). Secondary views such as `Media Library` / `Archived Products` (under `Products`), `Archived Claims` (under `Claims`), `Pickups` vs `Consultations` (under `Inquiries`), or `Walk-In` vs `Reservation` (under `Register Sale`) belong in an in-page mode dropdown rather than extra sidebar links or stacked multi-table monoliths.
- **Filter UI & Explicit Active State**: NN/g recommends structured, domain-aligned filter categories and values (e.g., `Branch`, `Status`, `Stock Level`, `Category`) placed directly above the dataset, with visible active state and one-click reset so operators never mistake a filtered subset for the full inventory ([NN/g Defining Helpful Filter Categories and Values](https://www.nngroup.com/articles/filter-categories-values)).

### 1.2 Table-First Operational Lists vs. Card Grids (NN/g, Material Design 3, Polaris)
- **Why Operational Screens Default to Tables**: NN/g identifies four core tasks for enterprise data tables: (1) finding specific records, (2) comparing attributes across rows, (3) inspecting/editing a single row, and (4) taking bulk or row-level actions ([NN/g Data Tables](https://www.nngroup.com/articles/data-tables)). Dense operational workflows (inventory SKUs, customer directories, warranty claim queues, orders, staff/admin accounts, and inquiry logs) are attribute-comparison tasks where fixed-column alignment, `tabular-nums`, sticky headers, and row checkboxes outperform multi-column card grids.
- **When Card Grids Add Value (Optional Toggle)**: Material Design 3 distinguishes **Lists/Tables** (continuous, scannable indexes for rapid comparison and action) from **Cards** (self-contained containers for visual browsing of media-rich entities) ([Material Design 3 Cards Guidelines](https://m3.material.io/components/cards/guidelines)). Providing a standardized **Table / Cards view toggle** lets operations teams default to high-density **Table** view for triage, sorting, and bulk selection, while switching to **Cards** on demand when visually inspecting product thumbnails, storage media assets, or ticket previews.
- **Index Table Composition (Shopify Polaris)**: Shopify Polaris's `IndexTable` pattern pairs a compact unified filter bar (search + select dropdowns + view toggle) directly above a scannable table with row checkboxes, sticky headers, and row-click detail drawers—keeping primary row clicks non-destructive while isolating trailing row actions (`e.stopPropagation()`) ([Shopify Polaris Index Table](https://polaris.shopify.com/components/tables/index-table)).

### 1.3 Bulk Selection, Batch Action Toolbars & Safe Archive vs. Delete (Carbon, Polaris, NN/g, Radix)
- **Contextual Batch Action Bar (Carbon & Polaris)**: In IBM's Carbon Design System (`TableBatchActions`) and Shopify Polaris (`IndexTable` bulk actions), checking one or more row checkboxes reveals a contextual **Batch Action Toolbar** displaying the exact selection count (e.g., `"3 selected"`), eligible bulk operations (`Archive Selected`, `Delete Selected`), and an explicit `Clear selection` escape control ([Carbon Design System Data Table Usage](https://carbondesignsystem.com/components/data-table/usage); [Shopify Polaris Index Table](https://polaris.shopify.com/components/tables/index-table)).
- **Reversible Archive vs. Irreversible Delete & Confirmation Ergonomics (NN/g & Radix)**:
  - NN/g advises reserving modal confirmation dialogs strictly for irreversible/high-risk actions and separating destructive controls visually and spatially from routine primary buttons ([NN/g Confirmation Dialogs](https://www.nngroup.com/articles/confirmation-dialog)).
  - **Mass Archive** is *reversible* and non-destructive: it hides discontinued/seasonal SKUs from active operational & storefront views while preserving foreign-key integrity and customer warranty history, with one-click restoration from the `Archived` dropdown view.
  - **Mass Delete** is *destructive* and requires an accessible Alert Dialog pattern (focus-trapped, Escape-safe, explicit `Confirm Delete` vs `Cancel`, per [Radix UI Alert Dialog](https://www.radix-ui.com/primitives/docs/components/alert-dialog)) paired with accessible tri-state header selection (`checked` / `indeterminate` / `unchecked`, per [Radix UI Checkbox](https://www.radix-ui.com/primitives/docs/components/checkbox)) and accessible mode/filter dropdowns ([Radix UI Select](https://www.radix-ui.com/primitives/docs/components/select)).
  - **FK-Safety Guardrail**: When bulk-deleting `products`, any SKU referenced by `customer_purchases` cannot be hard-deleted without violating `customer_purchases_product_id_fkey` (`ON DELETE RESTRICT` in live Postgres). A safe bulk workflow pre-checks linked purchase records, separates FK-protected SKUs from deletable SKUs, and offers one-click **Archive** for those protected items instead.

---

## 2. Codebase Audit of Current Admin & Staff Screens

### 2.1 Bundled `"&"` Navigation Labels & Route Aliases

**Sidebar (`OperationsSidebar.jsx`)** ([OperationsSidebar.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/OperationsSidebar.jsx)):
- `OPERATIONS_LINKS` ([lines 25–31](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/OperationsSidebar.jsx#L25-L31)):
  - `register-sale` -> `'Register Sale & QR'` (line 27)
  - `inquiries` -> `'Inquiries & Pickups'` (line 28; `isRouteActive` aliases `['pickups', 'quotes', 'calendar']` at [line 222](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/OperationsSidebar.jsx#L222))
  - `claims` -> `'Warranty & Claims'` (line 29)
  - `dashboard` -> `'Dashboard'` (line 26, single noun)
  - `orders` -> `'Orders'` (line 30, single noun)
- `CATALOG_LINKS` ([lines 33–37](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/OperationsSidebar.jsx#L33-L37)):
  - `products` -> `'Products & Media'` (line 34; `isRouteActive` aliases `['images', 'add-product']` at [line 223](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/OperationsSidebar.jsx#L223))
  - `customers` -> `'Customers & Tokens'` (line 35)
  - `users` -> `'Users'` (line 36, `adminOnly: true`, single noun)
- Group section heading ([line 416](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/OperationsSidebar.jsx#L416)): `'Catalog & Accounts'` (and live search dropdown header `'Customers & Tokens'` at [line 380](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/OperationsSidebar.jsx#L380)).
- Role wrappers [AdminSidebar.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/AdminSidebar.jsx) and [StaffSidebar.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/staff/StaffSidebar.jsx) pass `roleVariant="admin"` / `"staff"` to `OperationsSidebar`.

**Mobile Bottom Nav (`MobileBottomNav.jsx`)** ([MobileBottomNav.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/MobileBottomNav.jsx)):
- `PRIMARY_TABS` ([lines 3–8](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/MobileBottomNav.jsx#L3-L8)) already uses clean single-word labels: `Dashboard`, `Inquiries`, `Claims`, `Register`, plus `Menu`.

**Page Route Registries (`AdminPage.jsx`, `StaffPage.jsx`, `DashboardLayoutShell.jsx`)**:
- [AdminPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/AdminPage.jsx#L13-L28) and [StaffPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/StaffPage.jsx#L12-L26) map `inquiries`, `calendar`, `pickups`, and `quotes` all to `InquiriesScreen`, and map both `products` and `images` to `ProductsScreen`.
- [DashboardLayoutShell.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/DashboardLayoutShell.jsx#L35-L40) passes `initialTab: 'media'` only when `activeScreen === 'images'`, and passes `preselectedTicketId` for `register-sale`.

---

### 2.2 Screen-by-Screen Audit: Merged Sub-Views, View Defaults, Filters & Bulk Actions

| Screen & File | Merged / Hidden Sub-Views & Modes | Default View & Table/Card Toggle | Existing Filters / Controls | Missing Filters, Toggle, or Bulk Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **DashboardScreen**<br>[DashboardScreen.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/DashboardScreen.jsx) | 4 KPI cards (`lines 558–610`), replenishment alert (`lines 693–739`), top-8 Product Overview (`lines 774–1161`), 3-tab `InspectorDrawer`. | Defaults to `'table'` (`line 65`); **has** Cards/Table toggle (`lines 878–905`). | Search (`line 796`), Stock filter pills (`lines 806–839`), Sort dropdown (`lines 848–859`), Reset (`lines 862–875`). | Missing Category/Type dropdown, simplified filter row, and archive exclusion. |
| **ProductsScreen**<br>[ProductsScreen.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/ProductsScreen.jsx) | Merges **Catalog SKUs** vs **Images & Media Library** via tabs (`lines 164, 908–940`, embedding `<ImagesScreen embedded />`) plus 4 stacked KPI cards (`lines 945–1059`). | Defaults to `'table'` (`line 170`); **has** Table/Cards toggle (`lines 1120–1147`). | Search (`line 1068`), Category `typeFilter` (`line 1089`), `stockFilter` dropdown (`line 1104`), Power pills (`lines 1156–1173`), Sort (`line 1184`). | **No bulk selection checkboxes**, **no batch action bar**, **no Archive state/filter**, **no Mass Archive or Mass Delete**. Page mode uses bulky tabs instead of a clean dropdown. |
| **InquiriesScreen**<br>[InquiriesScreen.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/InquiriesScreen.jsx) | Merges **Calendar** (`week`, `month`, `day`) vs **Table**, AND merges **Consultations** vs **Store Pickups** + 5 KPI cards. | **Defaults to `'calendar'`** (`line 402`), NOT `'table'`. Has Calendar/Table toggle; **no Card Grid view toggle**. | `branchFilter`, `typeFilter`, `statusFilter`, Search. | Should default to `'table'`, add `'cards'` view toggle, streamline mode dropdown (`Table` / `Cards` / `Calendar`), and reduce KPI clutter. |
| **WarrantyClaimsScreen**<br>[WarrantyClaimsScreen.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/WarrantyClaimsScreen.jsx) | Merges **Active Board** (4-column Kanban) vs **Archived** (`activeView: 'board' \| 'archived'`, `lines 94, 401–424`). | **Defaults to Kanban/Cards ONLY**. **Lacks Table view and Table/Card toggle.** | Search, `branchFilter` (`all`/`Cavite`/`Quiapo`), Active/Archived toggle. | Missing **Table view (default) + Cards/Board toggle**, Stage/Status filter dropdown, Issue Category filter, and Sort dropdown. |
| **CustomersScreen**<br>[CustomersScreen.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/CustomersScreen.jsx) | Merges Customer Directory, Access Tokens/Portal Links, Profile editing, Email Verification resend, and Equipment registration inside `InspectorDrawer`. | **Defaults to Card Grid ONLY**. **Lacks Table view and Table/Card toggle.** | Search, `branchFilter`, `warrantyFilter`. | Missing **Table-first default + Table/Card toggle**, Email Status filter dropdown, Sort dropdown, and streamlined header. |
| **OrdersScreen**<br>[OrdersScreen.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/OrdersScreen.jsx) | Single-mode CRUD with inline collapsible Add/Edit form. | **Table on `md+`, stacked cards on `< md`**. **Lacks Table/Card toggle.** | **None.** | Missing Search, Status filter dropdown, Sort dropdown, and Table/Card toggle. |
| **UsersScreen**<br>[UsersScreen.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/UsersScreen.jsx) | Merges **Staff Members** table and **Administrators** table stacked vertically. | **Table on desktop, stacked cards on mobile**. **Lacks Table/Card toggle.** | **None.** | Missing Search, Role dropdown (`All Roles` / `Staff` / `Administrators`), Sort dropdown, and Table/Card toggle. |
| **ImagesScreen**<br>[ImagesScreen.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/ImagesScreen.jsx) | Storage bucket gallery (`product-images`) with Drag & Drop uploader and preview modal. | **Defaults to Card Grid ONLY**. **Lacks Table view and Table/Card toggle.** | Search, Sort (`newest`/`oldest`/`name`/`size`). | Missing **Table view (default) + Table/Card toggle**. |
| **RegisterSaleScreen**<br>[RegisterSaleScreen.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/admin/RegisterSaleScreen.jsx) | Merges **Direct Walk-In Sale** vs **Online Stock Reservation (`JDS-RES-*`)** via `<select>` inside a card. | Form + sticky summary aside. | Branch selector, Reservation dropdown. | Should expose a clean top Mode dropdown (`Walk-In Sale` vs `Fulfill Reservation`) to keep the form minimal when doing walk-ins. |

---

### 2.3 Bulk Selection, Archive & Delete Audit (`ProductsScreen.jsx`, `inventoryUtils.js`, & Live Supabase)
- **`ProductsScreen.jsx`** & **`AdminProductCard.jsx`**: No `selectedIds` state, no header/row/card checkboxes, no archive state, single-item hard-delete only.
- **`inventoryUtils.js`**: No archive filtering helpers or bulk selection/FK-safe delete utilities.
- **Live Supabase Schema Reality (`public.products`)**:
  - Verified via `supabase_mcp` (`list_tables` & `execute_sql` on project `gkrdwzbxpstpqpvqlwbt`):
    - `public.products` currently has **no** `is_archived` or `archived_at` column.
    - `public.customer_purchases.product_id -> public.products.id` has `ON DELETE RESTRICT`.
    - `public.quote_tickets.product_id -> public.products.id` has `ON DELETE SET NULL`.
  - Therefore, hard-deleting any product with `customer_purchases` fails at the DB constraint level; adding `is_archived boolean NOT NULL DEFAULT false` + `archived_at timestamptz` via `supabase_mcp` `apply_migration` unlocks safe Mass Archive/Restore and FK-safe Mass Delete.

---

## 3. Preserved Design Tokens, Data Contracts & Test Invariants

1. **Conventions & Tone ([.agents/AGENTS.md](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/.agents/AGENTS.md) & [GLOSSARY.md](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/GLOSSARY.md))**: Strict zero-emoji ban; Lucide/SVG icons only; industrial terminology.
2. **Warm Ivory `jds-*` Design System ([tailwind.config.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/tailwind.config.js))**: `#efe9df` chrome, `#fcfbf8` canvas, `#ffffff` tables/cards, `#b45309` primary amber, `#211b11` / `#655a4b` inks.
3. **Layout Shell & Role Gating**: Preserve `DashboardLayoutShell`, `InspectorDrawer`, staff price/valuation gating, admin-only `Users` and destructive deletes, and `OPS_UPDATED_EVENT` cross-component sync.
4. **Test Suite Contracts**: Update admin test suites (`DashboardRedesign.test.jsx`, `InquiriesScreen.test.jsx`, `InquiryFulfillment.test.jsx`, etc.) cleanly alongside UI changes while keeping all business logic assertions intact.
