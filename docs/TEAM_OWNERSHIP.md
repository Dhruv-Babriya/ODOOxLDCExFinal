# Team Ownership, Module Boundaries & Git Workflow

**The Champions Club — Sports Club Management System**  
*Document Version:* 1.0.0 (Phase 0)  
*Status:* Authoritative Specification  

---

## 1. Overview

The Champions Club platform is partitioned across **4 development tracks** to enable parallel, independent development across 4 AI conversations and team members. 

Each developer has:
- Complete ownership over a set of database tables.
- Exclusive responsibility for designated frontend routes and UI views.
- Ownership of specific Server Actions and domain validations.
- Standardized integration contracts to communicate with other developers without direct coupling.

---

## 2. Developer Allocation & Boundaries

### 2.1 Developer 1 — Core Platform & Membership
- **Scope**: User authentication, profiles, role management, membership tiering (Gold, Silver, Junior), member directories, membership history, and expiry monitoring.
- **Database Tables Owned**:
  - `public.profiles`
  - `public.membership_plans`
  - `public.members`
  - `public.membership_history`
- **Application Routes Owned**:
  - `app/(auth)/login/`
  - `app/(auth)/register/`
  - `app/(dashboard)/members/`
  - `app/(dashboard)/membership-plans/`
  - `app/(public)/memberships/`
- **Actions & Code Owned**:
  - `actions/auth.ts`
  - `actions/members.ts`
  - `lib/validations/auth.ts`
  - `lib/validations/member.ts`
- **Key Deliverables in Phase 1**:
  - Member search & profile view with full membership renewal/upgrade history.
  - Member status transitions (`ACTIVE`, `EXPIRED`, `SUSPENDED`).
  - Scheduled or reactive membership expiry checker.

---

### 2.2 Developer 2 — Courts & Booking
- **Scope**: Tennis and cricket court scheduling, 1-hour sessions starting every 30 minutes, 2 bookings/day limit enforcement, membership-tier based court pricing, booking cancellations, and Friday Social Play slot sharing.
- **Database Tables Owned**:
  - `public.courts`
  - `public.court_bookings`
  - `public.booking_participants`
- **Application Routes Owned**:
  - `app/(dashboard)/courts/`
  - `app/(dashboard)/bookings/`
  - `app/(public)/courts/`
- **Actions & Code Owned**:
  - `actions/bookings.ts`
  - `lib/validations/booking.ts`
  - `lib/pricing.ts` (court pricing logic)
  - Concurrency validation calling `public.create_court_booking(...)`
- **Key Deliverables in Phase 1**:
  - Interactive calendar/timeline grid view for front-desk and members.
  - Court slot picker respecting 1-hour sessions on 30-minute intervals.
  - Social play registration UI for Friday sessions with participant counter.

---

### 2.3 Developer 3 — Shop & Bar
- **Scope**: Dual-channel pro-shop (rackets, balls, shoes, accessories, apparel) with unified physical counter POS and online orders; Bar & Cafeteria with table management, kitchen order tickets, customer running tabs, and member tier discounts.
- **Database Tables Owned**:
  - `public.product_categories`
  - `public.products`
  - `public.inventory`
  - `public.inventory_transactions`
  - `public.shop_orders`
  - `public.shop_order_items`
  - `public.bar_tables`
  - `public.menu_categories`
  - `public.menu_items`
  - `public.customer_tabs`
  - `public.bar_orders`
  - `public.bar_order_items`
- **Application Routes Owned**:
  - `app/(dashboard)/shop/`
  - `app/(dashboard)/inventory/`
  - `app/(dashboard)/bar/`
  - `app/(public)/shop/`
- **Actions & Code Owned**:
  - `actions/shop.ts`
  - `lib/validations/shop.ts`
  - `lib/validations/bar.ts`
- **Key Deliverables in Phase 1**:
  - Quick POS counter checkout with barcode/item selector and stock reduction.
  - Low-stock visual alerts and audit log of inventory transactions.
  - Bar/kitchen ticket display (KDS) updating order item status (`PLACED` -> `PREPARING` -> `SERVED`).
  - Customer tab management (open tab, add items, settle tab).

---

### 2.4 Developer 4 — Finance, Staff, Website & Analytics
- **Scope**: Payment gateway/recording (cash, card, UPI/online), customer invoicing, staff directory, shift tracking, staff leave management, visitor enquiry CRM, quote generator, public website pages, and Owner executive reporting.
- **Database Tables Owned**:
  - `public.staff`
  - `public.staff_shifts`
  - `public.leave_requests`
  - `public.invoices`
  - `public.invoice_items`
  - `public.payments`
  - `public.enquiries`
  - `public.quotes`
  - `public.audit_logs`
- **Application Routes Owned**:
  - `app/(public)/page.tsx` (Homepage)
  - `app/(public)/about/`
  - `app/(public)/contact/`
  - `app/(public)/trial/`
  - `app/(dashboard)/page.tsx` (Owner / Admin Executive Overview)
  - `app/(dashboard)/staff/`
  - `app/(dashboard)/payments/`
  - `app/(dashboard)/invoices/`
  - `app/(dashboard)/enquiries/`
  - `app/(dashboard)/reports/`
- **Actions & Code Owned**:
  - `actions/payments.ts`
  - `lib/validations/payment.ts`
  - `lib/validations/staff.ts`
  - `lib/validations/enquiry.ts`
- **Key Deliverables in Phase 1**:
  - Consolidated Owner dashboard showing daily/weekly/monthly revenue breakdowns (courts + shop + bar).
  - Payment recording modal supporting Cash, Card, and UPI references.
  - Invoice PDF generator / printable view.
  - Staff roster calendar and leave approval workflow.
  - Enquiry pipeline with "Send Quote" drawer.

---

## 3. Cross-Module Dependency Matrix

To prevent code duplication, developers interact only through published contracts:

```
[Developer 1: Memberships]
         │
         ├──► [Developer 2: Court Pricing & Limits] (queries member tier & daily bookings)
         ├──► [Developer 3: Shop/Bar Discounts]    (queries member tier for discount %)
         └──► [Developer 4: Invoicing & Billing]   (links invoices to member_id)

[Developer 2: Court Bookings] ──► [Developer 4: Payments] (charges for booking)
[Developer 3: Shop & Bar]     ──► [Developer 4: Payments] (charges for orders/tabs)

[All Developers] ─────────────► [Developer 4: Owner Analytics & Reports]
```

---

## 4. Git Branching & Collaboration Workflow

### 4.1 Branch Strategy
The repository maintains a protected `main` branch. Development proceeds on dedicated feature branches:

```
main
 ├── feature/core-membership   (Developer 1)
 ├── feature/court-booking     (Developer 2)
 ├── feature/shop-bar          (Developer 3)
 └── feature/finance-website   (Developer 4)
```

### 4.2 Branch Rules
1. **Never commit directly to `main`**: All changes must arrive via pull request (PR).
2. **Migration Discipline**: If a developer requires a database change:
   - Propose it to the team first to prevent table name collisions.
   - Migrations are sequential in `supabase/migrations/YYYYMMDDHHMMSS_<description>.sql`.
3. **Run CI Checks Locally Before PR**:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm run build
   ```
4. **Shared Types**: Additions to `types/shared.ts` must be backward-compatible and additive.
