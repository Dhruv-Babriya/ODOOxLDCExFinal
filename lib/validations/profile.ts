import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9\s-]{7,20}$/, 'Please enter a valid phone number format (7 to 20 digits)')
      .max(20, 'Phone cannot exceed 20 characters')
      .optional()
      .or(z.literal('')),
    avatarUrl: z.string().trim().url('Must be a valid URL').max(2048, 'URL cannot exceed 2048 characters').optional().or(z.literal('')),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
