import { z } from 'zod';
import { DEPARTMENTS } from '@/types/shared';

export const managerCreateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  employeeCode: z.string().trim().min(2, 'Employee code required'),
  department: z.enum(DEPARTMENTS as [string, ...string[]]).default('MANAGEMENT'),
  position: z.string().trim().min(2, 'Position title required').default('Club General Manager'),
  salaryMonthly: z.coerce.number().min(0).default(0),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be YYYY-MM-DD'),
  isActive: z.boolean().default(true),
});

export type ManagerCreateInput = z.infer<typeof managerCreateSchema>;

export const managerUpdateSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').optional(),
  phone: z.string().trim().regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number').optional().or(z.literal('')),
  department: z.enum(DEPARTMENTS as [string, ...string[]]).optional(),
  position: z.string().trim().min(2, 'Position title required').optional(),
  salaryMonthly: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type ManagerUpdateInput = z.infer<typeof managerUpdateSchema>;
