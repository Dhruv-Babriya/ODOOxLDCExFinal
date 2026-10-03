# Cross-Module Integration Contracts & Shared Interfaces

**The Champions Club — Sports Club Management System**  
*Document Version:* 1.0.0 (Phase 0)  
*Status:* Authoritative Specification  

---

## 1. Purpose of Integration Contracts

Because four developers will build their respective modules in separate AI conversations, clear, stable TypeScript contracts prevent architectural drift, schema mismatches, and duplicated definitions.

These contracts are centralized in `types/shared.ts` and backed by database row types in `types/database.types.ts`.

---

## 2. Core Entities & Shared Data Structures

### 2.1 Member Contract (Developer 1 ──► Developers 2, 3, 4)
Any module needing member identification, tier privileges, or discount rates consumes this contract:

```typescript
export interface MemberContract {
  id: string; // UUID
  user_id: string; // UUID matching auth.users
  membership_number: string; // e.g. "CC-2026-001"
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tier: 'GOLD' | 'SILVER' | 'JUNIOR' | 'CORPORATE';
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED';
  current_period_end: string; // ISO 8601 UTC
  court_discount_percent: number; // e.g. 50 (for Gold)
  shop_discount_percent: number; // e.g. 15 (for Gold)
  free_court_hours_per_month: number;
}
```

#### Shared Pricing Utility (`lib/pricing.ts`)
Developer 2 and Developer 3 compute discounts using the standard helper functions:
```typescript
import { calculateCourtPrice, calculateItemDiscount } from '@/lib/pricing';

// Developer 2 computing court fee:
const courtFee = calculateCourtPrice(member.tier, court.base_hourly_price);

// Developer 3 computing shop/bar discount:
const discountedPrice = calculateItemDiscount(member.tier, product.retail_price, 'SHOP');
```

---

### 2.2 Court & Booking Contract (Developer 2 ──► Developers 1, 4)
Enables Developer 4 to generate booking invoices and Developer 1 to display booking history on member profiles:

```typescript
export interface CourtBookingContract {
  id: string; // UUID
  court_id: string; // UUID
  court_name: string; // e.g. "Centre Court (Grass)"
  sport_type: 'TENNIS' | 'CRICKET';
  member_id: string | null; // Nullable for guest walk-ins
  start_time: string; // ISO 8601 UTC
  end_time: string; // ISO 8601 UTC (exactly start_time + 1 hour)
  booking_type: 'REGULAR' | 'SOCIAL_PLAY' | 'COACHING' | 'MAINTENANCE';
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  total_price: number;
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED';
}
```

---

### 2.3 Shop Order Contract (Developer 3 ──► Developer 4)
Enables Developer 4 to record retail payments and include shop sales in revenue reports:

```typescript
export interface ShopOrderContract {
  id: string; // UUID
  order_number: string; // e.g. "SH-2026-1001"
  order_type: 'COUNTER' | 'ONLINE';
  member_id: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  payment_status: 'PENDING' | 'PAID' | 'REFUNDED';
}
```

---

### 2.4 Bar / Cafeteria Order & Tab Contract (Developer 3 ──► Developer 4)
Enables Developer 4 to settle customer tabs and aggregate food & beverage revenue:

```typescript
export interface CustomerTabContract {
  id: string; // UUID
  tab_number: string; // e.g. "TAB-042"
  member_id: string | null;
  guest_name: string | null;
  credit_limit: number;
  current_balance: number;
  status: 'OPEN' | 'SETTLED' | 'OVERDUE';
  opened_at: string;
}

export interface BarOrderContract {
  id: string; // UUID
  order_number: string; // e.g. "BAR-2026-501"
  table_id: string | null;
  tab_id: string | null;
  items: Array<{
    menu_item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    status: 'PLACED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  }>;
  total_amount: number;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
}
```

---

### 2.5 Payment & Invoice Contract (Developer 4 ──► All Developers)
Used to record financial transactions originating from courts, the pro-shop, cafeteria tabs, or membership fees:

```typescript
export interface PaymentContract {
  id: string; // UUID
  receipt_number: string; // e.g. "REC-2026-9001"
  amount: number;
  payment_method: 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER' | 'MEMBER_TAB';
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  reference_id: string | null; // Gateway order ID, UPI transaction ref, or cheque no.
  member_id: string | null;
  invoice_id: string | null;
  booking_id: string | null;
  shop_order_id: string | null;
  bar_order_id: string | null;
  created_at: string;
}

export interface InvoiceContract {
  id: string; // UUID
  invoice_number: string; // e.g. "INV-2026-0042"
  member_id: string | null;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'VOID';
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
}
```

---

### 2.6 Owner Analytics & Reporting Contract (Developer 4)
Consolidates financial metrics across all operational areas for the executive dashboard:

```typescript
export interface OwnerFinancialOverview {
  period: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';
  total_revenue: number;
  revenue_by_stream: {
    memberships: number;
    courts: number;
    shop: number;
    bar: number;
  };
  court_utilization_rate: number; // Percentage 0 - 100
  total_bookings_count: number;
  active_members_count: number;
  low_stock_items_count: number;
  open_tabs_balance: number;
  recent_payments: PaymentContract[];
}
```

---

## 3. Universal Data Conventions

1. **Identifiers**: All database primary keys are UUID v4 strings.
2. **Timestamps**: All timestamps are formatted as ISO 8601 strings in UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
3. **Monetary Units**: Expressed as decimals with 2 decimal precision (e.g., `450.00`).
4. **State Machine Values**: Controlled enums in uppercase snake_case (`PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `PAID`, `REFUNDED`).
5. **No Direct Table Mutating Across Modules**:
   - Developer 2 does NOT mutate `public.members`.
   - Developer 3 does NOT mutate `public.payments` directly; Developer 3 invokes `recordPaymentAction` from `actions/payments.ts`.
