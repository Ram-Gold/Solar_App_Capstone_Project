# 01: Inquiry Lookup by Phone in Direct Walk-In Sale

**What to build:** When a Staff Member or Administrator enters a mobile phone number in Direct Walk-In Sale mode on Register Sale and no existing Customer profile is found, the system also searches open Inquiries (`Pending` or `Confirmed` Consultation Inquiries and Store Pickups) matching that phone number. When an open Inquiry is found, the form surfaces an "Open Inquiry Found" indicator (showing ticket code, inquiry type, and inquired product) and pre-fills the customer's full name, email, Showroom Branch, and inquired product(s) so they appear immediately for the walk-in sale.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Entering a mobile phone number for a Public Guest who submitted a Consultation Inquiry or Store Pickup (with no prior Customer record) surfaces their open Inquiry in Direct Walk-In Sale mode.
- [ ] Customer full name, email, Showroom Branch, and inquired product(s) are pre-filled without overwriting values already entered by the operator.
- [ ] Existing Customer profile lookup continues to take precedence for returning Customers, and automated tests cover both Customer-match and Inquiry-match paths.
