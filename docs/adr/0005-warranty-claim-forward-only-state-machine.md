# 0005. Forward-Only Warranty Claim State Machine with Admin Audited Overrides

Status: accepted

## Context

Previously, `WarrantyClaimsScreen` allowed unrestricted free-form drag-and-drop and dropdown transitions between any of the six Warranty Claim stages, including moving completed or closed claims (`Handover Complete`, `Declined`) backward without any role restriction or audit trail.

## Decision

We enforce a **forward-only state machine** for `warranty_claims.status` (`in_review` -> `checking` -> `approved` -> `ready_for_release` -> `resolved`, with `rejected` reachable from `in_review` or `checking`):
1. **Staff**: May only advance claims forward. Completed prior stages are dimmed and disabled in the Ticket Detail Drawer (`Completed` badge), disabled in Table/Cards `<select>` controls, and blocked on Kanban drag-and-drop. Terminal claims (`resolved`, `rejected`) are locked from dragging for Staff.
2. **Admin Audited Override**: Admins may perform a backward reversal or reopen a terminal claim only by providing a mandatory **Override Reason**, which is appended to `staff_notes` as an immutable `[ADMIN OVERRIDE]` timestamped entry.

## Consequences

- Prevents accidental backward regression of processed intake, verification, or handover stages.
- Every exceptional reversal is attributable and visible in `staff_notes` without requiring a separate audit table migration.
