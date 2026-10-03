# 🏆 The Champions Club — Sports Club Management System

A full-stack, production-ready **Sports Club Management System** built for [ODOO x LDCEx Hackathon](https://github.com/Dhruv-Babriya/ODOOxLDCExFinal). The platform replaces legacy manual workflows (WhatsApp court bookings, Excel spreadsheets, and paper slips) with an integrated digital operating system for managing memberships, court bookings, a pro shop, bar & cafeteria operations, staff management, finance, and CRM — all from a single dashboard.

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [User Roles & Access Control](#-user-roles--access-control)
- [Default Accounts](#-default-accounts)
- [Available Scripts](#-available-scripts)
- [Database & Migrations](#-database--migrations)
- [Security & Hardening](#-security--hardening)
- [Testing](#-testing)
- [Technical Documentation](#-technical-documentation)
- [Team Ownership](#-team-ownership)
- [License](#-license)

---

## 🛠 Tech Stack

| Layer | Technology | Version |
| :--- | :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router) | 16.3.8 |
| **Language** | TypeScript | 5.x |
| **Frontend** | React (Server + Client Components) | 19.2.8 |
| **Styling** | Tailwind CSS | 4.x |
| **Icons** | Lucide React | 1.50.0 |
| **Charts** | Recharts | 3.10.1 |
| **Database** | PostgreSQL 17 via [Supabase](https://supabase.com/) | — |
| **Auth** | Supabase Auth (email/password) | — |
| **ORM / Client** | Supabase JS SDK + SSR helpers | 2.117.2 |
| **Validation** | Zod | 4.6.5 |
| **Date Utilities** | date-fns | 4.4.0 |

---

## ✨ Key Features

### 🏅 Membership Management
- Multi-tier membership plans (Gold, Silver, Junior) with configurable pricing, duration, and court-hour benefits
- Member registration, enrollment, renewal, and status management
- Member portal with profile, booking history, and membership card
- Paginated member directory with filters for the Owner

### 🎾 Court Booking System
- Real-time court availability calendar with drag-to-book slots
- PostgreSQL `btree_gist` exclusion constraints preventing double-bookings at the database level
- Tier-based pricing (Gold members get free bookings, Silver gets 25% discount, Junior gets 30% discount)
- Rescheduling and cancellation with atomic slot liberation
- Friday Social Play mode with capacity limits and duplicate prevention
- Daily booking quota enforcement per member

### 🛍 Pro Shop
- Product catalog with categories, SKUs, and image management
- Atomic inventory tracking with low-stock threshold alerts
- Multi-channel ordering (Counter, Online) with fulfillment tracking (Pickup, Delivery)
- Order lifecycle management (Pending → Confirmed → Fulfilled / Cancelled)

### 🍹 Bar & Cafeteria
- Table management with real-time status tracking
- Menu item catalog with category grouping and availability toggles
- Customer tab system (linked to members, guests, or tables)
- Kitchen ticket workflow (Pending → Preparing → Ready → Served)
- Tab credit limits and settlement

### 💳 Finance & Payments
- Unified payment recording across memberships, bookings, shop orders, and bar tabs
- Invoice generation with line items, tax calculation, and PDF-ready data
- Overpayment prevention and payment method tracking (Cash, Card, UPI, Bank Transfer)
- Revenue aggregation and financial reporting

### 👥 Staff & HR
- Staff onboarding with role assignment and department placement
- Shift scheduling and attendance tracking
- Leave request management with date validation
- Employee code and salary management

### 📊 Reports & Analytics
- Executive dashboard with KPI cards (Total Revenue, Active Members, Bookings Today, Open Tabs)
- Revenue distribution charts across all four business streams
- Operational alerts (low stock items, expiring memberships, open tabs balance)

### 📬 CRM & Enquiries
- Public enquiry form for prospective members
- Trial day registration
- Quote generation and follow-up tracking
- Enquiry-to-member conversion workflow

### 🔔 Notifications
- In-app notification center for members
- Membership expiry reminders and booking confirmations

---

## 🏛️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     User (Browser)                           │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│         Next.js App Router (Turbopack)                       │
│     React Server Components + Client Leaves                  │
│     Middleware (Auth, Rate Limiting, Session)                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│         Server Actions (actions/*.ts)                        │
│     14 domain-specific action modules                        │
│     Zod schema.parse() → Business Logic → DB                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│         Business Logic & Validation Layer                    │
│     lib/validations/ (10 strict Zod schemas)                 │
│     lib/pricing.ts (tier-based pricing engine)               │
│     lib/errors.ts (typed error hierarchy)                    │
│     lib/permissions/ (role-based access control)             │
│     lib/rate-limit/ (IP-based rate limiting)                 │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│         Supabase (PostgreSQL 17)                             │
│     28+ tables · Row Level Security (RLS)                    │
│     btree_gist exclusion constraints                         │
│     SECURITY DEFINER stored procedures                       │
│     Triggers & Functions                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20 or higher
- **npm** (comes with Node.js)
- A **Supabase** project (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/Dhruv-Babriya/ODOOxLDCExFinal.git
cd ODOOxLDCExFinal
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

> ⚠️ **Never** commit `.env.local` or expose the `SUPABASE_SERVICE_ROLE_KEY` in client-side code.

### 4. Run Database Migrations

Apply the SQL migrations from `supabase/migrations/` in order through the Supabase SQL Editor or CLI. The initial schema migration (`20261003000001_initial_schema.sql`) creates all 28+ tables, indexes, RLS policies, and stored procedures.

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 6. Build for Production

```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
ODOOxLDCExFinal/
├── actions/                    # Server Actions (14 domain modules)
│   ├── auth.ts                 #   Authentication (sign in, sign up, sign out)
│   ├── bar.ts                  #   Bar & cafeteria operations
│   ├── bookings.ts             #   Court booking lifecycle
│   ├── enquiries.ts            #   CRM enquiries & quotes
│   ├── invoices.ts             #   Invoice generation
│   ├── managers.ts             #   Manager CRUD & onboarding
│   ├── members.ts              #   Member registration, renewal, status
│   ├── notifications.ts        #   Notification management
│   ├── payments.ts             #   Payment recording
│   ├── plans.ts                #   Membership plan management
│   ├── profile.ts              #   User profile updates
│   ├── reports.ts              #   Analytics & reporting queries
│   ├── shop.ts                 #   Pro shop orders & inventory
│   └── staff.ts                #   Staff onboarding, shifts, leave
│
├── app/                        # Next.js App Router
│   ├── (auth)/                 #   Auth route group (/login, /register)
│   ├── (dashboard)/            #   Authenticated dashboard routes
│   │   └── dashboard/
│   │       ├── bar/            #     Bar & cafeteria management
│   │       ├── bookings/       #     Court booking interface
│   │       ├── courts/         #     Court configuration
│   │       ├── enquiries/      #     CRM & enquiries
│   │       ├── inventory/      #     Stock & inventory
│   │       ├── invoices/       #     Invoice management
│   │       ├── managers/       #     Manager directory
│   │       ├── members/        #     Member directory & detail views
│   │       ├── membership-plans/ #   Plan configuration
│   │       ├── notifications/  #     Notification center
│   │       ├── payments/       #     Payment records
│   │       ├── portal/         #     Member self-service portal
│   │       ├── profile/        #     User profile page
│   │       ├── reports/        #     Analytics dashboard
│   │       ├── shop/           #     Pro shop management
│   │       ├── staff/          #     Staff & HR management
│   │       └── unauthorized/   #     Access denied page
│   └── (public)/               #   Public-facing pages
│       ├── about/              #     About the club
│       ├── contact/            #     Contact information
│       ├── courts/             #     Public court listing
│       ├── memberships/        #     Membership plans & pricing
│       ├── shop/               #     Public shop catalog
│       └── trial/              #     Trial day registration
│
├── components/                 # React Components
│   ├── dashboard/              #   Dashboard-specific components
│   ├── public/                 #   Public site components
│   └── ui/                     #   Shared UI primitives
│
├── docs/                       # Technical Documentation (11 guides)
│
├── hooks/                      # Custom React hooks
│
├── lib/                        # Core Libraries
│   ├── auth/                   #   Auth utilities & session helpers
│   ├── errors.ts               #   Typed error hierarchy & handler
│   ├── pagination.ts           #   Server-side pagination utilities
│   ├── permissions/            #   Role-based permission checks
│   ├── pricing.ts              #   Tier-based pricing engine
│   ├── rate-limit/             #   IP-based rate limiting
│   ├── supabase/               #   Supabase client (server, client, middleware)
│   ├── utils.ts                #   General utilities (cn, formatters)
│   └── validations/            #   10 Zod validation schemas (strict mode)
│
├── scripts/                    # Test & utility scripts
│   ├── test-phase1-shop-bar.mjs
│   ├── test-phase2-bookings.mjs
│   ├── test-phase3-hardening.mjs
│   ├── test-rate-limit.mjs
│   └── verify-pagination-large-datasets.mjs
│
├── supabase/                   # Database
│   ├── migrations/             #   16 SQL migration files
│   └── seed/                   #   Seed data
│
├── types/                      # TypeScript type definitions
│   └── shared.ts               #   Shared enums, types, ActionResult<T>
│
├── middleware.ts                # Next.js middleware (auth, rate limiting)
├── next.config.ts              # Next.js configuration
├── package.json                # Dependencies & scripts
└── tsconfig.json               # TypeScript configuration
```

---

## 🔐 User Roles & Access Control

The system implements a 6-role authorization model enforced at both the middleware and database (RLS) layers:

| Role | Description | Access Level |
| :--- | :--- | :--- |
| **OWNER** | Club owner with full administrative access | All modules, all data, member pagination & filters |
| **ADMIN** | System administrator | Full operational access |
| **FRONT_DESK** | Reception / front desk staff | Bookings, member check-in, enquiries |
| **SHOP_STAFF** | Pro shop employees | Shop orders, inventory management |
| **BAR_STAFF** | Bar & cafeteria employees | Bar orders, tables, kitchen tickets, menu management |
| **MEMBER** | Registered club members | Personal portal, bookings, shop purchases |

Role assignment is stored in the `profiles.role` column and resolved via the `get_user_role()` PostgreSQL function. Row Level Security (RLS) policies enforce data isolation at the database level.

---

## 🔑 Default Accounts

| Role | Email | Password |
| :--- | :--- | :--- |
| **Owner** | `owner@gmail.com` | `owner123` |

> New members can self-register via `/register`. Staff and managers are onboarded by the Owner through the dashboard.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the development server (Turbopack) |
| `npm run build` | Create optimized production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint checks |
| `npx tsc --noEmit` | TypeScript type checking (no output files) |
| `npm run test:phase2` | Run Phase 2 booking integration tests |
| `npm run test:phase3` | Run Phase 3 hardening & concurrency tests |
| `npm run test:bookings` | Run all booking test suites |
| `npm run test:ratelimit` | Run rate limiting tests |

---

## 🗄 Database & Migrations

The database schema consists of **28+ tables** across these domains:

| Domain | Key Tables |
| :--- | :--- |
| **Auth & Profiles** | `profiles` |
| **Memberships** | `members`, `membership_plans`, `membership_history` |
| **Courts & Bookings** | `courts`, `court_bookings`, `booking_participants` |
| **Pro Shop** | `product_categories`, `products`, `inventory_transactions`, `shop_orders`, `shop_order_items` |
| **Bar & Cafeteria** | `bar_tables`, `menu_categories`, `menu_items`, `customer_tabs`, `bar_orders`, `bar_order_items` |
| **Finance** | `payments`, `invoices`, `invoice_items` |
| **Staff & HR** | `staff`, `staff_shifts`, `leave_requests` |
| **CRM** | `enquiries`, `quotes` |
| **System** | `notifications`, `audit_logs` |

Migrations are located in `supabase/migrations/` and should be applied in filename order. Key database features include:

- **Row Level Security (RLS)** on all tables
- **`btree_gist` exclusion constraints** preventing overlapping court bookings
- **`SECURITY DEFINER` stored procedures** for atomic operations
- **Database triggers** for profile auto-creation on auth signup
- **Composite indexes** for pagination and query performance

---

## 🔒 Security & Hardening

The platform implements multiple layers of security:

- **Strict Input Validation**: All 10 Zod validation schemas enforce explicit type, length (min/max), and format (regex) constraints. Unknown/extra fields are rejected via `.strict()` mode — inputs are never silently sanitized.
- **Server-Side Enforcement**: Every Server Action calls `schema.parse(input)` before executing any business logic. Invalid inputs are rejected immediately with structured `VALIDATION_ERROR` responses and per-field error details.
- **Row Level Security (RLS)**: Database-level access control ensures users can only read/write data they are authorized to access, regardless of application-layer bugs.
- **Rate Limiting**: IP-based rate limiting on authentication endpoints, public pages, and authenticated API calls prevents brute-force and abuse.
- **Secret Isolation**: `SUPABASE_SERVICE_ROLE_KEY` is server-only (no `NEXT_PUBLIC_` prefix) and never exposed to the client bundle.
- **File Upload Safety**: Upload URLs are validated for type, length, and format; files are stored in Supabase Storage (isolated from the web root) and are never executable.
- **Auth Hardening**: Auto-confirm fallback for pending email confirmations, friendly error messages for invalid credentials, and rate-limit detection on sign-in attempts.
- **Error Sanitization**: All server errors pass through `handleActionError()` which maps internal errors to safe, user-facing messages without leaking stack traces or internal details.

---

## 🧪 Testing

The project includes comprehensive integration test suites:

| Test Suite | Script | Coverage |
| :--- | :--- | :--- |
| **Phase 1** | `scripts/test-phase1-shop-bar.mjs` | Shop & bar CRUD, inventory, orders, tabs |
| **Phase 2** | `scripts/test-phase2-bookings.mjs` | Court booking lifecycle, availability, pricing |
| **Phase 3** | `scripts/test-phase3-hardening.mjs` | Concurrency, overlap protection, daily limits, rescheduling, cancellation, Friday social play, RLS |
| **Rate Limiting** | `scripts/test-rate-limit.mjs` | Middleware rate limit enforcement |
| **Pagination** | `scripts/verify-pagination-large-datasets.mjs` | Large dataset pagination correctness |

Run all booking tests:

```bash
npm run test:bookings
```

### Pre-PR Checklist

Before pushing code or opening a pull request, always run:

```bash
npx tsc --noEmit      # Type checking
npm run lint           # Linting
npm run build          # Production build verification
```

---

## 📚 Technical Documentation

Detailed architectural decisions and specifications are documented in the `docs/` directory:

| Document | Description |
| :--- | :--- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Complete multi-tier system topology and data flow |
| [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Full 28-table schema specification, data types, indexes, and relations |
| [AUTHORIZATION.md](docs/AUTHORIZATION.md) | 6-role permission matrix, `get_user_role()`, and Row Level Security policies |
| [TEAM_OWNERSHIP.md](docs/TEAM_OWNERSHIP.md) | Boundaries, branch conventions, and Git protocols |
| [BOOKING_CONCURRENCY.md](docs/BOOKING_CONCURRENCY.md) | PostgreSQL `btree_gist` exclusion constraints, atomic RPC, and Friday social play |
| [VALIDATION.md](docs/VALIDATION.md) | Multi-tier validation architecture, Zod catalog, and `ActionResult<T>` contract |
| [SECURITY.md](docs/SECURITY.md) | Threat model, secret isolation, RLS rules, and audit logging |
| [DEVELOPMENT_GUIDELINES.md](docs/DEVELOPMENT_GUIDELINES.md) | TypeScript standards, naming conventions, and Server Action patterns |
| [INTEGRATION_CONTRACTS.md](docs/INTEGRATION_CONTRACTS.md) | Cross-module interfaces, shared pricing utilities, and data envelopes |
| [DEMO_GUIDE.md](docs/DEMO_GUIDE.md) | Step-by-step demonstration walkthrough for project showcase |
| [LOCAL_SETUP.md](docs/LOCAL_SETUP.md) | Detailed local development environment setup guide |

---

## 👥 Team Ownership

The project was developed by a 4-person team with clearly defined domain ownership:

| Track | Developer | Domain | Primary Routes | Core Tables |
| :--- | :--- | :--- | :--- | :--- |
| **Track 1** | Developer 1 | Core Platform & Membership | `/login`, `/register`, `/dashboard/members`, `/dashboard/membership-plans`, `/dashboard/portal`, `/dashboard/profile`, `/dashboard/notifications` | `profiles`, `members`, `membership_plans`, `membership_history`, `notifications` |
| **Track 2** | Developer 2 | Courts & Bookings | `/courts`, `/dashboard/courts`, `/dashboard/bookings` | `courts`, `court_bookings`, `booking_participants` |
| **Track 3** | Developer 3 | Shop & Bar Operations | `/shop`, `/dashboard/shop`, `/dashboard/inventory`, `/dashboard/bar` | `products`, `inventory_transactions`, `shop_orders`, `bar_tables`, `menu_items`, `customer_tabs`, `bar_orders` |
| **Track 4** | Developer 4 | Finance, Staff, Public Site & Reports | `/`, `/about`, `/contact`, `/dashboard/staff`, `/dashboard/payments`, `/dashboard/invoices`, `/dashboard/enquiries`, `/dashboard/reports` | `staff`, `staff_shifts`, `leave_requests`, `payments`, `invoices`, `enquiries`, `quotes`, `audit_logs` |

---

## 📄 License

This project was built for the **ODOO x LDCEx Hackathon**. All rights reserved.

---

<p align="center">
  Built with ❤️ by <strong>The Champions Club Team</strong>
</p>
