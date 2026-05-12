# HR Contracts PRD

## 1. Overview

The current `HR > Contracts` screen is a frontend-only placeholder. It displays mock contract rows and a non-persistent "New Contract" form, while `View` and `Download` actions are cosmetic.

This PRD defines the requirements to turn contracts into a fully workable HR module for hotel operations, including:

- real contract persistence
- salary history persistence for analytics
- contract lifecycle workflows
- generated and uploaded document handling
- approval and signature flow
- notifications and expiry reminders
- reporting for staffing and payroll planning

This module is scoped to `HR > Contracts` and is intentionally separate from Finance contracts.

## 2. Goals

1. Replace display-only contract UI with real CRUD backed by the database.
2. Let HR create, review, approve, renew, terminate, and download employment contracts.
3. Attach employee contract records to staff, departments, and job roles already in the system.
4. Support contract document storage and generated PDFs.
5. Provide expiry visibility, reminders, and renewal actions.
6. Maintain a reliable audit trail for all contract decisions and state changes.

## 3. Non-Goals

The first implementation should not include:

- payroll calculation
- finance contract workflows
- full legal clause builder
- highly customizable template designer
- complex multi-country legal compliance engine
- staff self-service contract viewing in phase 1

These can be layered on later once the core workflow is stable.

## 4. Users

### Primary Users

- HR Manager
- Hotel Admin
- General Manager

### Secondary Users

- Department Heads
- Staff members viewing their own contracts

## 5. Current State

Current implementation in [hr/contracts/page.tsx](/var/www/html/hotel-os/apps/web/src/app/(dashboard)/hr/contracts/page.tsx):

- uses hardcoded contract data
- computes `Active`, `Expiring Soon`, `Expired`, and `Draft` from mock rows only
- has a `New Contract` modal with no submission handling
- has non-functional `View` and `Download` actions
- has no backend contracts module
- has no document storage, PDF generation, notification, approval, or audit support

### 5.1 Implementation Status

Current delivery status:

- Phase 1 complete in code:
  - contracts persistence
  - compensation history persistence
  - live contracts list page
  - contract creation
  - contract detail view
  - derived status calculation
  - plain-text download placeholder
- Phase 2 complete in code:
  - contract document model
  - document upload/list/view wiring in contract details
  - uploaded document metadata persistence
  - pragmatic document references using stored URLs and data URLs
- Phase 3 started in code:
  - generated contract PDF download
  - canonical generated contract document persisted against the contract
- Phase 4 started in code:
  - early termination action with termination date and reason
  - terminated contracts retain explicit termination metadata
- Renewal workflow implemented in code:
  - renew action creates a linked successor contract
  - prior contract is marked superseded
  - renewal chain is queryable from contract details
- Approval workflow implemented in code:
  - submit for approval
  - approve
  - reject with reason
  - contract-level submission and approval metadata
- Approval route configuration and multi-step chains implemented in code:
  - hotel approval routes can be created and updated
  - contract-type routes resolve before hotel default routes
  - approval submission creates ordered approval steps on the contract
  - approval and rejection now act against the current pending step
- Audit/history polish implemented in code:
  - contract actions now write audit events
  - contract detail surfaces a history timeline
  - `HR > Audit Logs` provides a searchable cross-contract history page
- Notifications implemented in code:
  - expiring contract digest notifications
  - stale pending-approval digest notifications
  - stale awaiting-signature digest notifications
  - immediate approver-turn notifications when a contract reaches the next approval step
  - manual notifications scan trigger
- HR IA split implemented in code:
  - `HR > Overview` now backed by dedicated reporting queries and widgets
  - `HR > Settings` scaffold with tabbed settings structure
  - approval route management moved out of contracts into settings
- HR settings implemented in code:
  - notification settings panel
  - contract template settings panel
  - contract document policy settings panel
- Reporting dashboards implemented in code:
  - dedicated HR overview reporting query
  - summary KPI cards for staff, coverage, approvals, renewals, and terminations
  - department coverage and salary exposure widgets
  - contract status/type mix widgets
  - compensation change trend widget
  - expiring contracts, approval queue, and recent activity widgets
- Deeper reporting slices implemented in code:
  - approval performance by role
  - department contract health
  - document compliance reporting
- Lifecycle hardening implemented in code:
  - `Awaiting Signature` is now a real lifecycle state
  - sign action activates contracts and records signature metadata
  - submission/signing now enforce contract document policy
  - direct `ACTIVE` creation and renewal paths now respect document-policy restrictions
  - generic contract edit no longer allows arbitrary manual status transitions

