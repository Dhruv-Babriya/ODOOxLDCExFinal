import { z } from 'zod';
import { DEPARTMENTS } from '@/types/shared';

export const managerCreateSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters'),
    email: z.string().trim().email('Invalid email address').max(255, 'Email cannot exceed 255 characters'),
    phone: z
      .string()
      .trim()
      .max(20, 'Phone cannot exceed 20 characters')
      .regex(/^[0-9+ -]{7,20}$/, 'Invalid phone number')
      .optional()
      .or(z.literal(''))
      .nullable(),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters'),
    employeeCode: z
      .string()
      .trim()
      .min(2, 'Employee code required')
      .max(30, 'Employee code cannot exceed 30 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Employee code must be alphanumeric with underscores or dashes'),
    department: z.enum(DEPARTMENTS as [string, ...string[]]).default('MANAGEMENT'),
    position: z.string().trim().min(2, 'Position title required').max(100, 'Position title cannot exceed 100 characters').default('Club General Manager'),
    salaryMonthly: z.coerce.number().min(0, 'Salary cannot be negative').max(10000000, 'Salary cannot exceed 10,000,000').default(0),
    hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be YYYY-MM-DD'),
    isActive: z.boolean().default(true),
  })
  .strict();

export type ManagerCreateInput = z.infer<typeof managerCreateSchema>;

export const managerUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name cannot exceed 100 characters').optional(),
    phone: z
      .string()
      .trim()
      .max(20, 'Phone cannot exceed 20 characters')
      .regex(/^[0-9+ -]{7,20}$/, 'Invalid phone number')
      .optional()
      .or(z.literal(''))
      .nullable(),
    department: z.enum(DEPARTMENTS as [string, ...string[]]).optional(),
    position: z.string().trim().min(2, 'Position title required').max(100, 'Position title cannot exceed 100 characters').optional(),
    salaryMonthly: z.coerce.number().min(0, 'Salary cannot be negative').max(10000000, 'Salary cannot exceed 10,000,000').optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export type ManagerUpdateInput = z.infer<typeof managerUpdateSchema>;

