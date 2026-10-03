import { z } from 'zod';

export const courtCreateSchema = z.object({
  name: z.string().trim().min(2, 'Court name must be at least 2 characters'),
  sportType: z.enum(['TENNIS', 'CRICKET'] as const),
  hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative'),
  isIndoor: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type CourtCreateInput = z.infer<typeof courtCreateSchema>;

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

  // Requirement 4: One-hour sessions
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = durationMs / (1000 * 60);

  if (durationMinutes !== 60) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Courts have one-hour sessions (duration must be exactly 60 minutes)',
      path: ['endTime'],
    });
  }

  // Requirement 4: New slots every 30 minutes (must start on :00 or :30)
  const startMinute = start.getUTCMinutes();
  if (startMinute !== 0 && startMinute !== 30) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Booking slots must start on the hour (:00) or half-hour (:30)',
      path: ['startTime'],
    });
  }
});

export type CourtBookingCreateInput = z.infer<typeof courtBookingCreateSchema>;

export const bookingCancellationSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  cancellationReason: z.string().trim().min(3, 'Cancellation reason must be provided'),
});

export type BookingCancellationInput = z.infer<typeof bookingCancellationSchema>;

export const addParticipantSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  memberId: z.string().uuid('Invalid member ID').optional().nullable(),
  guestName: z.string().trim().min(2, 'Guest name must be at least 2 characters').optional().nullable(),
});

export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
