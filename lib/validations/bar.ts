import { z } from 'zod';
import { TABLE_STATUSES, KITCHEN_STATUSES, ORDER_STATUSES } from '@/types/shared';
import { uuidSchema } from './common';

export const barTableSchema = z
  .object({
    tableNumber: z
      .string()
      .trim()
      .min(1, 'Table number is required')
      .max(20, 'Table number cannot exceed 20 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Table number must be alphanumeric with underscores or dashes')
      .toUpperCase(),
    capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100').default(4),
    status: z.enum(TABLE_STATUSES as [string, ...string[]]).default('AVAILABLE'),
  })
  .strict();

export type BarTableInput = z.infer<typeof barTableSchema>;

export const barTableStatusUpdateSchema = z
  .object({
    tableId: uuidSchema('Invalid table ID'),
    status: z.enum(TABLE_STATUSES as [string, ...string[]]),
  })
  .strict();

export type BarTableStatusUpdateInput = z.infer<typeof barTableStatusUpdateSchema>;

export const menuCategoryCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(100, 'Category name cannot exceed 100 characters'),
    displayOrder: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .strict();

export type MenuCategoryCreateInput = z.infer<typeof menuCategoryCreateSchema>;

export const menuItemSchema = z
  .object({
    categoryId: uuidSchema('Invalid category ID').optional().nullable(),
    name: z.string().trim().min(2, 'Item name must be at least 2 characters').max(150, 'Item name cannot exceed 150 characters'),
    description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
    price: z.coerce.number().min(0, 'Price cannot be negative').max(1000000, 'Price cannot exceed 1,000,000'),
    isAvailable: z.boolean().default(true),
  })
  .strict();

export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const menuItemUpdateSchema = z
  .object({
    id: uuidSchema('Invalid menu item ID'),
    categoryId: uuidSchema('Invalid category ID').optional().nullable(),
    name: z.string().trim().min(2, 'Item name must be at least 2 characters').max(150, 'Item name cannot exceed 150 characters'),
    description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
    price: z.coerce.number().min(0, 'Price cannot be negative').max(1000000, 'Price cannot exceed 1,000,000'),
    isAvailable: z.boolean().default(true),
  })
  .strict();

export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;

export const menuItemToggleAvailabilitySchema = z
  .object({
    id: uuidSchema('Invalid menu item ID'),
    isAvailable: z.boolean(),
  })
  .strict();

export type MenuItemToggleAvailabilityInput = z.infer<typeof menuItemToggleAvailabilitySchema>;

export const customerTabOpenSchema = z
  .object({
    memberId: uuidSchema('Invalid member ID').optional().nullable(),
    tableId: uuidSchema('Invalid table ID').optional().nullable(),
    tabNumber: z
      .string()
      .trim()
      .max(30, 'Tab number cannot exceed 30 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'Tab number must be alphanumeric with underscores or dashes')
      .optional()
      .nullable(),
    guestName: z.string().trim().min(2, 'Guest name must be at least 2 characters').max(100, 'Guest name cannot exceed 100 characters').optional().nullable(),
    creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative').max(10000000, 'Credit limit cannot exceed 10,000,000').default(0),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      // Must have either a member or a guest name or a table
      return !!(data.memberId || data.guestName || data.tableId);
    },
    {
      message: 'Tab must be linked to a member, table, or guest name.',
      path: ['guestName'],
    }
  );

export type CustomerTabOpenInput = z.infer<typeof customerTabOpenSchema>;

export const customerTabCloseSchema = z
  .object({
    tabId: uuidSchema('Invalid tab ID'),
    force: z.boolean().default(false),
  })
  .strict();

export type CustomerTabCloseInput = z.infer<typeof customerTabCloseSchema>;

export const releaseBarTableSchema = z
  .object({
    tableId: uuidSchema('Invalid table ID'),
  })
  .strict();

export type ReleaseBarTableInput = z.infer<typeof releaseBarTableSchema>;

export const barOrderItemSchema = z
  .object({
    menuItemId: uuidSchema('Invalid menu item ID'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
    specialInstructions: z.string().trim().max(300, 'Special instructions cannot exceed 300 characters').optional().nullable(),
  })
  .strict();

export type BarOrderItemInput = z.infer<typeof barOrderItemSchema>;

export const barOrderCreateSchema = z
  .object({
    tabId: uuidSchema('Invalid tab ID').optional().nullable(),
    tableId: uuidSchema('Invalid table ID').optional().nullable(),
    memberId: uuidSchema('Invalid member ID').optional().nullable(),
    items: z.array(barOrderItemSchema).min(1, 'Order must contain at least one item').max(50, 'Order cannot exceed 50 items'),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      return !!(data.tabId || data.tableId || data.memberId);
    },
    {
      message: 'Bar order must be associated with a Table, Customer Tab, or Member.',
      path: ['tableId'],
    }
  );

export type BarOrderCreateInput = z.infer<typeof barOrderCreateSchema>;

export const updateKitchenStatusSchema = z
  .object({
    orderId: uuidSchema('Invalid order ID'),
    kitchenStatus: z.enum(KITCHEN_STATUSES as [string, ...string[]]),
  })
  .strict();

export type UpdateKitchenStatusInput = z.infer<typeof updateKitchenStatusSchema>;

export const updateBarOrderStatusSchema = z
  .object({
    orderId: uuidSchema('Invalid order ID'),
    orderStatus: z.enum(ORDER_STATUSES as [string, ...string[]]),
  })
  .strict();

export type UpdateBarOrderStatusInput = z.infer<typeof updateBarOrderStatusSchema>;
