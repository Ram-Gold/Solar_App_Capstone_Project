# Customer Warranty Claim Validation & Animated Confirmation

Status: ready-for-agent

## Problem Statement

When a customer in the **Customer Portal** opens an equipment unit to file a **Warranty Claim**, enters fault details, and presses the submit button (`Submit Warranty Claim Ticket`), the existing `AnimatedConfirmation` success animation is intermittently or completely skipped. Triggering a full-page reload on claim submission unmounts the active modal before the confirmation animation can play, dropping the customer back onto a fresh screen or an unconfirmed state without clear visual assurance that their **Warranty Claim** was registered. In addition, form validation errors and failed submissions need clear inline validation feedback so customers know immediately why a submission could not proceed or how to fix missing information.

## Solution

Wire the **Customer Portal** claim submission lifecycle so that validation, submission progress, and the existing `AnimatedConfirmation` checkmark transition work reliably end-to-end without unmounting or interrupting the modal:

1. Show immediate, clear inline validation feedback in the claim form when required fields or attachment limits are violated, as well as a clear submission-error alert when the backend rejects a claim, while preserving user input.
2. When `submitWarrantyClaim` succeeds, transition the modal cleanly into the existing `AnimatedConfirmation` SVG checkmark splash for its 1800ms duration while refreshing **Customer Portal** claim records silently in the background (without flipping the page-level loading gate that unmounts modals).
3. During the animated confirmation splash, lock the modal tab bar so the customer cannot accidentally switch back to the troubleshooting tab mid-transition, and once the animation finishes, display the registered ticket confirmation card (`TICKET #CLAIM-...`) with actions to view the ticket in **Service Claims** or return to the **Customer Portal**.

## User Stories

1. As a Customer Portal user, I want clear inline validation messages if I try to submit a Warranty Claim without a fault description or with invalid media attachments, so that I know exactly what to correct before retrying.
2. As a Customer Portal user, I want my selected hardware symptom categories, written fault description, and uploaded media list to stay intact if validation fails or a network error occurs, so that I do not have to re-type my report.
3. As a Customer Portal user, I want the submit button to enter a disabled loading state while attachments upload and the Warranty Claim is being saved, so that I do not accidentally submit duplicate tickets.
4. As a Customer Portal user, I want the existing animated circular checkmark confirmation (`AnimatedConfirmation`) to appear immediately inside the modal upon successful Warranty Claim submission, so that I have unmistakable visual confirmation that my request succeeded.
5. As a Customer Portal user, I want the Customer Portal's background data refresh after claim submission to happen silently without unmounting the modal, so that the confirmation animation is never interrupted or hidden by a page-level loading spinner.
6. As a Customer Portal user, I want to see my newly generated Warranty Claim ticket code (`TICKET #CLAIM-...`) displayed cleanly inside the confirmation animation and follow-up summary card, so that I have an immediate reference number for Quiapo or Cavite technician follow-up.
7. As a Customer Portal user, I want modal navigation tabs to be hidden or disabled while the confirmation animation is playing, so that an accidental tap does not switch views mid-confirmation.
8. As a Customer Portal user, I want the animated confirmation to smoothly transition after its timer completes into the final confirmation summary view, so that I can read next steps at my own pace before dismissing the modal.
9. As a Customer Portal user, I want a clear primary action on the final confirmation summary to either track my newly filed Warranty Claim in the Service Claims tab or close back to My Equipment, so that I can verify its `Diagnostic Intake` status immediately.
10. As a Customer Portal user closing the confirmation screen via the close button, backdrop click, or action button, I want modal form state cleanly reset before the next time I open it, so that filing a future claim on another unit starts fresh.

## Implementation Decisions

