import { z } from 'zod';

export const membershipPlanSchema = z
  .object({
    name: z.string().trim().min(3, 'Plan name must be at least 3 characters').max(100, 'Plan name cannot exceed 100 characters'),
    tier: z.enum(['GOLD', 'SILVER', 'JUNIOR'] as const),
    description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().or(z.literal('')),
    durationDays: z.coerce.number().int().min(1, 'Duration must be at least 1 day').max(3650, 'Duration cannot exceed 10 years').default(365),
    price: z.coerce.number().min(0, 'Price cannot be negative').max(10000000, 'Price exceeds maximum allowed limit'),
    courtDiscountPercent: z.coerce.number().min(0).max(100, 'Discount cannot exceed 100%').default(0),
    shopDiscountPercent: z.coerce.number().min(0).max(100, 'Discount cannot exceed 100%').default(0),
    barDiscountPercent: z.coerce.number().min(0).max(100, 'Discount cannot exceed 100%').default(0),
    freeCourtHoursPerDay: z.coerce.number().int().min(0).max(24, 'Free court hours cannot exceed 24').default(0),
    maxDailyBookings: z.coerce.number().int().min(1).max(20, 'Max daily bookings cannot exceed 20').default(2),
    isActive: z.boolean().default(true),
  })
  .strict();

export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;

export const membershipPlanUpdateSchema = membershipPlanSchema.extend({
  id: z.string().uuid('Invalid plan ID'),
});

export type MembershipPlanUpdateInput = z.infer<typeof membershipPlanUpdateSchema>;

export const memberCreateSchema = z
  .object({
    profileId: z.string().uuid('Invalid profile ID'),
    membershipNumber: z
      .string()
      .trim()
      .min(3, 'Membership number required')
      .max(30, 'Membership number cannot exceed 30 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Membership number can only contain alphanumeric characters, hyphens, and underscores'),
    currentPlanId: z.string().uuid('Invalid membership plan ID'),
    status: z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PENDING'] as const).default('ACTIVE'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
    emergencyContact: z.string().trim().max(100, 'Emergency contact cannot exceed 100 characters').optional().or(z.literal('')),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
  })
  .strict()
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type MemberCreateInput = z.infer<typeof memberCreateSchema>;

export const memberRegisterSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
    email: z.string().trim().email('Invalid email address').max(255, 'Email cannot exceed 255 characters'),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9\s-]{7,20}$/, 'Please enter a valid phone number format (7 to 20 digits)')
      .max(20, 'Phone cannot exceed 20 characters')
      .optional()
      .or(z.literal('')),
    membershipNumber: z
      .string()
      .trim()
      .min(3, 'Membership number must be at least 3 characters')
      .max(30, 'Membership number cannot exceed 30 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Membership number can only contain alphanumeric characters, hyphens, and underscores'),
    planId: z.string().uuid('Please select a valid membership plan'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
    emergencyContact: z.string().trim().max(100, 'Emergency contact cannot exceed 100 characters').optional().or(z.literal('')),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
    paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'UNPAID'] as const).default('CASH'),
    paymentReference: z.string().trim().max(100, 'Payment reference cannot exceed 100 characters').optional().or(z.literal('')),
  })
  .strict()
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type MemberRegisterInput = z.infer<typeof memberRegisterSchema>;

export const memberUpdateSchema = z
  .object({
    id: z.string().uuid('Member ID is required'),
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9\s-]{7,20}$/, 'Please enter a valid phone number format (7 to 20 digits)')
      .max(20, 'Phone cannot exceed 20 characters')
      .optional()
      .or(z.literal('')),
    emergencyContact: z.string().trim().max(100, 'Emergency contact cannot exceed 100 characters').optional().or(z.literal('')),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
    status: z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PENDING'] as const).optional(),
  })
  .strict();

export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;

export const memberRenewalSchema = z
  .object({
    memberId: z.string().uuid('Member ID is required'),
    planId: z.string().uuid('Membership plan is required'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
    paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'UNPAID'] as const).default('CASH'),
    paymentReference: z.string().trim().max(100, 'Payment reference cannot exceed 100 characters').optional().or(z.literal('')),
  })
  .strict()
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export type MemberRenewalInput = z.infer<typeof memberRenewalSchema>;

export const memberStatusUpdateSchema = z
  .object({
    memberId: z.string().uuid('Member ID is required'),
    status: z.enum(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PENDING'] as const),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
  })
  .strict();

export type MemberStatusUpdateInput = z.infer<typeof memberStatusUpdateSchema>;

export const memberEnrollSelfSchema = z
  .object({
    planId: z.string().uuid('Membership plan is required'),
    paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'UNPAID'] as const).default('CARD'),
    paymentReference: z.string().trim().max(100, 'Payment reference cannot exceed 100 characters').optional().or(z.literal('')),
    emergencyContact: z.string().trim().max(100, 'Emergency contact cannot exceed 100 characters').optional().or(z.literal('')),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
  })
  .strict();

export type MemberEnrollSelfInput = z.infer<typeof memberEnrollSelfSchema>;

