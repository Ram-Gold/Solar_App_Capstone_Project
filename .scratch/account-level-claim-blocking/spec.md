Status: ready-for-agent

## Problem Statement

A customer who already has a Warranty Claim on their account can still open the Solar Troubleshooting Guide modal in the Customer Portal, switch to the File Warranty Claim tab or click the wizard's escalation button, and submit a second Warranty Claim ticket. Because the previous one-claim-per-purchase check only gated the Equipment Card button and checked per-purchase in the service layer, the manual troubleshooting flow bypassed the restriction and allowed duplicate Warranty Claims on the same customer account.

## Solution

Enforce an **account-level** one-Warranty-Claim check across the Customer Portal UI, the troubleshooting modal, the client service layer, and the database submission RPC/trigger:

1. **Customer Portal & Equipment Cards**: If the customer account already has any Warranty Claim (regardless of which registered unit or claim status), all Equipment Cards and the Solar Troubleshooting Guide block new Warranty Claim filing and direct the customer to track or view their existing claim.
2. **Troubleshooting Modal Guard**: Inside the Solar Troubleshooting Guide, when an account-level Warranty Claim already exists, the File Warranty Claim tab and the wizard's escalation buttons are disabled/blocked with a clear notice and a button to view the existing claim in Service Claims, while self-diagnostic troubleshooting remains available.
3. **Service & Database Enforcement**: The claim submission service and backend submission RPC/trigger check for any existing Warranty Claim belonging to the customer account (`customer_id` across all `customer_purchases` for that customer) and reject duplicate submissions with a clear error message.

## User Stories

1. As a customer with an existing Warranty Claim on my account, I want the Solar Troubleshooting Guide to block filing another Warranty Claim, so that I do not accidentally submit duplicate tickets.
2. As a customer with an existing Warranty Claim on my account, I want to still use the Troubleshooting Wizard for self-diagnostics, so that I can troubleshoot my solar equipment without being locked out of guidance.
3. As a customer trying to escalate from the Troubleshooting Wizard when my account already has a Warranty Claim, I want the escalation action blocked with a clear explanation and a shortcut to my existing claim, so that I know where to check my ticket status.
4. As a customer with multiple registered equipment units on my account, I want the account-level Warranty Claim check to block filing a second claim across any unit on my account, so that the one-claim-per-account policy is consistently enforced.
5. As a customer viewing my Equipment Cards in the Customer Portal, I want the File Claim button hidden when my account already has a Warranty Claim, so that the card UI matches the account-level restriction.
6. As a customer who opens the Troubleshooting Guide directly and switches to the File Warranty Claim tab, I want the form replaced or blocked with my existing claim notice, so that I cannot submit a duplicate form.
7. As a customer or API caller attempting to submit a Warranty Claim directly through the backend RPC or table insert while my account already has a claim, I want the database to reject the request with an explicit error, so that the rule cannot be bypassed outside the UI.
8. As a staff member or admin triaging Warranty Claims in the Staff Workspace or Admin Console, I want duplicate customer-submitted claims prevented at the source, so that the Kanban board stays clean and free of duplicate tickets.

## Implementation Decisions

- **Account-Level Claim Lookup**: Derive `hasAccountClaim` and `existingAccountClaim` from the customer's loaded `claims` list in the Customer Portal and pass `existingAccountClaim` into both the Equipment Card list and the Solar Troubleshooting Guide modal.
- **Troubleshooting Modal Blocking**:
  - When `existingAccountClaim` is present, disable or replace the File Warranty Claim tab and block wizard escalation actions, displaying an informational banner with the existing ticket reference and a button to navigate to Service Claims.
  - Guard the claim form submission handler so it cannot invoke `submitWarrantyClaim` when `existingAccountClaim` is present.
- **Client Service Enforcement**:
  - In the claim submission service, before falling back to direct insert and when handling RPC failures, check whether any Warranty Claim already exists across any purchase owned by the customer account and throw a descriptive error if found.
- **Database RPC & Trigger Enforcement**:
  - Update the `submit_warranty_claim` RPC to check for any existing Warranty Claim linked to `v_customer_id` (via `customer_purchases`) and return `{ success: false, error }` if one exists.
  - Update the `BEFORE INSERT` trigger on `warranty_claims` to check for any existing claim belonging to the same `customer_id` (across all `customer_purchases` for that customer) and raise a unique-violation error (`23505`).

## Testing Decisions

- **Good Test Principles**: Test external user-visible behavior and service error contracts rather than internal React state or CSS classes.
- **UI Seam (`FaultDiagnosticModal` / `CustomerPortalPage`)**:
  - Render the troubleshooting modal with `existingAccountClaim` provided and verify that the File Warranty Claim tab and wizard escalation cannot be used to submit a claim, and that an existing-claim notice with a Track/View Claim action is shown instead while the Troubleshooting Wizard remains usable.
  - Render `CustomerPortalPage` with an account that has an existing claim and verify that opening the troubleshooting guide on any unit blocks claim filing.
- **Service Seam (`submitWarrantyClaim`)**:
  - Verify that when the RPC rejects with an account-level duplicate error (or when the fallback finds an existing claim on the customer's purchases), `submitWarrantyClaim` rejects with an error and does not insert a duplicate row.
- **Prior Art**: Existing tests in `CustomerPortalRedesign.test.jsx`, `FaultDiagnosticMultiChoice.test.jsx`, and `EquipmentCardSingleClaim.test.jsx`.

## Out of Scope

- Automatically deleting or merging historical duplicate test claims already present in the database.
- Changing how Admin or Staff members manage or archive existing claims in the Admin Console.

## Further Notes

- Respects `GLOSSARY.md` canonical terminology (**Customer Portal**, **Warranty Claim**, **Staff Workspace**, **Admin Console**).
- Supersedes the per-purchase-only scope in ADR-0006 with account-level enforcement.