- **Background Portal Refresh Separation**: Separate initial blocking page loads from silent post-mutation refreshes in `CustomerPortalPage` (e.g., a silent refresh parameter on data loading). Post-claim refreshes invoked through `onClaimSubmitted` must update `purchases` and `claims` state in place without toggling the full-screen `loading` gate, ensuring `FaultDiagnosticModal` remains mounted throughout `AnimatedConfirmation` and the final ticket summary.
- **Reuse Existing Confirmation Primitive**: Reuse `AnimatedConfirmation` inline inside the claim view of `FaultDiagnosticModal` upon submission success (`isSuccess` + `isConfirmedTransition`), matching the pattern already established in `QuoteModal`, `RecordSaleModal`, and `CustomerPortalPage` password updates. Do not introduce a second competing confirmation widget.
- **Validation UI Standardization**: Validate issue categories (at least one category selected), non-empty fault description (trimmed check with custom inline error messaging and accessible field error styling rather than relying solely on native browser validation tooltips), and evidence attachment constraints (maximum 4 files, 15MB per file) cleanly before invoking the submission service. Ensure any inline validation or server error banner (`role="alert"`) clears as the customer fixes the invalid field.
- **Modal State Isolation During Confirmation**: While `isConfirmedTransition` or `isSuccess` is active in `FaultDiagnosticModal`, suppress the top wizard/claim tab switcher (mirroring `QuoteModal`'s step/tab suppression during confirmation playback) so users cannot jump back into the troubleshooter while the confirmation animation is running. Reset confirmation, success, error, attachment, and description states atomically when closing.
- **Post-Confirmation Navigation to Service Claims**: Support navigating directly to the **Service Claims** lifecycle tracker tab (`Diagnostic Intake` step) from the post-confirmation summary CTA (via an optional callback from `CustomerPortalPage`), while keeping backward compatibility when `FaultDiagnosticModal` is dismissed normally.
- **Copy & Tone Consistency**: Keep all confirmation titles, descriptions, validation errors, and button labels strictly text-only (no emojis), consultative, and aligned with **Customer Portal** and **Warranty Claim** terminology in the project glossary.

## Testing Decisions

- **Primary Test Seam**: Test at the highest practical UI integration seam by rendering `CustomerPortalPage` together with its child `EquipmentCard`, `FaultDiagnosticModal`, `AnimatedConfirmation`, and **Service Claims** (`ClaimTrackerCard`) components, mocking only the external `customerService` API module and `AuthContext` at the boundary.
- **Behavioral Coverage (External Behavior Only)**:
  - Submitting with missing description or oversized/excess media displays accessible inline validation feedback without calling `submitWarrantyClaim`.
  - Backend rejection from `submitWarrantyClaim` surfaces an inline error alert and keeps user inputs intact without showing `AnimatedConfirmation`.
  - Successful `submitWarrantyClaim` triggers silent background refresh (`fetchCustomerPortalData`) **without** unmounting `FaultDiagnosticModal` or showing the page-level loading spinner.
  - `AnimatedConfirmation` renders immediately with the claim confirmation title and `TICKET #CLAIM-...` reference code, holds the summary screen until the 1800ms timer finishes (verified via Vitest fake timers), and then renders the final summary view with updated claim data waiting in **Service Claims**.
- **Prior Art**: Follow the fake-timer confirmation transition testing approach in `QuoteModalConfirmation.test.jsx` and the Customer Portal integration setup in `CustomerPortalRedesign.test.jsx`.

## Out of Scope

- Changing the core SVG stroke timing, motion curves, or props API of `AnimatedConfirmation`.
- Modifying Postgres RPCs, RLS policies, or expired/duplicate claim eligibility rules (tracked separately in `.scratch/input-and-conflict-audit/`).
- Altering the 5-step solar diagnostic wizard decision tree rules or telemetry engine.

## Further Notes

- Audit inspection showed `FaultDiagnosticModal` already imports `AnimatedConfirmation`, but `CustomerPortalPage`'s `onClaimSubmitted` handler called `loadData(token)` synchronously with `setLoading(true)`, causing an immediate unmount of the modal container right after submission succeeded. Fixing this lifecycle interaction alongside inline validation UI makes the existing confirmation reliable in live usage.
