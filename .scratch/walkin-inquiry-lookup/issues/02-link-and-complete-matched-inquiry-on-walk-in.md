# 02: Link & Complete Matched Inquiry on Direct Walk-In Sale

**What to build:** Allow a Staff Member or Administrator to keep or clear a matched open Inquiry during a Direct Walk-In Sale so that completing the sale marks the Inquiry as `Completed`, updates Inquiry Fulfillment metrics, and deducts Physical Stock accurately based on whether the Inquiry held a Stock Hold (`is_reservation = true`) or not (`is_reservation = false`).

**Blocked by:** 01: Inquiry Lookup by Phone in Direct Walk-In Sale

**Status:** ready-for-agent

- [ ] Operator can confirm or unlink the matched open Inquiry before submitting a Direct Walk-In Sale.
- [ ] Submitting a Direct Walk-In Sale with a linked Inquiry transitions the ticket to `Completed`, clears any reservation hold/expiry metadata, and deducts branch Physical Stock without double-deducting or touching unrelated Stock Holds.
- [ ] Automated tests verify end-to-end completion for both Consultation Inquiries (`is_reservation = false`) and Store Pickups (`is_reservation = true`) via Direct Walk-In Sale.
