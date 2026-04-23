# HotelOS Product Requirements Document (PRD)

## 1. Document Control
- Product: `HotelOS`
- Version: `v1.0`
- Date: `2026-03-30`
- Audience: Product, Engineering, Design, Operations, Sales/Implementation
- Purpose: Define system requirements and module scope for product delivery and presentation storytelling.

## 2. Product Overview
HotelOS is an end-to-end hotel operations platform that unifies front desk, room operations, workforce, finance, facilities, inventory, and point-of-sale into one system.  
The product is built as a multi-module web platform with a Next.js dashboard frontend and a NestJS API backend.

Core value:
- Replace fragmented tools (manual logs, spreadsheets, disconnected software).
- Provide one source of truth for daily hotel operations.
- Improve service quality, speed, and accountability.

## 3. Problem Statement
Hotels often run critical operations across disconnected systems:
- Reservations and room readiness are not synchronized in real time.
- Staff attendance, scheduling, and permissions are hard to enforce consistently.
- Inventory leakage and ad-hoc purchasing reduce margins.
- POS, finance, and operational data are difficult to reconcile quickly.
- Facilities issues (maintenance, complaints, inspections) are slow to resolve and poorly tracked.

HotelOS addresses this by connecting operational workflows into one role-based platform.

## 4. Product Goals
- Centralize all hotel operations in one dashboard.
- Enable role-based access and secure staff authentication.
- Digitize operational workflows (clock-in, housekeeping, maintenance, bookings).
- Improve financial visibility (ledger, invoices, payments, chart of accounts).
- Standardize data for analytics and performance reporting.

## 5. Non-Goals (Current Scope Boundaries)
- Consumer-facing booking engine and OTA marketplace integrations.
- Native mobile apps (iOS/Android) as a required first release.
- Full enterprise BI suite replacing specialized analytics tools.
- Cross-property group-level consolidated reporting beyond single-property core workflows.

## 6. Users & Personas
- Hotel Owner / GM:
  - Needs high-level visibility across revenue, operations, and compliance.
- Operations Manager:
  - Manages reservations, room availability, housekeeping, and facilities.
- Front Desk / Reception:
  - Handles guest check-in/check-out and reservation lifecycle.
- HR / Admin:
  - Manages staff accounts, roles, shifts, and attendance.
- Finance Officer:
  - Tracks invoices, payments, ledger entries, and account structures.
- POS Staff (Bar/Restaurant):
  - Processes orders, tables, terminals, and cash/card settlements.
- Maintenance / Facilities Team:
  - Resolves complaints, inspections, requisitions, and facility bookings.

## 7. System Scope and Module Inventory
This PRD reflects current system modules from the platform codebase.

### 7.1 Platform & Security
- Authentication and session lifecycle:
  - Login, logout, refresh token, profile update (`Auth` module).
- Authorization:
  - Role permissions, user-level permission overrides (`Permissions`, `Users` modules).
- Audit and compliance:
  - Action tracking and audit logs (`Audit Logs` module).
- Notifications:
  - Preference management and operational notices (`Notifications` module).

### 7.2 Core Hotel Operations
- Hotel profile and branding:
  - Property details, branding, operational settings (`Hotels` module).
- Dashboard:
  - Operational snapshot and cross-module visibility.
- Rooms:
  - Room CRUD, status updates, room availability context (`Rooms`, `Room Types`, `Floors` modules).
- Reservations:
  - Booking lifecycle, availability checks, folio items, payment records (`Reservations` module).
- Guests:
  - Guest profile management and history (`Guests` module).
- Housekeeping:
  - Task creation, assignment, tracking, and completion (`Housekeeping` module).

### 7.3 Workforce & Administration
- Staff management:
  - Employee records, roles, departments, status (`Staff` module).
- Attendance:
  - Personal clock-in/out, kiosk mode, admin attendance views (`Attendance` module).
- User accounts:
  - Account lifecycle, credentials, reset flows (`Users`, `Auth` modules).
- Organization settings:
  - Departments, shifts, room types, suppliers, categories (`Departments`, `Shifts`, `Suppliers`, settings pages).

### 7.4 Finance & Commercial
- Finance overview:
  - Operational finance summaries (`Finance` module/UI).
- Invoicing and payments:
  - Invoice and payment management (`Finance` module/UI).
- Ledger:
  - Accounting entries and records (`Ledger` module/UI).
- Chart of accounts:
  - Account structure and setup workflows (finance accounts pages).

### 7.5 Inventory & Procurement
- Inventory management:
  - Stock item create/update/monitor (`Inventory` module).
- Inventory categorization:
  - Category management (`Inventory Categories` module).
- Supplier management:
  - Vendor onboarding and updates (`Suppliers` module).

### 7.6 POS (Point of Sale)
- POS core:
  - Sales workflows and order orchestration (`POS` module).
- Products:
  - Product catalog and categories (`POS Products`).
- Tables:
  - Table maps and table operations (`POS Tables`).
- Orders:
  - Order lifecycle, item updates, cancel/pay/status actions (`POS Orders`).
- Terminals:
  - Terminal setup codes, auth, and management (`POS Terminals`).

### 7.7 Facilities Operations
- Facilities registry:
  - Facility records, types, locations, departments (`Facilities` module).
- Facility bookings and reservations:
  - Reservation and booking operations for amenities.
- Maintenance:
  - Maintenance request creation and updates.
- Inspections:
  - Inspection scheduling and update workflows.
- Complaints:
  - Complaint intake, tracking, and resolution.
- Requisitions:
  - Facility-related requisition processes.

