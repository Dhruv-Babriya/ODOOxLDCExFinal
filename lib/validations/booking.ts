import { z } from 'zod';
import { uuidSchema } from './common';

// ---------------------------------------------------------------------------
// Court Management Schemas
// ---------------------------------------------------------------------------
export const courtCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Court name must be at least 2 characters').max(100, 'Court name cannot exceed 100 characters'),
    sportType: z.enum(['TENNIS', 'CRICKET'] as const),
    hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative').max(100000, 'Hourly rate exceeds maximum limit'),
    isIndoor: z.boolean().default(false),
    isActive: z.boolean().default(true),
  })
  .strict();

export type CourtCreateInput = z.infer<typeof courtCreateSchema>;

export const courtUpdateSchema = z
  .object({
    id: uuidSchema('Invalid court ID'),
    name: z.string().trim().min(2, 'Court name must be at least 2 characters').max(100, 'Court name cannot exceed 100 characters').optional(),
    hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative').max(100000, 'Hourly rate exceeds maximum limit').optional(),
    isIndoor: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type CourtUpdateInput = z.infer<typeof courtUpdateSchema>;

// ---------------------------------------------------------------------------
// Booking Creation Schemas
// ---------------------------------------------------------------------------
export const courtBookingCreateSchema = z
  .object({
    courtId: uuidSchema('Invalid court ID'),
    memberId: uuidSchema('Invalid member ID').optional().nullable(),
    guestName: z.string().trim().min(2, 'Guest name must be at least 2 characters').max(100, 'Guest name cannot exceed 100 characters').optional().nullable(),
    guestPhone: z.string().trim().regex(/^[+0-9\s-]{7,20}$/, 'Invalid phone number format').max(20, 'Phone cannot exceed 20 characters').optional().nullable().or(z.literal('')),
    bookingType: z.enum(['STANDARD', 'SOCIAL_PLAY', 'COACHING', 'MAINTENANCE'] as const).default('STANDARD'),
    startTime: z.string().datetime({ message: 'Start time must be a valid ISO datetime string' }),
    endTime: z.string().datetime({ message: 'End time must be a valid ISO datetime string' }),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
  })
  .strict()
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    // Requirement: Identity association (must be linked to a member or a named walk-in guest)
    if (!data.memberId && (!data.guestName || data.guestName.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Booking must be associated with either an active member or a guest name',
        path: ['guestName'],
      });
    }

    // Requirement: One-hour sessions
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    if (durationMinutes !== 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Court sessions must be exactly 60 minutes in duration',
        path: ['endTime'],
      });
    }

    // Requirement: Start slots on the hour or half-hour (:00 or :30)
    const startMinute = start.getUTCMinutes();
    if (startMinute !== 0 && startMinute !== 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Booking slot must start on the hour (:00) or half-hour (:30)',
        path: ['startTime'],
      });
    }

    // Requirement: Operating hours 06:00 to 22:00 UTC (first slot starts 06:00, last ends by 22:30)
    const startHour = start.getUTCHours();
    if (startHour < 6 || startHour > 21) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Courts are open from 06:00 to 22:00. Sessions cannot start before 06:00 or after 21:30',
        path: ['startTime'],
      });
    }

    // Requirement: Cannot book in the past
    if (start.getTime() < Date.now() - 5 * 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot book a court slot in the past',
        path: ['startTime'],
      });
    }

    // Requirement: Max advance booking window (e.g., 30 days)
    const maxAdvanceMs = 30 * 24 * 60 * 60 * 1000;
    if (start.getTime() > Date.now() + maxAdvanceMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bookings cannot be made more than 30 days in advance',
        path: ['startTime'],
      });
    }
  });

export type CourtBookingCreateInput = z.infer<typeof courtBookingCreateSchema>;

