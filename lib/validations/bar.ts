import { z } from 'zod';
import { TABLE_STATUSES, KITCHEN_STATUSES, ORDER_STATUSES } from '@/types/shared';

export const barTableSchema = z.object({
  tableNumber: z.string().trim().min(1, 'Table number is required').toUpperCase(),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').default(4),
  status: z.enum(TABLE_STATUSES as [string, ...string[]]).default('AVAILABLE'),
});

export type BarTableInput = z.infer<typeof barTableSchema>;

export const barTableStatusUpdateSchema = z.object({
  tableId: z.string().uuid('Invalid table ID'),
  status: z.enum(TABLE_STATUSES as [string, ...string[]]),
});

export type BarTableStatusUpdateInput = z.infer<typeof barTableStatusUpdateSchema>;

export const menuCategoryCreateSchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters'),
  displayOrder: z.coerce.number().int().default(0),
});

export type MenuCategoryCreateInput = z.infer<typeof menuCategoryCreateSchema>;

export const menuItemSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  name: z.string().trim().min(2, 'Item name must be at least 2 characters'),
  description: z.string().trim().optional().nullable(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  isAvailable: z.boolean().default(true),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;

export const menuItemUpdateSchema = z.object({
  id: z.string().uuid('Invalid menu item ID'),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  name: z.string().trim().min(2, 'Item name must be at least 2 characters'),
  description: z.string().trim().optional().nullable(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  isAvailable: z.boolean().default(true),
});

export type MenuItemUpdateInput = z.infer<typeof menuItemUpdateSchema>;

export const menuItemToggleAvailabilitySchema = z.object({
  id: z.string().uuid('Invalid menu item ID'),
  isAvailable: z.boolean(),
});

export type MenuItemToggleAvailabilityInput = z.infer<typeof menuItemToggleAvailabilitySchema>;

export const customerTabOpenSchema = z
  .object({
    memberId: z.string().uuid('Invalid member ID').optional().nullable(),
    tableId: z.string().uuid('Invalid table ID').optional().nullable(),
    tabNumber: z.string().trim().optional().nullable(),
    guestName: z.string().trim().optional().nullable(),
    creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative').default(0),
    notes: z.string().trim().optional().nullable(),
  })
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

export const customerTabCloseSchema = z.object({
  tabId: z.string().uuid('Invalid tab ID'),
});

export type CustomerTabCloseInput = z.infer<typeof customerTabCloseSchema>;

export const barOrderItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  specialInstructions: z.string().trim().optional().nullable(),
});

export type BarOrderItemInput = z.infer<typeof barOrderItemSchema>;

export const barOrderCreateSchema = z
  .object({
    tabId: z.string().uuid('Invalid tab ID').optional().nullable(),
    tableId: z.string().uuid('Invalid table ID').optional().nullable(),
    memberId: z.string().uuid('Invalid member ID').optional().nullable(),
    items: z.array(barOrderItemSchema).min(1, 'Order must contain at least one item'),
    notes: z.string().trim().optional().nullable(),
  })
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

export const updateKitchenStatusSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  kitchenStatus: z.enum(KITCHEN_STATUSES as [string, ...string[]]),
});

export type UpdateKitchenStatusInput = z.infer<typeof updateKitchenStatusSchema>;

export const updateBarOrderStatusSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  orderStatus: z.enum(ORDER_STATUSES as [string, ...string[]]),
});

export type UpdateBarOrderStatusInput = z.infer<typeof updateBarOrderStatusSchema>;