### 7.8 Reporting
- Reports and analytics:
  - Cross-functional reporting endpoints and dashboard views (`Reports` module/UI).

## 8. Functional Requirements (High Level)
### FR-1 Identity & Access
- System must authenticate staff securely using JWT-based sessions.
- System must enforce role-based permissions across modules.
- System must support user-specific permission overrides.

### FR-2 Daily Hotel Operations
- System must support room lifecycle tracking and reservation operations.
- System must support guest profile management tied to reservations.
- System must support housekeeping task assignment and completion.

### FR-3 Workforce Control
- System must support attendance clock-in/out from personal and kiosk contexts.
- System must support staff account management and department/shift structures.

### FR-4 Commercial & Finance
- System must support invoices, payments, and ledger records.
- System must support chart-of-accounts style account organization.

### FR-5 Inventory & Supply
- System must support inventory items, categories, and supplier records.

### FR-6 POS Operations
- System must support POS products, tables, orders, and terminals.
- System must support terminal-specific setup/authentication workflows.

### FR-7 Facilities Lifecycle
- System must support facilities cataloging and operational workflows for complaints, maintenance, inspections, bookings, and requisitions.

### FR-8 Visibility & Compliance
- System must provide dashboard/reporting views for operational monitoring.
- System must provide auditable traces for key operational actions.

## 9. Non-Functional Requirements
- Availability: System should be usable throughout active hotel operating hours.
- Performance: Key operational pages should load quickly under routine concurrency.
- Security: Token-based auth, permission guards, and scoped access to hotel data.
- Reliability: Critical actions should fail gracefully and preserve data integrity.
- Usability: Operational staff should complete common workflows in minimal clicks.
- Maintainability: Modular backend and frontend structure to support iterative feature delivery.

## 10. Key Workflows
### WF-1 Reservation to Stay
1. Staff creates reservation.
2. Room availability and room status are validated.
3. Guest profile is linked/created.
4. Check-in/check-out updates propagate to room and finance context.

### WF-2 Daily Workforce Flow
1. Staff clocks in via personal or kiosk interface.
2. Supervisors monitor attendance status.
3. Shift and role permissions govern accessible actions.

### WF-3 Housekeeping Execution
1. Tasks are created per room/state.
2. Tasks are assigned and tracked.
3. Completion updates room readiness context.

### WF-4 POS Sales Cycle
1. Terminal is authenticated.
2. Orders are opened by table.
3. Items are added/updated and payment completed.
4. Sales data feeds finance/reporting visibility.

### WF-5 Facility Issue Resolution
1. Complaint or maintenance issue is logged.
2. Team assigns and updates action status.
3. Completion is tracked for operational accountability.

## 11. KPIs and Success Metrics
- Occupancy support metrics:
  - Reservation processing time, check-in completion time.
- Operational efficiency metrics:
  - Room readiness turnaround, housekeeping SLA compliance.
- Workforce metrics:
  - Attendance compliance rate, shift adherence.
- Finance metrics:
  - Invoice collection cycle time, payment reconciliation coverage.
- Inventory metrics:
  - Stockout frequency, adjustment variance.
- Facilities metrics:
  - Mean time to resolve complaints/maintenance requests.
- POS metrics:
  - Average order cycle time, void/cancel trends.

## 12. Risks and Mitigations
- Risk: Permission misconfiguration can block critical workflows.
  - Mitigation: Permission templates, audit logs, staged rollout by role.
- Risk: Data inconsistency across modules during rapid operations.
  - Mitigation: Strong validation rules and transactional service design.
- Risk: Adoption friction for teams moving from manual workflows.
  - Mitigation: Progressive rollout, focused training, role-based onboarding.
- Risk: Performance degradation under peak operational load.
  - Mitigation: Monitoring, indexing, query optimization, module-level scaling.

## 13. Dependencies
- PostgreSQL for persistent storage.
- Redis for cache/session/job support.
- API and Web deployment environments.
- Seed/reference data (hotel profile, roles, categories, room types).

## 14. Rollout Strategy (Suggested)
1. Phase 1: Auth, users, roles/permissions, dashboard, rooms, reservations, guests.
2. Phase 2: Attendance, housekeeping, core reporting.
3. Phase 3: Inventory, suppliers, finance ledger/accounts.
4. Phase 4: POS and facilities full workflows.
5. Phase 5: Optimization, analytics refinement, operational automation.

## 15. Presentation Mapping (Slide Blueprint)
Use this PRD to create a concise presentation:
1. Vision and Problem.
2. Product Overview and Value Proposition.
3. User Personas.
4. System Architecture (Web + API + DB + Redis).
5. Module Landscape (Operations, Workforce, Finance, POS, Facilities).
6. Key Workflows (Reservation, Attendance, Housekeeping, POS).
7. Security and Governance (RBAC, Audit Logs, Permissions).
8. KPI Framework.
9. Rollout Plan and Roadmap.
10. Business Impact and Next Steps.

## 16. Current Technology Stack
- Frontend: Next.js, React, Tailwind, Zustand, React Query.
- Backend: NestJS, Prisma, PostgreSQL, Redis.
- Monorepo: Turborepo + pnpm workspaces.

## 17. Appendix: Backend Module Reference
Current backend modules represented in code:
- `auth`
- `users`
- `permissions`
- `audit-logs`
- `notifications`
- `hotels`
- `rooms`
- `room-types`
- `floors`
- `reservations`
- `guests`
- `staff`
- `attendance`
- `housekeeping`
- `inventory`
- `inventory-categories`
- `suppliers`
- `finance`
- `ledger`
- `reports`
- `pos`
- `facilities`
- `departments`
- `shifts`