// ---------------------------------------------------------------------------
// Booking Rescheduling Schema (Phase 2)
// ---------------------------------------------------------------------------
export const bookingRescheduleSchema = z
  .object({
    bookingId: uuidSchema('Invalid booking ID'),
    newCourtId: uuidSchema('Invalid court ID'),
    newStartTime: z.string().datetime({ message: 'Start time must be a valid ISO datetime string' }),
    newEndTime: z.string().datetime({ message: 'End time must be a valid ISO datetime string' }),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().or(z.literal('')),
  })
  .strict()
  .superRefine((data, ctx) => {
    const start = new Date(data.newStartTime);
    const end = new Date(data.newEndTime);

    // Requirement: One-hour sessions
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = durationMs / (1000 * 60);

    if (durationMinutes !== 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rescheduled sessions must be exactly 60 minutes in duration',
        path: ['newEndTime'],
      });
    }

    // Requirement: New slots every 30 minutes
    const startMinute = start.getUTCMinutes();
    if (startMinute !== 0 && startMinute !== 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rescheduled slot must start on the hour (:00) or half-hour (:30)',
        path: ['newStartTime'],
      });
    }

    // Operating hours: 06:00 to 22:00 UTC (first slot 06:00, last session ends by 22:30, start <= 21:30)
    const startHour = start.getUTCHours();
    if (startHour < 6 || startHour > 21) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Courts are open from 06:00 to 22:00. Sessions cannot start before 06:00 or after 21:30',
        path: ['newStartTime'],
      });
    }

    // Prevent rescheduling to the past
    if (start.getTime() < Date.now() - 5 * 60 * 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot reschedule a court to a past date or time',
        path: ['newStartTime'],
      });
    }
  });

export type BookingRescheduleInput = z.infer<typeof bookingRescheduleSchema>;

// ---------------------------------------------------------------------------
// Booking Cancellation Schema
// ---------------------------------------------------------------------------
export const bookingCancellationSchema = z
  .object({
    bookingId: uuidSchema('Invalid booking ID'),
    cancellationReason: z.string().trim().min(3, 'Cancellation reason must be provided (at least 3 characters)').max(500, 'Cancellation reason cannot exceed 500 characters'),
  })
  .strict();

export type BookingCancellationInput = z.infer<typeof bookingCancellationSchema>;

// ---------------------------------------------------------------------------
// Social Play Participant Schemas
// ---------------------------------------------------------------------------
export const addParticipantSchema = z
  .object({
    bookingId: uuidSchema('Invalid booking ID'),
    memberId: uuidSchema('Invalid member ID').optional().nullable(),
    guestName: z.string().trim().min(2, 'Guest name must be at least 2 characters').max(100, 'Guest name cannot exceed 100 characters').optional().nullable(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.memberId && !data.guestName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please provide either a member ID or a guest name',
        path: ['guestName'],
      });
    }
  });

export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

export const removeParticipantSchema = z
  .object({
    participantId: uuidSchema('Invalid participant ID'),
    bookingId: uuidSchema('Invalid booking ID'),
  })
  .strict();

export type RemoveParticipantInput = z.infer<typeof removeParticipantSchema>;

// ---------------------------------------------------------------------------
// Pricing Preview Schema
// ---------------------------------------------------------------------------
export const bookingPricePreviewSchema = z
  .object({
    courtId: uuidSchema('Invalid court ID'),
    memberId: uuidSchema('Invalid member ID').optional().nullable(),
    startTime: z.string().datetime({ message: 'Start time must be a valid ISO datetime string' }),
  })
  .strict();

export type BookingPricePreviewInput = z.infer<typeof bookingPricePreviewSchema>;

// ---------------------------------------------------------------------------
// Booking Payment Schema
// ---------------------------------------------------------------------------
export const bookingPaymentSchema = z
  .object({
    bookingId: uuidSchema('Invalid booking ID'),
    amount: z.coerce.number().min(0.01, 'Payment amount must be greater than zero').max(1000000, 'Payment amount exceeds maximum limit'),
    paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'] as const),
    transactionReference: z.string().trim().max(100, 'Transaction reference cannot exceed 100 characters').optional().or(z.literal('')),
  })
  .strict();

export type BookingPaymentInput = z.infer<typeof bookingPaymentSchema>;

// ---------------------------------------------------------------------------
// Availability Query Schema
// ---------------------------------------------------------------------------
export const availabilityQuerySchema = z
  .object({
    courtId: uuidSchema('Invalid court ID'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  })
  .strict();

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