### 5.2 Where We Are Now

The module now supports a workable operational baseline:

- HR can create contracts against real staff records
- the system snapshots staff, department, position, and salary context onto the contract
- compensation history is queryable separately for analytics
- contract status is derived from lifecycle state and end dates
- HR can open contract details, upload supporting files, and view uploaded documents

The core contract lifecycle now covers generated PDFs, early termination, renewals, configurable approval routes, multi-step approval chains, contract audit history, HR contract notifications, and a dedicated `HR > Overview` reporting dashboard alongside `HR > Settings`.

The latest pass also closes the main lifecycle bypasses: contracts now move through explicit approval/signature actions, document policy is enforced at submission and activation, and direct activation is blocked when hotel policy requires pre-existing paperwork that cannot yet exist.

### 5.3 What Comes Next

Recommended next build order after the current hardening pass:

1. Restrict which contract fields remain editable once a contract leaves `DRAFT` or `REJECTED`
2. Decide whether direct `ACTIVE` creation should remain available at all under relaxed hotel policies, or be removed entirely in favor of draft-first workflows
3. Add stronger document workflow helpers such as explicit required-document checklists and “generate before submit” affordances
4. Expand reporting further with approval SLA trends, renewal conversion, and department-by-department contract history over longer windows

### 5.4 Backlog / To-Do

- Link contract salary and compensation history more clearly into the staff page so HR can see current contract-backed pay context from the staff profile
- Add a dedicated contract documents tab in staff details so generated and uploaded files have their own focused surface alongside the staff record

## 6. Product Goals

### 6.1 Operational Reliability

HR should be able to create and track all staff employment contracts from one place without relying on spreadsheets or offline files.

### 6.2 Document Integrity

Each contract should have a canonical generated document plus any supporting uploads such as signed copies, IDs, and certifications.

### 6.3 Lifecycle Visibility

The system should clearly show what is active, nearing expiry, expired, renewed, terminated, pending approval, or awaiting signatures.

### 6.4 Management Insight

Leadership should be able to understand staffing exposure, renewals due soon, and salary commitments by department and contract type.

### 6.5 Historical Integrity

Signed contracts must preserve what was true at the time they were issued, even if the linked staff profile later changes department, position, or employee code.

## 7. Core Features

### 7.1 Contract Persistence

The module must support:

- creating contracts from the UI
- editing draft and eligible contract records
- listing contracts with search and filters
- viewing contract detail pages
- downloading generated contract PDFs
- storing the canonical contract record in the database

### 7.2 Contract Lifecycle Management

The module must support:

- `Draft`
- `Pending Approval`
- `Approved`
- `Awaiting Signature`
- `Active`
- `Expiring Soon`
- `Expired`
- `Terminated`
- `Superseded`

Rules:

- `Expiring Soon` and `Expired` should not be hardcoded in seed data
- status should be derived from contract dates and lifecycle fields
- lifecycle actions should be logged in an audit trail

### 7.3 Renewal Workflow

Renewal should support:

- one-click `Renew` from an active or expiring contract
- creation of a new contract linked to the prior contract
- copying relevant contract template data into the new record
- preserving old contract as historical
- marking prior contract as `Superseded` or `Expired` as appropriate
- generating a fresh contract document for the renewed contract

Renewal should not automatically copy all uploaded supporting documents from the old contract.

### 7.4 Termination Workflow

Termination should support:

- early contract termination before end date
- termination date
- termination reason
- terminated by user
- optional supporting document upload

### 7.5 Document Management

Document handling should support two categories:

1. Generated documents
- offer letter
- contract document
- renewal letter
- termination letter

2. Uploaded supporting documents
- signed contract
- CV
- ID/passport
- certificates
- references
- visa/work permit
- other staff documents

Each contract should have a document tab and document history.

### 7.6 Approval Workflow

Contracts should support a basic approval chain:

1. Draft created
2. Submitted for approval
3. Manager approves
4. HR countersigns or finalizes
5. Contract becomes active

The implementation should be simple first, with configurable complexity later.

Approval route resolution should follow:

- contract type route
- hotel default route
- system fallback route

### 7.7 Notifications and Reminders

The system should run daily checks for:

- contracts expiring in 90 days
- contracts expiring in 60 days
- contracts expiring in 30 days
- contracts already expired
- drafts awaiting approval too long
- contracts awaiting signature too long

Notifications should be sent to:

- HR users
- hotel managers
- optionally the relevant department head

