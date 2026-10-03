import { z } from 'zod';
import { DEPARTMENTS, LEAVE_TYPES, SHIFT_STATUSES } from '@/types/shared';

export const staffCreateSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
  employeeCode: z.string().trim().min(2, 'Employee code required'),
  department: z.enum(DEPARTMENTS as [string, ...string[]]),
  position: z.string().trim().min(2, 'Position title required'),
  hourlyRate: z.coerce.number().min(0).default(0),
  salaryMonthly: z.coerce.number().min(0).default(0),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Hire date must be YYYY-MM-DD'),
  isActive: z.boolean().default(true),
});

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

export const staffShiftSchema = z.object({
  staffId: z.string().uuid('Invalid staff ID'),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Shift date must be YYYY-MM-DD'),
  startTime: z.string().datetime('Start time must be ISO datetime'),
  endTime: z.string().datetime('End time must be ISO datetime'),
  status: z.enum(SHIFT_STATUSES as [string, ...string[]]).default('SCHEDULED'),
  notes: z.string().trim().optional(),
}).refine(
  (data) => new Date(data.endTime) > new Date(data.startTime),
  {
    message: 'Shift end time must be after start time',
    path: ['endTime'],
  }
);

export type StaffShiftInput = z.infer<typeof staffShiftSchema>;

export const leaveRequestSchema = z.object({
  staffId: z.string().uuid('Invalid staff ID'),
  leaveType: z.enum(LEAVE_TYPES as [string, ...string[]]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD'),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters'),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: 'Leave end date must be on or after start date',
    path: ['endDate'],
  }
);

export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;
