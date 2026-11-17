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
A temporary 48-hour allocation (`is_reservation = true`) locking branch inventory (`reserved_quiapo` or `reserved_cavite`, and combined `reserved_quantity`) on a Store Pickup until fulfilled by sale, cancelled, or purged.
_Avoid_: Backorder, stock lock

**Inquiry Fulfillment**:
Completion progress across non-cancelled Inquiries (`Completed` divided by `Pending + Confirmed + Completed`), tracked alongside active Store Pickups and active Consultation Visits.
_Avoid_: Conversion funnel, lead velocity

**Order**:
A confirmed equipment sale or installation record tracked through fulfillment.
_Avoid_: Purchase, transaction

**Warranty Claim**:
A customer-submitted or staff-logged post-sale defect or service ticket tracked through `Diagnostic Intake` (`in_review`), `Approved for Release` (`approved`), `Handover Complete` (`resolved`), and `Declined` (`rejected`).
_Avoid_: Support ticket, RMA, return
