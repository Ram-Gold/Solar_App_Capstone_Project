# 03: Include Open Consultation Inquiries in Ticket Fulfillment Selector

**What to build:** Expand the ticket selector on Register Sale so Staff Members and Administrators can also search and select open Consultation Inquiries (`JDS-INQ-*`) alongside Store Pickups (`JDS-RES-*`), ensuring any inquiring customer can be found and converted to a sale regardless of whether they booked a formal Stock Hold.

**Blocked by:** 02: Link & Complete Matched Inquiry on Direct Walk-In Sale

**Status:** ready-for-agent

- [ ] Open (`Pending` / `Confirmed`) Consultation Inquiries appear in the Register Sale ticket selector alongside Store Pickups, clearly labeled by ticket type (`JDS-INQ-*` vs `JDS-RES-*`).
- [ ] Selecting a Consultation Inquiry pre-fills customer details, Showroom Branch, and inquired product(s), and validates unreserved Physical Stock before submission.
- [ ] Automated tests verify that selecting and completing a Consultation Inquiry from the ticket selector marks it `Completed` and deducts unreserved branch stock.
