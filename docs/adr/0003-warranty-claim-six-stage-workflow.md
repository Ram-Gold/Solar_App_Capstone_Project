# 0003. Warranty Claim Six-Stage Staff Workflow and Three-Step Customer Mapping

Status: accepted

## Context

Staff and reviewers found the original four-column Warranty Claims Kanban (`Diagnostic Intake`, `Approved for Release`, `Handover Complete`, `Declined`) too coarse to distinguish between initial intake triage vs. active bench verification, and between repair/replacement authorization vs. unit readiness at the branch counter.

## Decision

We expanded `warranty_claims.status` and the Staff Workspace / Admin Console Kanban board to six canonical stages:
1. `in_review` — **Diagnostic Intake** (legacy `pending` normalizes here)
2. `checking` — **For Verification / Checking**
3. `approved` — **Approved for Repair / Replacement**
4. `ready_for_release` — **Ready for Release / Pickup**
5. `resolved` — **Handover Complete**
6. `rejected` — **Declined**

On the Customer Portal (`ClaimTrackerCard`), we intentionally keep the simplified 3-step lifecycle stepper (`Diagnostic Intake` -> `Approved for Release` -> `Handover Complete`), mapping `checking` into step 1 (`Diagnostic Intake`) and `ready_for_release` into step 2 (`Approved for Release`) while still displaying the exact status badge and technician notes.

## Consequences

- Staff get granular operational handoffs and stage-specific **Next Action Required** tooltips (`?` icon) on both Kanban column headers and the ticket detail drawer.
- `OperationsSidebar` and `DashboardScreen` count `in_review`, `pending`, and `checking` as active triage/bench claims requiring attention.
- Future contributors must not "fix" the Customer Portal stepper to 6 steps without product approval, as the 3-step customer view is an intentional abstraction.
