import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['OWNER', 'ADMIN', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'MEMBER'] as const).default('MEMBER'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').optional(),
  phone: z.string().trim().regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  avatarUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
