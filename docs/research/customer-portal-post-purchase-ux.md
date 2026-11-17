# Post-Purchase Customer Portal UX Research & Diagnosis

Research conducted to inform the redesign of the JD Solar `Customer Portal` ([CustomerPortalPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/CustomerPortalPage.jsx)).

---

## 1. Primary-Source UX Findings

### 1.1 Nielsen Norman Group (NN/g): Dashboards & Progressive Disclosure
- **Car-Dashboard Metaphor**: NN/g defines a dashboard as an at-a-glance status surface meant for rapid consumption and immediate action—not an expansive dump of raw configuration, legal text, and historical logs ([NN/g Dashboards](https://www.nngroup.com/articles/dashboards-preconditions/)).
- **The Two-Level Rule**: Defer secondary, infrequent, or destructive controls to a secondary layer (Level 2) while keeping primary status and top tasks (80–90% of visits) on Level 1 ([NN/g Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)). Exceeding two disclosure levels hurts usability; keeping everything flat on Level 1 causes cognitive overload.
- **Exception-First Visibility**: Never hide critical/blocking states (such as unconfirmed account email, voided equipment, or an active open service claim) behind hidden menus. Keep exceptions visible on Level 1 while moving static policy prose and account deletion to Level 2.
- **Strong Information Scent**: Secondary triggers must clearly communicate what lies behind them (e.g., `Terms & Policy`, `Account & Security`, `Service Claims (2)`).

### 1.2 Baymard Institute: Accounts & Self-Service Post-Purchase UX
- **Post-Purchase Tracking Is #1**: Across Baymard's Accounts & Self-Service usability benchmarks, post-checkout tracking and self-service status visibility are the single highest-priority customer portal need (~50% of users) ([Baymard Order Tracking & Self-Service](https://baymard.com/blog/order-tracking-ux)).
- **In-Portal Lifecycle Stepper**: Replace raw status strings with a clear visual lifecycle progress bar (e.g., *Diagnostic Intake -> Approved for Replacement -> Handover Complete*) so customers immediately understand what happens next without calling support.
- **Active vs. Historical Separation**: Clearly separate active/open cases from historical/concluded items so healthy accounts feel calm and open tickets get immediate attention.
- **Zero Data Re-Entry & Direct Line-Item Entry Points**: Tie troubleshooting and warranty claims directly to each registered product card with pre-populated product/serial context, rather than burying them behind generic forms.
- **Seamless Email Deep-Linking**: Preserve direct token + email confirmation links (`/portal?token=...&confirm_email=...`) without forcing extra login loops when already authenticated.

### 1.3 Apple Support & Dyson (`MyDyson`): Hardware Post-Purchase Patterns
- **Device-Centric Asset Cards ("My Equipment")**: Both Apple Support and Dyson organize post-purchase portals around clean visual equipment cards—thumbnail/render, model name, one clear coverage badge (`Active` / `Expiring` / `Expired`), and one primary support CTA—avoiding walls of instructional prose inside every card.
- **Contextual Diagnostic Handoff**: Clicking support on a unit launches a guided symptom-triage flow pre-bound to that unit's serial number and model (matching JD Solar's existing [FaultDiagnosticModal.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/FaultDiagnosticModal.jsx)).
- **Visual Repair/Claim Timeline**: Treat hardware claims like modern logistics tracking with explicit step indicators and technician updates surfaced cleanly.

---

## 2. Diagnosis of Current `CustomerPortalPage.jsx` Clutter

Inspecting [CustomerPortalPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/CustomerPortalPage.jsx) reveals five concrete causes of the clunky feel:

1. **Broken Page Background Token**: Lines `339, 389, 399, 436` use `bg-jds-background`, which is not defined in [tailwind.config.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/tailwind.config.js). The page falls back to a stark/transparent background instead of the warm `#fff8f3` (`bg-jds-surface` / `.jds-page-bg`) surface hierarchy (`#fff8f3` canvas -> `#ffffff` `bg-jds-surface-container-lowest` cards).
2. **Flat 6-Section Vertical Monolith**: All sections render stacked at once regardless of user intent:
   - Header + 3-box KPI strip (`Units`, `Warranties`, `Claims`)
   - Email confirmation banner
   - Purchased Products grid
   - Full 2-column *2-Year Solar Warranty & Case Evaluation Policy* prose card (`lines 765–803`), duplicating [WarrantyTermsModal.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/WarrantyTermsModal.jsx)
   - Service & Diagnostic Claims list
   - *Account Password & Security* card (`lines 877–910`), duplicating the header's `Change Password` button (`line 464`)
   - Permanent red *Delete Account* Danger Zone card (`lines 913–937`) anchored at the bottom of the portal
3. **Purchase Card Bloat & Duplicate Metadata**:
   - `Serial #` is rendered **twice** inside every single purchase card (`lines 624–628` and `line 754`).
   - Every card embeds a nested gradient *Troubleshooting & Claims* box (`lines 690–750`) containing a multi-line instructional paragraph repeated per unit.
4. **Raw Claim Presentation**: Claims render flat status badges and raw quoted descriptions without a visual step-by-step progress bar showing where the ticket sits in JD Solar's evaluation workflow.
5. **Visual & Tone Alignment**: Per [.agents/AGENTS.md](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/.agents/AGENTS.md) and [GLOSSARY.md](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/GLOSSARY.md), the `Customer Portal` must use zero emojis, consultative industrial clarity, and Lucide/SVG icons only.

---

## 3. Preserved Data Contracts & Test Invariants

Any redesign of [CustomerPortalPage.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/CustomerPortalPage.jsx) **must** preserve:
- **Security & Auth Guards**:
  - Unauthenticated `/portal?token=...` redirect to `/login?token=...` and cross-customer token mismatch redirect ([ForwardedUuidLoginEnforcement.test.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/__tests__/ForwardedUuidLoginEnforcement.test.jsx)).
  - Manual access-key fallback (`!token`), loading state, and error recovery clearing `jd_customer_token`.
- **First-Time Warranty Modal & Review Trigger**:
  - Auto-opening [WarrantyTermsModal.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/components/WarrantyTermsModal.jsx) when `localStorage.getItem('jd_warranty_ack_' + token) !== 'true'`, and a visible `Terms & Policy` button on the initial portal view ([AccountCreationWarrantyModal.test.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/__tests__/AccountCreationWarrantyModal.test.jsx)).
- **Email Confirmation Lifecycle**:
  - Rendering `Awaiting Email Confirmation`, `Confirmation email sent to <email>`, and `Resend Confirmation Email` when unconfirmed, and auto-verifying `?confirm_email=...` with `Your email address has been verified and confirmed` ([CustomerEmailConfirmation.test.jsx](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/pages/__tests__/CustomerEmailConfirmation.test.jsx)).
- **Service Layer Integration**:
  - [customerService.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/customerService.js) (`fetchCustomerPortalData`, `getCustomerAuthStatus`, `setCustomerPassword`, `deleteCustomerAccount`, `confirmCustomerEmailByToken`, `queueAndSendCustomerConfirmationEmail`) and [warrantyUtils.js](file:///home/ram/Projects/Cross-platform/Solar_App_Capstone_Project/frontend/src/lib/warrantyUtils.js) (`formatDate`, `formatRemainingText`, `getClaimStatusMeta`).
