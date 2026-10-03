# The Champions Club — Sports Club Management System

Welcome to **The Champions Club** Sports Club Management System. This repository contains the Next.js and Supabase platform replacing legacy manual workflows (WhatsApp court bookings, Excel sheets, and paper slips) with an integrated digital operating system.

---

## 🚀 Quick Start for Developers

### 1. Prerequisites
- Node.js (v20+ recommended)
- npm
- Supabase account & project access

### 2. Setup Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase connection parameters:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
# Server-only (DO NOT prefix with NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 3. Install Dependencies & Run Locally
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Code Quality & Pre-PR Gate
Before pushing code or opening a PR, always execute:
```bash
npx tsc --noEmit
npm run lint
npm run build
```

---

## 🏛️ Architecture Overview

```
User (Browser)
   │
   ▼
Next.js App Router (React Server Components & Client Leaves)
   │
   ▼
Server Actions & Route Handlers (`actions/`, `app/api/`)
   │
   ▼
Business Logic & Validation Layer (`lib/validations/`, `lib/pricing.ts`, `lib/auth/`)
   │
   ▼
Supabase Client SDK (`lib/supabase/server.ts`, `client.ts`)
   │
   ▼
PostgreSQL 17 Database (`public` schema, 28 tables, RLS, btree_gist exclusion)
```

---

## 👥 4-Developer Parallel Track Ownership

| Track | Developer | Domain Scope | Primary Routes | Core Tables |
| :--- | :--- | :--- | :--- | :--- |
| **Track 1** | **Developer 1** | Core Platform & Membership | `/login`, `/register`, `/dashboard/members`, `/dashboard/membership-plans` | `profiles`, `members`, `membership_plans`, `membership_history` |
| **Track 2** | **Developer 2** | Courts & Bookings | `/courts`, `/dashboard/courts`, `/dashboard/bookings` | `courts`, `court_bookings`, `booking_participants` |
| **Track 3** | **Developer 3** | Shop & Bar Operations | `/shop`, `/dashboard/shop`, `/dashboard/inventory`, `/dashboard/bar` | `products`, `inventory`, `shop_orders`, `bar_tables`, `menu_items`, `customer_tabs`, `bar_orders` |
| **Track 4** | **Developer 4** | Finance, Staff, Public Site & Reports | `/`, `/about`, `/contact`, `/dashboard/staff`, `/dashboard/payments`, `/dashboard/invoices`, `/dashboard/enquiries`, `/dashboard/reports`, `/dashboard` (Executive) | `staff`, `staff_shifts`, `leave_requests`, `payments`, `invoices`, `enquiries`, `quotes`, `audit_logs` |

---

## 📚 Architectural & Technical Documentation

Full architectural decisions are documented in the `docs/` directory:

1. [Architecture Overview](file:///docs/ARCHITECTURE.md) (`docs/ARCHITECTURE.md`): Complete multi-tier system topology and data flow.
2. [Database Schema](file:///docs/DATABASE_SCHEMA.md) (`docs/DATABASE_SCHEMA.md`): Full 28-table schema specification, data types, indexes, and relations.
3. [Authorization Matrix](file:///docs/AUTHORIZATION.md) (`docs/AUTHORIZATION.md`): 6-role permission matrix, `get_user_role()`, and Row Level Security.
4. [Team Ownership & Workflow](file:///docs/TEAM_OWNERSHIP.md) (`docs/TEAM_OWNERSHIP.md`): Boundaries, branch conventions, and Git protocols.
5. [Booking Concurrency](file:///docs/BOOKING_CONCURRENCY.md) (`docs/BOOKING_CONCURRENCY.md`): PostgreSQL `btree_gist` exclusion constraints, atomic RPC, and Friday social play architecture.
6. [Validation Architecture](file:///docs/VALIDATION.md) (`docs/VALIDATION.md`): Multi-tier validation, Zod catalog, and `ActionResult<T>` contract.
7. [Security Foundation](file:///docs/SECURITY.md) (`docs/SECURITY.md`): Threat model, secret isolation, RLS rules, and audit logging.
8. [Development Guidelines](file:///docs/DEVELOPMENT_GUIDELINES.md) (`docs/DEVELOPMENT_GUIDELINES.md`): TypeScript standards, naming conventions, and Server Action patterns.
9. [Integration Contracts](file:///docs/INTEGRATION_CONTRACTS.md) (`docs/INTEGRATION_CONTRACTS.md`): Cross-module interfaces, shared pricing utilities, and data envelopes.
