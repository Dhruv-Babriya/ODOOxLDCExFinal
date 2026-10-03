# Validation Architecture & Schema Conventions

**The Champions Club — Sports Club Management System**  
*Document Version:* 1.0.0 (Phase 0)  
*Status:* Authoritative Specification  

---

## 1. Multi-Tiered Validation Philosophy

The Champions Club employs a **three-tier defense** for data validation:

```
┌────────────────────────────────────────────────────────┐
│ Tier 1: Client-Side Validation (React Hook Form + Zod)  │
│ Purpose: Immediate visual feedback, UX ergonomics       │
└──────────────────────────┬─────────────────────────────┘
                           │ Network / Action Invocation
┌──────────────────────────▼─────────────────────────────┐
│ Tier 2: Server-Side Validation (Authoritative Zod)      │
│ Purpose: Authoritative validation before DB invocation  │
└──────────────────────────┬─────────────────────────────┘
                           │ PostgreSQL SQL Query / RPC
┌──────────────────────────▼─────────────────────────────┐
│ Tier 3: Database Storage Constraints (PostgreSQL)       │
│ Purpose: Inviolable data integrity (CHECK, FK, EXCLUDE) │
└────────────────────────────────────────────────────────┘
```

> **Cardinal Rule:** Server-side and database validations are authoritative. A client may be bypassed, tampered with, or sent malicious inputs via `curl` or automated bots; the database and server action guards must never trust raw incoming client data.

---

## 2. Server Action Response Envelope (`ActionResult<T>`)

All Server Actions across all four developers return a typed contract defined in `types/shared.ts`:

```typescript
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  fieldErrors?: Record<string, string[]>;
}
```

### 2.1 Standardized Error Formatting
```typescript
import { ActionResult } from '@/types/shared';
import { ZodError } from 'zod';

export function formatZodError(error: ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return {
    success: false,
    error: 'Validation failed. Please correct the highlighted errors.',
    errorCode: 'VALIDATION_FAILED',
    fieldErrors,
  };
}
```

---

## 3. Zod Validation Schema Directory (`lib/validations/`)

All cross-module schemas are consolidated in `lib/validations/`:

### 3.1 Authentication (`lib/validations/auth.ts`)
- `loginSchema`: Validates email and minimum 6-character password.
- `registerSchema`: Validates fullName, email, phone number, password, and confirmation match.

### 3.2 Member & Membership (`lib/validations/member.ts`)
- `createMemberSchema`: Validates full name, email, phone, membership plan UUID, starting date, and emergency contact details.
- `updateMemberSchema`: Allows updating member status (`ACTIVE`, `SUSPENDED`, `EXPIRED`, `CANCELLED`).
- `membershipPlanSchema`: Validates plan name, code (`GOLD`, `SILVER`, `JUNIOR`, `CORPORATE`), monthly price, court discount percentage, shop discount percentage, and guest allowance.

### 3.3 Court Bookings (`lib/validations/booking.ts`)
- `createBookingSchema`:
  - `court_id`: Valid UUID.
  - `start_time`: ISO 8601 string, must land on 00 or 30 minute marks.
  - `end_time`: Exactly 60 minutes after `start_time`.
  - `booking_type`: `'REGULAR'` or `'SOCIAL_PLAY'`.
- `cancelBookingSchema`: Requires booking UUID and mandatory cancellation reason.
- `socialPlayParticipantSchema`: Registers a participant into an active social session.

### 3.4 Shop & Inventory (`lib/validations/shop.ts`)
- `createProductSchema`: Product name, category UUID, SKU, retail price (> 0), cost price, brand, and reorder point threshold.
- `updateInventorySchema`: Product UUID, quantity change, transaction type (`PURCHASE_RESTOCK`, `SALE_COUNTER`, `SALE_ONLINE`, `DAMAGE_LOSS`, `AUDIT_ADJUSTMENT`), and optional reference ID.
- `createShopOrderSchema`: Order type (`COUNTER` or `ONLINE`), member UUID (optional for guest walk-ins), line items (array of product UUID, quantity >= 1, unit price).

### 3.5 Bar & Cafeteria (`lib/validations/bar.ts`)
- `createBarTableSchema`: Table number (e.g. "T-01"), capacity (1–20), location description.
- `createMenuItemSchema`: Category UUID, item name, price (> 0), preparation station (`BAR` or `KITCHEN`), is_available boolean.
- `createBarOrderSchema`: Table UUID, tab UUID (optional), array of items with quantities.
- `openTabSchema`: Member UUID or guest identifier name, credit limit, and notes.

### 3.6 Finance & Payments (`lib/validations/payment.ts`)
- `createPaymentSchema`:
  - `amount`: Number strictly > 0.
  - `payment_method`: Controlled enum (`CASH`, `CARD`, `UPI`, `BANK_TRANSFER`, `MEMBER_TAB`).
  - `reference_id`: UPI transaction number, cheque number, or gateway order reference.
  - `member_id`: Optional UUID.
  - `invoice_id` or `booking_id` or `order_id`: Polymorphic linkage.
- `createInvoiceSchema`: Member UUID, due date, array of itemized charges, and tax rate.

### 3.7 Staff & Shifts (`lib/validations/staff.ts`)
- `createStaffSchema`: User UUID, employee ID, job title, hourly rate, hire date, and assigned role.
- `createStaffShiftSchema`: Staff UUID, shift date, start time, end time, and shift role.
- `createLeaveRequestSchema`: Staff UUID, leave type (`ANNUAL`, `SICK`, `UNPAID`), date range, and reason.

### 3.8 Enquiries & CRM (`lib/validations/enquiry.ts`)
- `createEnquirySchema`: Visitor name, email, phone, sport interest (`TENNIS`, `CRICKET`, `FITNESS`, `GENERAL`), trial requested boolean.
- `createQuoteSchema`: Enquiry UUID, quote title, itemized pricing, validity period, and notes.

---

## 4. Database-Level Invariants (Tier 3)

PostgreSQL enforce the following invariants regardless of application source:

1. **Non-Negative Monetary Amounts**:
   - `CHECK (amount >= 0)` on all price and payment columns.
2. **Non-Negative Stock Quantities**:
   - `CHECK (quantity_on_hand >= 0)` on `public.inventory`.
3. **Controlled Enums**:
   - `CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'))` on bookings.
   - `CHECK (role IN ('OWNER', 'ADMIN', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'MEMBER'))` on profiles.
   - `CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'MEMBER_TAB'))` on payments.
4. **Temporal Consistency**:
   - `CHECK (end_time > start_time)` on court bookings and staff shifts.
   - `CHECK (end_date >= start_date)` on leave requests and member plans.
