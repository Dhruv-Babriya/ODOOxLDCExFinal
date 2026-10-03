# Authorization Architecture & Permission Matrix

**The Champions Club — Sports Club Management System**  
*Document Version:* 1.0.0 (Phase 0)  
*Status:* Authoritative Specification  

---

## 1. Principles of Authorization

Security in The Champions Club application follows the principle of **Defense in Depth**:

1. **Frontend Route Hiding is NOT Security**: Hiding a navigation item or redirecting a user in a client component is purely for User Experience (UX), never for authorization.
2. **Server-Side Enforcement**: All Server Actions, Route Handlers, and Server Components explicitly verify identity and permissions before reading or mutating data.
3. **Database-Level Row Level Security (RLS)**: PostgreSQL enforces data isolation at the storage layer via Supabase RLS. Even if an application bug bypassed server checks, PostgreSQL rejects unauthorized operations.
4. **Least Privilege**: Users are granted only the minimum permissions necessary to perform their club duties.

---

## 2. Role Taxonomy

The system defines **6 discrete operational roles** (`types/shared.ts` / `AppRole`):

| Role | Code | Scope & Description |
| :--- | :--- | :--- |
| **Owner** | `OWNER` | Ultimate club authority. Unrestricted access across operations, finances, employee payroll, audit logs, and analytics. |
| **Administrator** | `ADMIN` | General manager / system administrator. Manages members, plans, schedules, courts, staff shifts, pricing, and operational settings. |
| **Front Desk** | `FRONT_DESK` | Reception staff. Manages visitor enquiries, member check-ins, court bookings, quotes, member registrations, and walk-in payments. |
| **Shop Staff** | `SHOP_STAFF` | Pro-shop cashier / clerk. Manages racket restringing, sports apparel, counter sales, order fulfillment, and physical inventory audits. |
| **Bar Staff** | `BAR_STAFF` | Cafeteria & bar staff. Manages table orders, kitchen tickets, customer tabs, drink dispensing, and cafeteria payments. |
| **Member** | `MEMBER` | Club sports member (Gold, Silver, Junior, or Guest). Can book courts, view personal tabs, track bookings, and place shop orders. |

---

## 3. Central Permission Matrix

The matrix maps granular actions to authorized roles, enforced in `lib/permissions/rbac.ts`:

| Domain | Action / Resource | Owner | Admin | Front Desk | Shop Staff | Bar Staff | Member |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Members** | View Member Directory | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Create / Edit Member | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Manage Membership Plans | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | View Own Member Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (Own) |
| **Courts** | Manage Courts & Availability | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Book Court (Any Member) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Book Court (Self) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (Self) |
| | Cancel Any Booking | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Cancel Own Booking | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ (Self) |
| | Host / Manage Social Play | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Shop** | Manage Products & Categories | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| | Update Stock / Restock | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| | Create Counter Sale / POS | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Place Online Shop Order | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (Self) |
| **Bar** | Manage Tables & Menu Items | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Place Table Order / Kitchen | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Manage Customer Tabs | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| | View Own Tab Status | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ (Self) |
| **Staff & HR** | Manage Staff Records & Rates | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Manage Shifts & Rosters | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Approve Leave Requests | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Submit Leave Request | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Finance** | Record Payments | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | Issue Invoices & Quotes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Access Owner Financial Reports| ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Access Operational Reports | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Enquiries** | Create Visitor Enquiry | ✅ | ✅ | ✅ | ❌ | ❌ | Public |
| | Follow Up / Send Quotes | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **System** | View Audit Logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Role Resolution Architecture

### 4.1 Single Source of Truth
Roles are stored in `public.profiles.role` linked 1:1 with `auth.users.id`.
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER','ADMIN','FRONT_DESK','SHOP_STAFF','BAR_STAFF','MEMBER')),
  ...
);
```

### 4.2 Database Role Function (`get_user_role`)
To avoid recursive RLS checks when querying `public.profiles`, a Postgres `SECURITY DEFINER` function runs with elevated database privileges:
```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'MEMBER'
  );
END;
$$;
```

---

## 5. Application-Layer Authorization Helpers

Located in `lib/auth/session.ts` and `lib/permissions/rbac.ts`:

### 5.1 `requireAuth()`
Validates that an active Supabase Auth session exists. Redirects to `/login` or throws `AuthenticationError`.
```typescript
import { requireAuth } from '@/lib/auth/session';

export async function createMemberAction(data: CreateMemberInput) {
  const user = await requireAuth();
  // Guaranteed authenticated user.id
}
```

### 5.2 `requireRole(allowedRoles: AppRole[])`
Asserts that the authenticated caller has one of the specified roles:
```typescript
import { requireRole } from '@/lib/auth/session';

export async function manageCourtScheduleAction(data: CourtScheduleInput) {
  const user = await requireRole(['OWNER', 'ADMIN']);
  // Guaranteed OWNER or ADMIN
}
```

### 5.3 `requirePermission(permission: PermissionKey)`
Fine-grained check using the centralized permission map in `lib/permissions/rbac.ts`:
```typescript
import { requirePermission } from '@/lib/auth/session';

export async function recordPaymentAction(data: PaymentInput) {
  const user = await requirePermission('payments:create');
  // Verified user has payment creation privilege
}
```

---

## 6. PostgreSQL Row Level Security (RLS) Policies

All 28 tables in `public` have `ALTER TABLE <tbl> ENABLE ROW LEVEL SECURITY;` turned on.

### 6.1 Policy Design Standard
1. **Administrative Access**: Owners and Admins have full read/write access:
   ```sql
   CREATE POLICY "Admins have full access" ON public.members
     FOR ALL TO authenticated
     USING (public.get_user_role() IN ('OWNER', 'ADMIN'))
     WITH CHECK (public.get_user_role() IN ('OWNER', 'ADMIN'));
   ```
2. **Staff Role Access**: Scoped to the operational tables of the role:
   ```sql
   CREATE POLICY "Shop staff can manage shop orders" ON public.shop_orders
     FOR ALL TO authenticated
     USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF'))
     WITH CHECK (public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF'));
   ```
3. **Self-Ownership Access for Members**: Members can only access their own records:
   ```sql
   CREATE POLICY "Members view own bookings" ON public.court_bookings
     FOR SELECT TO authenticated
     USING (
       member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
       OR public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK')
     );
   ```

---

## 7. Middleware Session Proxy

Implemented in `middleware.ts`:
- Refreshes auth tokens on every request.
- Redirects unauthenticated requests targeting `/dashboard/*` to `/login?redirectTo=<target>`.
- Redirects authenticated users from `/login` or `/register` to `/dashboard`.
