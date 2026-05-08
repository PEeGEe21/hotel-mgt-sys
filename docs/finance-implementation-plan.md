# Finance Implementation Plan

## Goals

1. Make finance invoices creatable from the app instead of read-only.
2. Make payment recording work from finance, not only reservation detail pages.
3. Add export for invoices and payments.
4. Add an invoice appearance tab so each hotel can control printable invoice branding.
5. Link approved facility requisitions to expense invoices and downstream payments.
6. Support source-linked invoices for reservations, POS orders, and facility bookings.
7. Allow invoice creation to optionally capture the first payment so paid and partial invoices can be created in one step.
8. Keep finance contracts explicitly out of scope for this phase.

## Current State

- `apps/web/src/app/(dashboard)/finance/invoices/page.tsx` and `payments/page.tsx` only list data.
- `apps/web/src/hooks/finance/useFinance.ts` only exposes read queries.
- `apps/api/src/modules/finance/finance.controller.ts` only exposes `GET` endpoints.
- Reservation payments already exist in `reservations.service.ts`, but finance has no general payment write flow.
- Facility requisitions are operational records only and do not currently hold an invoice link.
- A printable payment receipt template already exists and can be used as the pattern for printable invoices.

## Backend Plan

### Finance APIs

Add write endpoints:

- `POST /finance/invoices`
- `POST /finance/invoices/from-requisition/:id`
- `POST /finance/payments`
- `GET /finance/invoices/export`
- `GET /finance/payments/export`
- `GET /finance/invoices/:id/print`

### Data Model

Add fields for:

- `Hotel.invoiceTemplateSettings`
- `Invoice.counterpartyName`
- `FacilityRequisition.invoiceId`

This allows:

- manual and expense invoices to show a real party name
- invoice appearance settings to persist per hotel
- requisitions to connect to invoices and, by extension, payments

### Finance Service Responsibilities

- create invoice numbers safely
- create manual invoices
- create reservation-linked invoices
- create POS-linked invoices
- create facility-booking-linked invoices
- create requisition-linked expense invoices
- record payments against any invoice
- update invoice payment status after every payment
- update related reservation or facility booking state when applicable
- optionally capture initial payment at invoice creation
- post ledger entries for both invoice issuance and invoice settlement
- render printable invoice HTML using a template
- export invoice and payment CSV files

## Frontend Plan

### Invoices Page

Add:

- `Invoices` / `Appearance` tab switch
- create invoice drawer
- print action
- export action
- appearance form with preview

The create drawer supports:

- manual invoice
- reservation-linked invoice
- POS-linked invoice
- facility-booking-linked invoice
- requisition-linked expense invoice
- billed-to manual override or auto-filled linked party
- due date
- subtotal
- tax
- discount
- counterparty
- notes
- optional initial payment section
- optional advanced debit/credit account overrides

The appearance tab supports:

- accent color
- header title
- footer note
- show logo
- show tax breakdown
- show notes

### Payments Page

Add:

- record payment drawer
- invoice lookup/search
- outstanding-balance-only invoice selection
- amount
- method
- reference
- paid date
- note
- optional advanced debit/credit account overrides
- export action

### Requisitions Page

Add:

- invoice status visibility
- `Create Expense Invoice` action for approved requisitions without an invoice
- linked invoice number display when present

## Build Order

1. Prisma schema and migration
2. Hotel DTO/service support for invoice template settings
3. Finance DTOs, controller routes, and service methods
4. Invoice template HTML
5. React hooks for finance mutations
6. Invoice page drawer, appearance tab, print/export
7. Payment page drawer and export
8. Requisition-to-invoice action and linked state
9. PRD and scope documentation refresh
10. Verification with TypeScript compile

## Notes

- Reservation auto-invoicing and reservation-side payment posting remain intact.
- Finance-side payment recording will reuse the same accounting rules as ledger posting.
- Finance contracts are intentionally deferred until HR contract scope and cross-module commercial rules are defined.
- Default ledger posting should cover normal flows, while account overrides remain available only when finance wants precise manual control.
