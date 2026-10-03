import { z } from 'zod';

export const membershipPlanSchema = z.object({
  name: z.string().trim().min(3, 'Plan name must be at least 3 characters'),
  tier: z.enum(['GOLD', 'SILVER', 'JUNIOR'] as const),
  description: z.string().trim().optional(),
  durationDays: z.coerce.number().int().min(1, 'Duration must be at least 1 day').default(365),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  courtDiscountPercent: z.coerce.number().min(0).max(100).default(0),
  shopDiscountPercent: z.coerce.number().min(0).max(100).default(0),
  barDiscountPercent: z.coerce.number().min(0).max(100).default(0),
  freeCourtHoursPerDay: z.coerce.number().int().min(0).default(0),
  maxDailyBookings: z.coerce.number().int().min(1).default(2),
  isActive: z.boolean().default(true),
});

export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;

export const memberCreateSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
  membershipNumber: z.string().trim().min(3, 'Membership number required'),
  currentPlanId: z.string().uuid('Invalid membership plan ID'),
  status: z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PENDING'] as const).default('ACTIVE'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  emergencyContact: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  }
);

export type MemberCreateInput = z.infer<typeof memberCreateSchema>;

export const memberUpdateSchema = memberCreateSchema.partial().extend({
  id: z.string().uuid('Member ID is required'),
});

export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