Default threshold:

- `contractExpiryWarningDays = 60`

This must be configurable per hotel.

### 7.8 Reporting

Initial reporting should support:

- active contracts count
- expiring soon count
- expired count
- draft count
- headcount by contract type
- headcount by department
- upcoming renewals in next 30/60/90 days
- current monthly salary commitment by department

## 8. Functional Requirements

### FR-1 Contract Creation

System must allow HR to create a contract with:

- staff member
- department
- position/job title
- department snapshot
- position snapshot
- employee code snapshot
- staff name snapshot
- contract type
- start date
- end date when applicable
- salary
- probation period when applicable
- reporting manager
- notes
- approval route

### FR-2 Contract Storage

System must persist contracts in the database and link them to existing entities using foreign keys.

System must also persist contract snapshots and salary history records for reporting fidelity.

### FR-3 Contract View

System must provide a contract detail page with:

- summary
- lifecycle timeline
- approval state
- documents tab
- audit log
- renewal and termination actions

### FR-4 Downloadable Documents

System must generate and store downloadable PDFs for contract-related documents.

### FR-5 Dynamic Status

System must compute statuses such as `Expiring Soon` and `Expired` based on current date and lifecycle state, not hardcoded arrays.

### FR-6 Renewal

System must create a new linked contract record from an existing contract renewal action.

Renewal must prefill contract data from the previous contract, but not blindly clone all uploaded documents.

### FR-7 Termination

System must allow early termination with reason, date, and audit logging.

### FR-8 Audit Trail

System must log:

- creation
- edits
- approvals
- rejections
- renewals
- terminations
- document uploads
- status changes
- PDF generations

### FR-9 Notifications

System must support scheduled expiry notifications for upcoming renewals and expired contracts.

### FR-10 Reporting

System must provide contract summary and departmental staffing reporting.

### FR-11 Compensation History

System must version salary changes in a separate compensation history model so analytics do not depend on parsing contract documents.

### FR-12 Approval Route Resolution

System must resolve approval routes using:

1. contract type route
2. hotel default route
3. system fallback route

## 9. Data Model

### 9.1 Contract

Suggested model: `HrContract`

Fields:

- `id`
- `hotelId`
- `staffId`
- `departmentId`
- `positionTitle`
- `staffNameSnapshot`
- `employeeCodeSnapshot`
- `departmentSnapshot`
- `positionSnapshot`
- `contractNo`
- `type`
- `status`
- `startDate`
- `endDate`
- `salary`
- `currency`
- `probationEndDate`
- `reportingManagerStaffId`
- `notes`
- `generatedPdfUrl`
- `generatedPdfStorageKey`
- `supersedesContractId`
- `renewedFromContractId`
- `terminatedAt`
- `terminationReason`
- `approvedAt`
- `approvedByUserId`
- `submittedAt`
- `submittedByUserId`
- `activatedAt`
- `createdAt`
- `updatedAt`

Relations:

- `hotel -> Hotel`
- `staff -> Staff`
- `department -> Department`
- `reportingManager -> Staff`
- `supersedesContract -> HrContract`
- `renewedFromContract -> HrContract`
- `documents -> HrContractDocument[]`
- `approvals -> HrContractApproval[]`
- `auditLogs -> HrContractAuditLog[]`

### 9.2 Compensation History

Suggested model: `StaffCompensationHistory`

Fields:

- `id`
- `hotelId`
- `staffId`
- `contractId`
- `amount`
- `currency`
- `effectiveFrom`
- `effectiveTo`
- `reason`
- `createdByUserId`
- `createdAt`

Purpose:

- preserve salary version history separately from the contract body
- support salary analytics and reporting
- allow future payroll and reporting integrations without parsing PDFs

### 9.3 Contract Document

Suggested model: `HrContractDocument`

Fields:

- `id`
- `hotelId`
- `contractId`
- `documentType`
- `source`
- `fileName`
- `storageKey`
- `fileUrl`
- `mimeType`
- `fileSizeBytes`
- `uploadedByUserId`
- `uploadedAt`

Document types:

- `CONTRACT_PDF`
- `SIGNED_CONTRACT`
- `RENEWAL_LETTER`
- `TERMINATION_LETTER`
- `CV`
- `ID_DOCUMENT`
- `CERTIFICATION`
- `WORK_PERMIT`
- `OTHER`

Document sources:

- `GENERATED`
- `UPLOADED`

### 9.4 Contract Approval

Suggested model: `HrContractApproval`

Fields:

