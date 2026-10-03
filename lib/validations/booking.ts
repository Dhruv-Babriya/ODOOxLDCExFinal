import { z } from 'zod';

// ---------------------------------------------------------------------------
// Court Management Schemas
// ---------------------------------------------------------------------------
export const courtCreateSchema = z.object({
  name: z.string().trim().min(2, 'Court name must be at least 2 characters'),
  sportType: z.enum(['TENNIS', 'CRICKET'] as const),
  hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative'),
  isIndoor: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CourtCreateInput = z.infer<typeof courtCreateSchema>;

export const courtUpdateSchema = z.object({
  id: z.string().uuid('Invalid court ID'),
  name: z.string().trim().min(2, 'Court name must be at least 2 characters').optional(),
  hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative').optional(),
  isIndoor: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type CourtUpdateInput = z.infer<typeof courtUpdateSchema>;

// ---------------------------------------------------------------------------
// Booking Creation Schemas
// ---------------------------------------------------------------------------
export const courtBookingCreateSchema = z.object({
  courtId: z.string().uuid('Invalid court ID'),
  memberId: z.string().uuid('Invalid member ID').optional().nullable(),
  bookingType: z.enum(['STANDARD', 'SOCIAL_PLAY', 'COACHING', 'MAINTENANCE'] as const).default('STANDARD'),
  startTime: z.string().datetime({ message: 'Start time must be a valid ISO datetime string' }),
  endTime: z.string().datetime({ message: 'End time must be a valid ISO datetime string' }),
  notes: z.string().trim().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  // Requirement: One-hour sessions
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = durationMs / (1000 * 60);

  if (durationMinutes !== 60) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Courts have one-hour sessions (duration must be exactly 60 minutes)',
      path: ['endTime'],
    });
  }

  // Requirement: New slots every 30 minutes (must start on :00 or :30)
  const startMinute = start.getUTCMinutes();
  if (startMinute !== 0 && startMinute !== 30) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Booking slots must start on the hour (:00) or half-hour (:30)',
      path: ['startTime'],
    });
  }

  // Prevent booking in the past
  if (start.getTime() < Date.now() - 5 * 60 * 1000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cannot book a court in the past',
      path: ['startTime'],
    });
  }
});

export type CourtBookingCreateInput = z.infer<typeof courtBookingCreateSchema>;

// ---------------------------------------------------------------------------
// Booking Cancellation Schema
// ---------------------------------------------------------------------------
export const bookingCancellationSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  cancellationReason: z.string().trim().min(3, 'Cancellation reason must be provided'),
});

export type BookingCancellationInput = z.infer<typeof bookingCancellationSchema>;

// ---------------------------------------------------------------------------
// Social Play Participant Schema
// ---------------------------------------------------------------------------
export const addParticipantSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  memberId: z.string().uuid('Invalid member ID').optional().nullable(),
  guestName: z.string().trim().min(2, 'Guest name must be at least 2 characters').optional().nullable(),
}).superRefine((data, ctx) => {
  // Must provide either memberId or guestName
  if (!data.memberId && !data.guestName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Please provide either a member ID or a guest name',
      path: ['guestName'],
    });
  }
});

export type AddParticipantInput = z.infer<typeof addParticipantSchema>;

// ---------------------------------------------------------------------------
// Availability Query Schema
// ---------------------------------------------------------------------------
export const availabilityQuerySchema = z.object({
  courtId: z.string().uuid('Invalid court ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
});

export type AvailabilityQueryInput = z.infer<typeof availabilityQuerySchema>;
