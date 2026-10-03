# Development Guidelines & Coding Conventions

**The Champions Club — Sports Club Management System**  
*Document Version:* 1.0.0 (Phase 0)  
*Status:* Authoritative Specification  

---

## 1. Core Engineering Principles

1. **Type Safety Over Speed**: Never use `any`. Use strict TypeScript interfaces, Zod schemas, and generated database types (`types/database.types.ts`).
2. **Server-First by Default**: Default to React Server Components (RSC). Use `'use client'` only at leaves where user interaction, React state, or browser APIs are mandatory.
3. **No Database Logic in Frontend**: Client components must never construct raw queries or dictate integrity rules. All mutations flow through validated Server Actions.
4. **Consistency Across 4 Developers**: Every developer must adhere to the shared contracts in `types/shared.ts` and response envelopes (`ActionResult<T>`).

---

## 2. Naming & Case Conventions

| Element | Convention | Example |
| :--- | :--- | :--- |
| **Directories & Folders** | `kebab-case` | `membership-plans`, `court-bookings` |
| **Files (Non-Component)** | `kebab-case.ts` | `session.ts`, `court-pricing.ts` |
| **React Components** | `PascalCase.tsx` | `CourtBookingGrid.tsx`, `MemberCard.tsx` |
| **TypeScript Types/Enums** | `PascalCase` | `CourtBooking`, `MembershipTier` |
| **Server Actions** | `camelCaseAction` | `createBookingAction`, `recordPaymentAction` |
| **Database Tables** | `snake_case` (plural) | `court_bookings`, `inventory_transactions` |
| **Database Columns** | `snake_case` | `court_id`, `quantity_on_hand` |
| **Zod Schemas** | `camelCaseSchema` | `createBookingSchema`, `paymentSchema` |

---

## 3. Server Component vs Client Component Pattern

### 3.1 Server Component (Default)
Used for data fetching, layouts, page routing, and static presentation:
```typescript
// app/(dashboard)/bookings/page.tsx
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { CourtBookingCalendar } from '@/components/dashboard/CourtBookingCalendar';

export default async function BookingsPage() {
  await requireAuth();
  const supabase = await createClient();
  const { data: courts } = await supabase.from('courts').select('*');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Court Reservations</h1>
      <CourtBookingCalendar initialCourts={courts ?? []} />
    </div>
  );
}
```

### 3.2 Client Component (`'use client'`)
Confined to interactive UI leaves:
```typescript
// components/dashboard/CourtBookingCalendar.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createBookingAction } from '@/actions/bookings';

export function CourtBookingCalendar({ initialCourts }: { initialCourts: Court[] }) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  // Interactive slot selection, state, modal triggers
}
```

---

## 4. Server Action Implementation Standard

Every Server Action must follow this strict 5-step recipe:

```typescript
'use server';

import { requirePermission } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createBookingSchema } from '@/lib/validations/booking';
import { handleActionError } from '@/lib/errors';
import { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

export async function createCourtBookingAction(
  rawData: unknown
): Promise<ActionResult<{ bookingId: string }>> {
  try {
    // 1. Authorize caller
    const user = await requirePermission('courts:book');

    // 2. Validate input with Zod
    const validated = createBookingSchema.parse(rawData);

    // 3. Obtain server Supabase client
    const supabase = await createClient();

    // 4. Execute atomic database operation
    const { data, error } = await supabase.rpc('create_court_booking', {
      p_court_id: validated.court_id,
      p_member_id: validated.member_id ?? user.id,
      p_start_time: validated.start_time,
      p_end_time: validated.end_time,
      p_booking_type: validated.booking_type,
      p_total_price: validated.total_price,
      p_notes: validated.notes ?? null,
    });

    if (error) throw error;

    // 5. Invalidate relevant caches and return typed result
    revalidatePath('/dashboard/bookings');
    return { success: true, data: { bookingId: data } };
  } catch (err) {
    return handleActionError(err);
  }
}
```

---

## 5. UI & Styling Rules

- **Tailwind CSS v4**: Use utility classes directly in `className`.
- **Class Merging**: Combine conditional classes with `cn(...)` (`clsx` + `tailwind-merge`):
  ```typescript
  import { cn } from '@/lib/utils';
  <div className={cn("px-4 py-2 rounded-md", isActive && "bg-emerald-500 text-white")} />
  ```
- **Consistent Color Palette**:
  - Primary Accent: Emerald / Green tones (`emerald-600`, `emerald-500`) symbolizing championship grass courts and vitality.
  - Backgrounds: Dark slate tones (`slate-900`, `slate-950`) for modern, glassmorphic dashboard surfaces.
  - Text: High-contrast `slate-100` and `slate-400`.
- **Icons**: Exclusively use `lucide-react`.

---

## 6. Git Branching & Quality Gates

### 6.1 Branch Naming
- `feature/core-membership` (Developer 1)
- `feature/court-booking` (Developer 2)
- `feature/shop-bar` (Developer 3)
- `feature/finance-website` (Developer 4)

### 6.2 Pre-Commit & Pre-Merge Gate
Before submitting any code for review, every developer must run:
```bash
npx tsc --noEmit
npm run lint
npm run build
```
A pull request cannot be merged if any of these commands fail.
