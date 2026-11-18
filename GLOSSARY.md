# JD Solar Platform

Consultative industrial solar equipment catalog, guided system matching, customer warranty tracking, and staff/admin operations platform.

## Language

**Product Catalog**:
The public equipment browsing and filtering experience (`/browse`).
_Avoid_: Storefront, shop, cart

**Product Matcher**:
The interactive multi-step guided recommendation flow (`/match`) that matches customer site, load, and budget requirements to solar equipment.
_Avoid_: Match wizard, configurator, quiz

**Customer Portal**:
The authenticated customer view (`/portal`) for tracking registered purchases, warranties, fault diagnostics, and warranty claims.
_Avoid_: Customer dashboard, client area, user account

**Staff Workspace**:
The operational interface (`/staff`) for staff members to manage inquiries, sales registration, customers, warranties, products, and orders.
_Avoid_: Staff dashboard, backoffice

**Admin Console**:
The full-privilege operational interface (`/admin`) that extends Staff Workspace with user and role management.
_Avoid_: Admin dashboard, control panel

**Inquiry**:
A consultative customer request (`quote_tickets`) spanning two subtypes: **Consultation Inquiry** and **Store Pickup**.
_Avoid_: Quote cart, checkout, lead

**Consultation Inquiry**:
A customer request (`JDS-INQ-*`) for technical quotation, system sizing, or a scheduled showroom or site consultation without a physical inventory hold.
_Avoid_: Lead, support call

**Store Pickup**:
A customer reservation ticket (`JDS-RES-*` or pickup/purchase purpose) for counter equipment pickup with an optional 48-hour **Stock Hold**. Active Store Pickups are tickets in `Pending` or `Confirmed` status.
_Avoid_: Cart order, layaway

**Stock Hold**:
A temporary 48-hour allocation (`is_reservation = true`) on a **Store Pickup** that deducts directly from sellable branch and total stock (`stock_quiapo` / `stock_cavite` and `stock_quantity`) at reservation time and restores it if cancelled or purged. `reserved_quantity` (`reserved_quiapo` / `reserved_cavite`) tracks the held unit count for audit visibility.
_Avoid_: Backorder, stock lock

**Physical Stock / Available Stock**:
A single unified sellable unit count (`stock_quantity === stock_quiapo + stock_cavite`) across **Admin Console**, **Staff Workspace**, and **Product Catalog**, with no separate hidden reservation subtraction.
_Avoid_: Split stock, phantom availability

**Inquiry Fulfillment**:
Completion progress across non-cancelled Inquiries (`Completed` divided by `Pending + Confirmed + Completed`), tracked alongside active Store Pickups and active Consultation Visits.
_Avoid_: Conversion funnel, lead velocity

**Order**:
A confirmed equipment sale or installation record tracked through fulfillment.
_Avoid_: Purchase, transaction

**Warranty Claim**:
A customer-submitted or staff-logged post-sale defect or service ticket (limited to one lifetime claim per registered product purchase) tracked through `Diagnostic Intake` (`in_review`), `For Verification / Checking` (`checking`), `Approved for Repair / Replacement` (`approved`), `Ready for Release / Pickup` (`ready_for_release`), `Handover Complete` (`resolved`), and `Declined` (`rejected`).
_Avoid_: Support ticket, RMA, return

**Showroom Branch**:
One of JD Solar's two physical locations (`Quiapo Showroom (Manila)` and `Cavite Distribution Hub`) where customers schedule **Store Pickups** and **Consultation Inquiries**, each displaying live Open or Closed status.
_Avoid_: Store, warehouse, outlet

**Operating Hours**:
The active showroom schedule of Monday through Saturday, 8:00 AM to 5:30 PM (`Asia/Manila`), closed Sundays; only valid 30-minute time slots within Operating Hours are offered for scheduling.
_Avoid_: Store hours, 24/7 availability
