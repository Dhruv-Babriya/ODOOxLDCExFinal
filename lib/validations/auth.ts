import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255, 'Email cannot exceed 255 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters'),
}).strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
  email: z.string().trim().email('Invalid email address').max(255, 'Email cannot exceed 255 characters'),
  phone: z.string().trim().regex(/^[0-9+ -]{7,20}$/, 'Invalid phone number format (7 to 20 digits)').max(20, 'Phone cannot exceed 20 characters').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters'),
  // Registration page is exclusively for Club Members. Staff accounts must be provisioned by Managers.
  role: z.literal('MEMBER').optional().default('MEMBER'),
}).strict();

export type RegisterInput = z.input<typeof registerSchema>;

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').optional(),
  phone: z.string().trim().regex(/^[0-9+ -]{7,20}$/, 'Invalid phone number format (7 to 20 digits)').max(20, 'Phone cannot exceed 20 characters').optional().or(z.literal('')),
  avatarUrl: z.string().trim().url('Invalid URL format').max(2048, 'URL cannot exceed 2048 characters').optional().or(z.literal('')),
}).strict();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
