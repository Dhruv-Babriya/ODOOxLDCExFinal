# ARCHITECTURE & SYSTEM DESIGN SPECIFICATION
## The Champions Club — Sports Club Management System (Phase 0 Foundation)

---

## 1. Executive Summary & Purpose

The Champions Club is a premier athletic institution featuring tournament clay and hard tennis courts, cricket pitch and nets, a full-service athletic gear pro shop, and an athletic nutrition bar/cafeteria. Previously reliant on fragmented manual mechanisms (WhatsApp for court bookings, paper receipts for F&B tabs, Excel spreadsheets for member profiles, and no centralized revenue transparency), the platform consolidates all business operations into a unified, secure, high-performance web application.

This specification documents the **Phase 0 System Architecture**. The system is built to support parallel development by **four autonomous developers**, each working in isolated AI chat environments within the same shared Git repository and PostgreSQL/Supabase database.

---

## 2. Technology Stack & Architectural Decision Records (ADRs)

| Layer | Selected Technology | Architectural Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js (App Router)** | Full-stack React framework providing React Server Components (RSC), native streaming, dynamic route groups, and zero-client-JS server actions. |
| **Language** | **TypeScript (Strict Mode)** | Complete static type safety, end-to-end interface contracts, compile-time schema validation across database and frontend layers. |
| **Styling** | **Tailwind CSS + CSS Design Tokens** | Utility-first styling with centralized color variables, dark-mode first aesthetic, fluid layout utilities without heavy runtime CSS-in-JS. |
| **Icons & Component Primitives** | **Lucide React + shadcn/ui conventions** | Lightweight, accessible, composable UI building blocks with consistent accessibility and keyboard navigation. |
| **Application Layer** | **Server Actions & Route Handlers** | Authoritative mutations executed directly on the server, avoiding public client-side database credentials and eliminating boilerplate REST endpoints. |
| **Database & Auth** | **Supabase (PostgreSQL 17)** | Enterprise relational database with Row Level Security (RLS), atomic stored procedures, transactional constraints, and native OAuth/Session Auth. |
| **Validation** | **Zod** | Declarative schema validation on both client and server boundaries, converting untrusted user input into strongly-typed domain models. |

---

## 3. High-Level System Architecture & Request Lifecycle

