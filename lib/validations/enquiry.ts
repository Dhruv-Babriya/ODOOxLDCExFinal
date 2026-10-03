import { z } from 'zod';
import { SPORT_TYPES, QUOTE_STATUSES } from '@/types/shared';

export const publicEnquirySchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
    email: z.string().trim().email('Valid email required').max(255, 'Email cannot exceed 255 characters'),
    phone: z.string().trim().max(25, 'Phone cannot exceed 25 characters').regex(/^[0-9+() -]{7,25}$/, 'Valid phone number required'),
    interestedSport: z.enum(SPORT_TYPES as [string, ...string[]]).optional().nullable(),
    interestedPlanId: z.string().uuid('Invalid plan ID').optional().nullable(),
    requestedTrialDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Trial date must be YYYY-MM-DD').optional().nullable(),
    message: z.string().trim().max(1000, 'Message cannot exceed 1000 characters').optional().nullable(),
  })
  .strict();

export type PublicEnquiryInput = z.infer<typeof publicEnquirySchema>;

export const quoteCreateSchema = z
  .object({
    enquiryId: z.string().uuid('Invalid enquiry ID').optional().nullable(),
    recipientName: z.string().trim().min(2, 'Recipient name required').max(100, 'Recipient name cannot exceed 100 characters'),
    recipientEmail: z.string().trim().email('Valid email required').max(255, 'Email cannot exceed 255 characters'),
    membershipPlanId: z.string().uuid('Invalid plan ID').optional().nullable(),
    quotedAmount: z.coerce.number().min(0, 'Quoted amount cannot be negative').max(10000000, 'Quoted amount cannot exceed 10,000,000'),
    validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid until date must be YYYY-MM-DD'),
    status: z.enum(QUOTE_STATUSES as [string, ...string[]]).default('DRAFT'),
  })
  .strict();

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>;

