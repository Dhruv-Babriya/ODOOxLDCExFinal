import { z } from 'zod';
import { TABLE_STATUSES } from '@/types/shared';

export const barTableSchema = z.object({
  tableNumber: z.string().trim().min(1, 'Table number is required'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').default(4),
  status: z.enum(TABLE_STATUSES as [string, ...string[]]).default('AVAILABLE'),
});

export type BarTableInput = z.infer<typeof barTableSchema>;

export const menuItemSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  name: z.string().trim().min(2, 'Item name must be at least 2 characters'),
  description: z.string().trim().optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  isAvailable: z.boolean().default(true),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const customerTabOpenSchema = z.object({
  memberId: z.string().uuid('Invalid member ID').optional().nullable(),
  tableId: z.string().uuid('Invalid table ID').optional().nullable(),
});

export type CustomerTabOpenInput = z.infer<typeof customerTabOpenSchema>;

export const barOrderItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  specialInstructions: z.string().trim().optional(),
});

export const barOrderCreateSchema = z.object({
  tabId: z.string().uuid('Invalid tab ID').optional().nullable(),
  tableId: z.string().uuid('Invalid table ID').optional().nullable(),
  memberId: z.string().uuid('Invalid member ID').optional().nullable(),
  items: z.array(barOrderItemSchema).min(1, 'Order must contain at least one item'),
});

export type BarOrderCreateInput = z.infer<typeof barOrderCreateSchema>;
