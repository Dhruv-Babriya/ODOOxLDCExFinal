# Security Foundation & Threat Mitigation

**The Champions Club — Sports Club Management System**  
*Document Version:* 1.0.0 (Phase 0)  
*Status:* Authoritative Specification  

---

## 1. Security Architecture Overview

The Champions Club application is engineered to meet commercial-grade security standards for financial, personal, and operational data.

Security is implemented at five distinct architectural layers:

```
[1. Client / Browser]       ──► HTTPS / TLS 1.3, SameSite Cookies, XSS Escaping
         │
[2. Next.js Middleware]     ──► Session Refresh, Route Protection, Origin Validation
         │
[3. Server Actions]         ──► Server-side Zod Validation, RBAC Permission Guards
         │
[4. Supabase Client SDK]    ──► Zero raw SQL interpolation, Parameterized calls
         │
[5. PostgreSQL Engine]      ──► Row Level Security (RLS), CHECKs, Constraints
```

---

## 2. Secrets Management & Environment Isolation

### 2.1 Credential Classification
1. **Public Keys (`NEXT_PUBLIC_*`)**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Public endpoint for the Supabase instance.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Safe for client-side bundle. Grants zero permissions on its own because every query is evaluated against RLS policies.
2. **Server-Only Secrets (Never Public)**:
   - `SUPABASE_SERVICE_ROLE_KEY`: Elevated administrative bypass key. **Must never be prefixed with `NEXT_PUBLIC_`**. Only imported inside server environments (e.g. `lib/supabase/admin.ts`).
   - If accidentally exposed to the browser, all RLS protections would be completely nullified.

### 2.2 Environment File Rules
- `.env.local` is listed in `.gitignore` and never committed to Git.
- `.env.example` contains only variable keys without secrets, serving as a template for developers.

---

## 3. Row Level Security (RLS) Policy Architecture

All 28 tables in the `public` schema have RLS active (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`).

### 3.1 Role Resolution without Privilege Escalation
To prevent endless recursive queries when RLS checks query `public.profiles`, we utilize `public.get_user_role()`:
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
- Marked `SECURITY DEFINER` so it executes with function-owner privileges.
- Explicitly locks `search_path = public` to defeat path-shadowing attacks.
- Returns `'MEMBER'` by default if unauthenticated or profile is missing.

### 3.2 Member Data Isolation
Every table containing member-specific records (e.g. `court_bookings`, `shop_orders`, `customer_tabs`, `invoices`) enforces isolation:
```sql
CREATE POLICY "Members view own invoices"
  ON public.invoices
  FOR SELECT TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    OR public.get_user_role() IN ('OWNER', 'ADMIN')
  );
```

---

## 4. Threat Model & Mitigations

| Threat | Vulnerability Vector | Defense Implemented |
| :--- | :--- | :--- |
| **SQL Injection** | Dynamic SQL or string concatenation | Supabase PostgREST client constructs parameterized queries. Raw string concatenation is prohibited. |
| **Cross-Site Scripting (XSS)** | Malicious user input rendered into HTML | React 19 automatically escapes strings. No use of `dangerouslySetInnerHTML`. |
| **Cross-Site Request Forgery (CSRF)**| Browser state reuse on state-changing requests | Next.js Server Actions automatically verify the `Origin` and `Host` headers. Cookies use `SameSite=Lax`. |
| **IDOR (Insecure Direct Object Reference)**| Guessing another user's UUID | PostgreSQL RLS filters all rows by `auth.uid()`. Even if an attacker passes another user's UUID, PostgreSQL returns 0 rows. |
| **Booking Race Conditions** | Concurrent slot booking | PostgreSQL `EXCLUDE` constraint with `btree_gist` resolves concurrency at the database engine level. |
| **Negative Stock Exploits** | Concurrent checkout depleting stock below 0 | PostgreSQL `CHECK (quantity_on_hand >= 0)` blocks overselling. |
| **Information Leakage** | Database error messages showing schema internals | `lib/errors.ts` catches database error codes (e.g. `23505`, `23P01`) and returns clean, sanitized user messages. |

---

## 5. Audit Logging Architecture

Critical events are permanently recorded in `public.audit_logs`:
- Profile role modifications (`MEMBER` promoted to `ADMIN`).
- Financial transactions, refunds, and voids.
- Manual inventory stock adjustments.
- Court booking cancellations with caller identity.

The `audit_logs` table has an append-only policy: `INSERT` is permitted for authenticated systems, but `UPDATE` and `DELETE` are denied to all users except the database superuser.
