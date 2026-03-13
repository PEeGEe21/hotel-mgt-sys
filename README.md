# 🏨 HotelOS — Hotel Management System

A full-stack hotel management platform built with NestJS, Next.js, and PostgreSQL.

## Project Structure

```
hotel-os/
├── apps/
│   ├── api/          # NestJS backend (REST API + WebSockets)
│   └── web/          # Next.js frontend (Dashboard)
├── packages/
│   ├── shared-types/ # Shared TypeScript types
│   ├── ui/           # Shared UI components (future)
│   └── utils/        # Shared utility functions (future)
├── turbo.json        # Turborepo config
└── package.json      # Root workspace config
```

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL
- Redis

### Setup

```bash
# Install dependencies
pnpm install

# Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit your .env files with your DB credentials

# Run database migrations
pnpm db:migrate

# Start development servers (both api + web)
pnpm dev
```

**API** → http://localhost:4000  
**Web** → http://localhost:3000  
**API Docs** → http://localhost:4000/api/docs  
**DB Studio** → run `pnpm db:studio`

## Modules

| Module | API Path | Description |
|---|---|---|
| Auth | `/api/v1/auth` | Login, JWT, RBAC |
| Rooms | `/api/v1/rooms` | Room management |
| Reservations | `/api/v1/reservations` | Bookings, check-in/out |
| Guests | `/api/v1/guests` | Guest profiles |
| Staff | `/api/v1/staff` | Staff management |
| Attendance | `/api/v1/attendance` | Clock in/out |
| POS | `/api/v1/pos` | Point of Sale |
| Inventory | `/api/v1/inventory` | Stock management |
| Housekeeping | `/api/v1/housekeeping` | Room tasks |
| Finance | `/api/v1/finance` | Invoices, payments |
| Reports | `/api/v1/reports` | Analytics |
| Facilities | `/api/v1/facilities` | Amenity bookings |

## Tech Stack

- **Backend**: NestJS + Prisma + PostgreSQL + Redis
- **Frontend**: Next.js 14 + Tailwind CSS + React Query + Zustand
- **Monorepo**: Turborepo + pnpm workspaces
- **Auth**: JWT + Passport.js
- **Real-time**: Socket.io
- **Jobs**: BullMQ