- `id`
- `hotelId`
- `contractId`
- `stepOrder`
- `role`
- `approverUserId`
- `status`
- `comment`
- `actedAt`
- `createdAt`

Approval statuses:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `SKIPPED`

### 9.5 Approval Route

Suggested model: `HrContractApprovalRoute`

Fields:

- `id`
- `hotelId`
- `contractType`
- `isDefault`
- `name`
- `isActive`
- `createdAt`
- `updatedAt`

Child steps:

- `HrContractApprovalRouteStep`

Route step fields:

- `id`
- `routeId`
- `stepOrder`
- `role`
- `userId`
- `required`

Resolution rules:

- match active route for hotel + contract type
- else use active hotel default route
- else use system fallback route

### 9.6 Contract Audit Log

Suggested model: `HrContractAuditLog`

Fields:

- `id`
- `hotelId`
- `contractId`
- `actorUserId`
- `action`
- `fromStatus`
- `toStatus`
- `metadata`
- `createdAt`

Actions:

- `CREATED`
- `UPDATED`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `ACTIVATED`
- `RENEWED`
- `TERMINATED`
- `DOCUMENT_UPLOADED`
- `DOCUMENT_GENERATED`
- `DOWNLOADED`

## 10. Derived Status Logic

Suggested status logic:

- `Draft`: created but not submitted
- `Pending Approval`: submitted and awaiting approval
- `Approved`: approved but not finalized/signed
- `Awaiting Signature`: document generated and pending sign-off
- `Active`: approved and within active date range
- `Expiring Soon`: active and end date within configured threshold
- `Expired`: current date past end date
- `Terminated`: manually terminated before end date
- `Superseded`: replaced by renewed contract

Notes:

- `Expiring Soon` should be configurable per hotel, defaulting to `60` days
- lifecycle status should prefer explicit terminated/superseded states over date-derived ones

## 11. User Experience Requirements

### 11.1 Contracts List

The list page should include:

- search by staff, department, contract number, position
- filters by status, type, department, start date, end date
- quick counters
- `New Contract`
- `View`
- `Download`
- `Renew`
- `Terminate`

Future IA note:

- when reporting dashboards are introduced, they should live under a separate `HR > Overview` or `HR > Dashboard` screen rather than inside the contracts page
- when HR settings are introduced, approval route configuration should move out of the contracts page into `HR > Settings`, with its own `Approval Routes` tab

Current status:

- `HR > Overview` now exists as the reporting home scaffold
- `HR > Settings` now exists and owns approval route configuration

### 11.2 New Contract Form

The form should save real data and include:

- searchable staff selector
- auto-fill department/job title where possible
- auto-fill and persist contract snapshots at creation time
- editable salary and dates
- contract type selector
- notes
- save as draft
- submit for approval

### 11.3 Contract Detail Page

Tabs or sections:

- overview
- document bundle
- approvals
- history
- actions

### 11.4 Document Tab

The document tab should support:

- upload document
- preview document
- download document
- replace generated document when authorized
- see upload metadata

## 12. Integrations

### 12.1 Storage

Recommended options:

- Supabase Storage
- AWS S3
- Cloudinary

Requirements:

- secure upload
- hotel scoping
- signed/private URLs where appropriate
- file metadata persistence

### 12.2 PDF Generation

Recommended options:

- `pdf-lib`
- Carbone
- DocuSeal-generated documents

Initial recommendation:

- start with simple server-side PDF generation from templates
- store generated output as canonical contract PDF

### 12.3 E-Signature

Optional but strongly recommended later:

- DocuSign
- DocuSeal

Initial rollout can launch without full e-signature if approval + document generation are in place first.

### 12.4 Notifications

Recommended options:

- Resend
- Nodemailer

Delivery targets:

- HR recipients
- manager recipients
- optional in-app notifications

### 12.5 Hotel Configuration

Add hotel-level contracts settings for:

- `contractExpiryWarningDays`
- default approval route
- enabled contract templates
- notification recipients or role targets

## 13. Backend Design

### 13.1 API Endpoints

Suggested endpoints:

- `GET /hr/contracts`
- `GET /hr/contracts/:id`
- `POST /hr/contracts`
- `PATCH /hr/contracts/:id`
- `POST /hr/contracts/:id/submit`
- `POST /hr/contracts/:id/approve`
- `POST /hr/contracts/:id/reject`
- `POST /hr/contracts/:id/renew`
- `POST /hr/contracts/:id/terminate`
- `GET /hr/contracts/:id/documents`
- `POST /hr/contracts/:id/documents`
- `POST /hr/contracts/:id/generate-pdf`
- `GET /hr/contracts/:id/download`
- `GET /hr/contracts/:id/audit-log`
- `GET /hr/contracts/reports/summary`
- `GET /hr/contracts/approval-routes`
- `POST /hr/contracts/approval-routes`
- `PATCH /hr/contracts/approval-routes/:id`
- `GET /hr/contracts/settings`
- `PATCH /hr/contracts/settings`

### 13.2 Scheduled Jobs

Suggested recurring jobs:

- daily contract expiry scan
- stale approval reminders
- stale signature reminders
- optional document regeneration consistency checks

## 14. Frontend Design

### 14.1 Screens Needed

- contracts list page
- hr overview/dashboard page for HR reporting and staffing summaries
- new/edit contract drawer or page
- contract detail page
- renewal modal
- termination modal
- document upload modal
- contract PDF preview page or modal
- hr settings page with tabs, including an `Approval Routes` tab

Staff self-service viewing is deferred to a later phase and should not block the admin and HR rollout.

### 14.2 Table Actions

Existing placeholders should be replaced with:

- `View` -> open contract detail
- `Download` -> download latest canonical contract PDF
- `Renew` -> start renewal flow
- `Terminate` -> start termination flow

## 15. Permissions

Suggested permissions:

- `view:hr-contracts`
- `create:hr-contracts`
- `edit:hr-contracts`
- `approve:hr-contracts`
- `terminate:hr-contracts`
- `upload:hr-contract-documents`
- `download:hr-contract-documents`
- `view:hr-contract-audit`

## 16. Reporting Requirements

Minimum reports:

- active contracts by department
- contract type distribution
- monthly salary totals by department
- expiring contracts in 30/60/90 days
- terminated contracts by date range
- draft and approval backlog
- salary history trends from compensation records

## 17. Rollout Plan

### Phase 1: Core Persistence

- database models
- API CRUD
- real list page
- form submission
- contract detail page
- contract snapshots
- compensation history writes

Status:

- Implemented

### Phase 2: Documents

- file storage integration
- upload/view/download
- document tab

Status:

- Implemented in code
- current implementation path stores document references on the contract and exposes upload/list/view behavior
- external object storage integration can follow without changing the contract document model
- remaining follow-up inside this phase:
- move from data URL support to real object storage
- add generated document records alongside manual uploads
- add delete/replace controls with audit logging

### Phase 3: Generated PDFs

- contract template engine
- offer/renewal/termination generation
- canonical PDF storage

Status:

- In progress
- core contract PDF download is implemented
- generated PDFs are persisted as canonical generated contract documents
- renewal and termination template variants remain next inside this phase

### Phase 4: Lifecycle Automation

- expiry logic
- renewal flow
- termination flow
- audit log

Status:

- expiry logic partially implemented for derived contract list status
- termination action is implemented with explicit date and reason capture
- renewal flow is implemented with linked successor contracts and superseded predecessors
- basic approval actions, route configuration, multi-step chains, and audit history are implemented
- notifications are implemented in a first pass; future HR IA split into `Overview` and `Settings` remains next-step work

### Phase 5: Notifications and Approval

- approval chain
- scheduled reminders
- email and in-app notifications
- contract type route resolution with hotel default fallback

Status:

- Not started

### Phase 6: Reporting

- summary dashboards
- staffing and salary analytics

Status:

- Not started

## 18. Build Priority

Most impactful implementation order:

1. real database models and form submission
2. contract detail page and safe edit flow
3. contract snapshots and compensation history
4. document storage with upload and view
5. PDF contract generation
6. expiry notifications
7. renewal and termination workflows
8. approvals and signatures
9. reporting

## 19. Resolved Scope Decisions

- Salary must be versioned separately from the contract body using `StaffCompensationHistory`.
- Contract records must store snapshots such as department, position, employee code, and staff name.
- Staff self-service contract viewing is deferred to a later phase.
- Approval route resolution is `contract type route -> hotel default route -> system fallback`.
- Renewal copies generated contract template data only, not all prior uploaded documents.
- Default expiry warning threshold is `60` days, configurable per hotel via `contractExpiryWarningDays`.

## 20. Success Criteria

This module is considered workable when:

- HR can create and save a contract from the UI
- contract statuses are no longer mock-only
- `View` opens a real record
- `Download` returns a real PDF
- documents can be uploaded and retrieved
- expiring contracts are automatically surfaced
- renewals and terminations create auditable records