```
[ Web Browser / Mobile Client ]
              │
              │ HTTPS Request / Server Action Call
              ▼
┌────────────────────────────────────────────────────────┐
│           Next.js 16 App Router Server Layer           │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │   Edge Proxy / Session Middleware (middleware.ts) │  │
│  │   - Session cookie validation & auto-refresh     │  │
│  │   - Unauthenticated redirection for /dashboard/* │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                            │
│                           ▼                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │             Server Action / RSC Handler          │  │
│  │   - Auth verification: requireAuth() / RBAC     │  │
│  │   - Strict input validation via Zod schemas      │  │
│  │   - Error sanitization via handleActionError()   │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ Authenticated Client / Session JWT
                            ▼
┌────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL 17                │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │             Row Level Security (RLS)             │  │
│  │   - Helper: public.get_user_role() (STABLE)      │  │
│  │   - Role-based granular data isolation           │  │
│  └──────────────────────────────────────────────────┘  │
│                           │                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Transactional Logic & Constraints        │  │
│  │   - Exclusion Constraint: GIST (no overlaps)     │  │
│  │   - Daily Limits Check (<= 2 court sessions)     │  │
│  │   - Atomic inventory deduction (deduct_inventory)│  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 4. Layer Separation & Architectural Responsibilities

To prevent business-logic leaks and architectural drift, responsibilities are strictly compartmentalized:

### 4.1 UI & Client Components (`components/`, `app/`)
* **Responsibilities**: Rendering reactive UI, capturing form events, presenting loading/error states, client-side optimistic UI feedback.
* **Prohibitions**: Never make direct database mutations or calculate final financial prices solely on the client. Never inspect roles or permissions for authoritative access control; UI hiding is purely UX convenience.

### 4.2 Server Actions (`actions/`)
* **Responsibilities**: The authoritative entry point for business mutations (`signInAction`, `createCourtBookingAction`, `createShopOrderAction`, `recordPaymentAction`, `createMemberAction`).
* **Workflow**:
  1. Authorize caller via `requireAuth()` or `requirePermission(...)`.
  2. Validate payload via Zod schemas (`.parse(input)`).
  3. Execute transactional business calculations (e.g. member tier discounts).
  4. Call Supabase PostgreSQL tables or stored procedures.
  5. Revalidate affected Next.js paths (`revalidatePath`).
  6. Return a typed `ActionResult<T>`.

### 4.3 Business Logic & Calculations (`lib/`)
* **Responsibilities**: Pure deterministic domain calculation functions.
  * `lib/pricing.ts`: Standard member court fee calculator, shop discount calculator, and cafeteria discount calculator.
  * `lib/permissions/rbac.ts`: Central role-to-permission mapping and capability checker.
  * `lib/errors.ts`: Central error normalization catching PostgreSQL error codes (`23P01`, `23505`, `P0001`, `P0002`).

### 4.4 Database & Constraints (`supabase/migrations/`)
* **Responsibilities**: Ultimate source of truth for business integrity.
  * PostgreSQL Exclusion Constraints prevent overlapping bookings at the storage engine level.
  * Foreign keys with cascading rules protect referential integrity.
  * Check constraints enforce non-negative prices, quantities, and chronological date spans.
  * Row Level Security (RLS) ensures members can only access their own records while staff and owners access role-delimited operational records.

---

## 5. Application Folder Structure

```
ODOOxLDCExFinal/
├── actions/                         # Authoritative Server Actions
│   ├── auth.ts                     # Login, register, logout actions
│   ├── bookings.ts                 # Atomic court reservations & cancellations
│   ├── members.ts                  # Member creation & lifecycle
│   ├── payments.ts                 # Multi-tender payment recording
│   └── shop.ts                     # Shop order creation & atomic stock deductions
│
├── app/                            # Next.js App Router (Route Groups)
│   ├── (auth)/                     # Dedicated authentication pages
│   │   ├── layout.tsx              # Centered brand card layout
│   │   ├── login/page.tsx          # Login form
│   │   └── register/page.tsx       # Registration form with dev role selector
│   │
│   ├── (dashboard)/                # Private Management System Portal
│   │   ├── layout.tsx              # Sidebar + header management shell
│   │   └── dashboard/
│   │       ├── page.tsx            # Executive operational overview
│   │       ├── bar/page.tsx        # F&B, tables, menu, tabs (Dev 3)
│   │       ├── bookings/page.tsx   # Court schedule & concurrency (Dev 2)
│   │       ├── courts/page.tsx     # Courts facility management (Dev 2)
│   │       ├── enquiries/page.tsx  # Inbound leads & quotes CRM (Dev 4)
│   │       ├── inventory/page.tsx  # Unified live stock & low-stock alerts (Dev 3)
│   │       ├── invoices/page.tsx   # Client & member billing register (Dev 4)
│   │       ├── members/page.tsx    # Member roster & lookup (Dev 1)
│   │       ├── membership-plans/page.tsx # Plan tiers & privileges (Dev 1)
│   │       ├── payments/page.tsx   # Financial transaction receipts (Dev 4)
│   │       ├── reports/page.tsx    # Consolidated owner reporting (Dev 4)
│   │       ├── shop/page.tsx       # Pro shop POS & orders (Dev 3)
│   │       └── staff/page.tsx      # Roster, shifts & leave requests (Dev 4)
│   │
│   ├── (public)/                   # Public Marketing & Information Website
│   │   ├── layout.tsx              # Public header + navigation + footer
│   │   ├── page.tsx                # Club landing homepage & facilities
│   │   ├── about/page.tsx          # Heritage & athletic vision
│   │   ├── contact/page.tsx        # Front desk reception hours & details
│   │   ├── courts/page.tsx         # Court schedules & 1hr session rules
│   │   ├── memberships/page.tsx    # Gold, Silver, Junior tier benefits
│   │   ├── shop/page.tsx           # Pro gear catalog & live stock
│   │   └── trial/page.tsx          # Public trial request form
│   │
│   ├── globals.css                 # Tailwind 4 CSS tokens & global themes
│   └── layout.tsx                  # Root HTML document wrapper
│
├── components/
│   ├── dashboard/                  # Dashboard shell & navigation
│   │   ├── header.tsx              # Top bar, role badge, session status
│   │   ├── module-shell.tsx        # Standard scaffold container for all dev tracks
│   │   └── sidebar.tsx             # Module-grouped sidebar navigation
│   ├── public/                     # Public marketing layout components
│   │   ├── footer.tsx              # Public footer with contacts & timings
│   │   └── navbar.tsx              # Responsive sticky navigation bar
│   └── ui/                         # Atomic design system components
│       ├── badge.tsx               # Status & role indicators
│       ├── button.tsx              # Standard interactive button
│       ├── card.tsx                # Card container primitive
│       └── input.tsx               # Text input with validation error states
│
├── docs/                           # Architecture, Contracts & Guidelines
│   ├── ARCHITECTURE.md             # This document
│   ├── AUTHORIZATION.md            # Role matrix, permissions & RLS policies
│   ├── BOOKING_CONCURRENCY.md      # PostgreSQL GIST exclusion architecture
│   ├── DATABASE_SCHEMA.md          # 28-table data dictionary & constraints
│   ├── DEVELOPMENT_GUIDELINES.md   # Coding conventions & workflow
│   ├── INTEGRATION_CONTRACTS.md    # Shared cross-developer TypeScript contracts
│   ├── SECURITY.md                 # Security architecture & protection
│   ├── TEAM_OWNERSHIP.md           # 4-developer module breakdown
│   └── VALIDATION.md               # Validation conventions & Zod rules
│
├── lib/                            # Shared Utilities & Platform Services
│   ├── auth/                       # Cached server session & user guards
│   ├── errors.ts                   # Standardized application error classes
│   ├── permissions/                # RBAC permission dictionary & checker
│   ├── pricing.ts                  # Central member tier discount calculator
│   ├── supabase/                   # Supabase client factories
│   │   ├── admin.ts                # Server-only Service Role client
│   │   ├── client.ts               # Browser client (Client Components)
│   │   ├── middleware.ts           # Session refresher proxy helper
│   │   └── server.ts               # Cookie-based Server client
│   ├── utils.ts                    # cn(), formatCurrency(), formatDate()
│   └── validations/                # Zod schemas for all domain entities
│
├── middleware.ts                   # Next.js root request session validator
├── supabase/                       # Supabase Database Assets
│   ├── migrations/                 # Migration files
│   │   └── 20261003000001_initial_schema.sql # 28 tables, RLS, functions, triggers
│   └── seed/                       # Development-only seed data
│       └── seed.sql                # Plans, courts, categories, products, menu
└── types/                          # TypeScript Definitions
    ├── database.types.ts           # PostgreSQL schema types generated from DB
    └── shared.ts                   # Core shared enums & action result contracts
```
