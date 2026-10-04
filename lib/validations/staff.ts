import { z } from 'zod';
import { DEPARTMENTS, LEAVE_TYPES, SHIFT_STATUSES } from '@/types/shared';
import { uuidSchema } from './common';

export const staffCreateSchema = z
  .object({
    profileId: uuidSchema('Invalid profile ID'),
    employeeCode: z
      .string()
      .trim()
      .min(2, 'Employee code required')
      .max(30, 'Employee code cannot exceed 30 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Employee code must be alphanumeric with underscores or dashes'),
    department: z.enum(DEPARTMENTS as [string, ...string[]]),
    position: z.string().trim().min(2, 'Position title required').max(100, 'Position title cannot exceed 100 characters'),
    hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative').max(100000, 'Hourly rate exceeds limit').default(0),
    salaryMonthly: z.coerce.number().min(0, 'Salary cannot be negative').max(10000000, 'Salary exceeds limit').default(0),
    hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be YYYY-MM-DD'),
    isActive: z.boolean().default(true),
  })
  .strict();

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

export const staffOnboardSchema = z
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
    password: z.string().min(6, 'Initial login password must be at least 6 characters').max(100, 'Password cannot exceed 100 characters'),
    role: z.enum(['FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'ADMIN'] as const),
    department: z.enum(DEPARTMENTS as [string, ...string[]]),
    position: z.string().trim().min(2, 'Position title required').max(100, 'Position title cannot exceed 100 characters'),
    employeeCode: z
      .string()
      .trim()
      .min(2, 'Employee code required')
      .max(30, 'Employee code cannot exceed 30 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Employee code must be alphanumeric with underscores or dashes'),
    hourlyRate: z.coerce.number().min(0, 'Hourly rate cannot be negative').max(100000, 'Hourly rate exceeds limit').default(0),
    salaryMonthly: z.coerce.number().min(0, 'Salary cannot be negative').max(10000000, 'Salary exceeds limit').default(0),
    hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be YYYY-MM-DD'),
    isActive: z.boolean().default(true),
  })
  .strict();

export type StaffOnboardInput = z.infer<typeof staffOnboardSchema>;

export const staffShiftSchema = z
  .object({
    staffId: uuidSchema('Invalid staff ID'),
    shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Shift date must be YYYY-MM-DD'),
    startTime: z.string().datetime('Start time must be ISO datetime'),
    endTime: z.string().datetime('End time must be ISO datetime'),
    status: z.enum(SHIFT_STATUSES as [string, ...string[]]).default('SCHEDULED'),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  })
  .strict()
  .refine(
    (data) => new Date(data.endTime) > new Date(data.startTime),
    {
      message: 'Shift end time must be after start time',
      path: ['endTime'],
    }
  );

export type StaffShiftInput = z.infer<typeof staffShiftSchema>;

export const leaveRequestSchema = z
  .object({
    staffId: uuidSchema('Invalid staff ID'),
    leaveType: z.enum(LEAVE_TYPES as [string, ...string[]]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
    reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(1000, 'Reason cannot exceed 1000 characters'),
  })
  .strict()
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    {
      message: 'Leave end date must be on or after start date',
      path: ['endDate'],
    }
  );

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
