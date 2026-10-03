import { z } from 'zod';
import {
  FULFILLMENT_TYPES,
  FULFILLMENT_STATUSES,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  INVENTORY_TRANSACTION_TYPES,
} from '@/types/shared';

export const productCategoryCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Category name must be at least 2 characters').max(100, 'Category name cannot exceed 100 characters'),
    description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
  })
  .strict();

export type ProductCategoryCreateInput = z.infer<typeof productCategoryCreateSchema>;

export const productCreateSchema = z
  .object({
    categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
    sku: z
      .string()
      .trim()
      .min(3, 'SKU must be at least 3 characters')
      .max(50, 'SKU cannot exceed 50 characters')
      .regex(/^[A-Za-z0-9_-]+$/, 'SKU must be alphanumeric with underscores or dashes')
      .toUpperCase(),
    name: z.string().trim().min(2, 'Product name required').max(150, 'Product name cannot exceed 150 characters'),
    description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
    price: z.coerce.number().min(0, 'Price cannot be negative').max(10000000, 'Price exceeds maximum allowed limit'),
    lowStockThreshold: z.coerce.number().int().min(0).max(100000).default(5),
    imageUrl: z.string().trim().max(2048, 'URL cannot exceed 2048 characters').url('Invalid image URL').optional().or(z.literal('')).nullable(),
    initialStock: z.coerce.number().int().min(0).max(1000000).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = z
  .object({
    id: z.string().uuid('Invalid product ID'),
    categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
    name: z.string().trim().min(2, 'Product name required').max(150, 'Product name cannot exceed 150 characters'),
    description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
    price: z.coerce.number().min(0, 'Price cannot be negative').max(10000000, 'Price exceeds maximum allowed limit'),
    lowStockThreshold: z.coerce.number().int().min(0).max(100000).default(5),
    imageUrl: z.string().trim().max(2048, 'URL cannot exceed 2048 characters').url('Invalid image URL').optional().or(z.literal('')).nullable(),
    isActive: z.boolean(),
  })
  .strict();

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productToggleActiveSchema = z
  .object({
    id: z.string().uuid('Invalid product ID'),
    isActive: z.boolean(),
  })
  .strict();

export type ProductToggleActiveInput = z.infer<typeof productToggleActiveSchema>;

export const inventoryAdjustmentSchema = z
  .object({
    productId: z.string().uuid('Invalid product ID'),
    changeQuantity: z
      .coerce
      .number()
      .int()
      .min(-1000000, 'Quantity cannot be lower than -1,000,000')
      .max(1000000, 'Quantity cannot exceed 1,000,000')
      .refine((val) => val !== 0, 'Change quantity cannot be zero'),
    transactionType: z.enum(INVENTORY_TRANSACTION_TYPES as [string, ...string[]]),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  })
  .strict();

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export const orderItemSchema = z
  .object({
    productId: z.string().uuid('Invalid product ID'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10000, 'Quantity cannot exceed 10000'),
  })
  .strict();

export type OrderItemInput = z.infer<typeof orderItemSchema>;

export const shopOrderCreateSchema = z
  .object({
    memberId: z.string().uuid('Invalid member ID').optional().nullable(),
    customerName: z.string().trim().max(100, 'Name cannot exceed 100 characters').optional().nullable(),
    customerPhone: z
      .string()
      .trim()
      .max(20, 'Phone cannot exceed 20 characters')
      .regex(/^[0-9+ -]{7,20}$/, 'Invalid phone number format')
      .optional()
      .or(z.literal(''))
      .nullable(),
    customerEmail: z.string().trim().max(255, 'Email cannot exceed 255 characters').email('Invalid email').optional().or(z.literal('')).nullable(),
    orderChannel: z.enum(ORDER_CHANNELS as [string, ...string[]]).default('COUNTER'),
    fulfillmentType: z.enum(FULFILLMENT_TYPES as [string, ...string[]]).default('PICKUP'),
    deliveryAddress: z.string().trim().max(500, 'Delivery address cannot exceed 500 characters').optional().nullable(),
    items: z.array(orderItemSchema).min(1, 'Order must contain at least one item').max(100, 'Order cannot exceed 100 distinct items'),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.fulfillmentType === 'DELIVERY' && (!data.deliveryAddress || data.deliveryAddress.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Delivery address is required when choosing Delivery option.',
      path: ['deliveryAddress'],
    }
  )
  .refine(
    (data) => {
      if (data.fulfillmentType === 'DELIVERY' && (!data.customerPhone || data.customerPhone.trim().length < 5)) {
        return false;
      }
      return true;
    },
    {
      message: 'A contact phone number is required for delivery orders.',
      path: ['customerPhone'],
    }
  );

export type ShopOrderCreateInput = z.infer<typeof shopOrderCreateSchema>;

export const cancelShopOrderSchema = z
  .object({
    orderId: z.string().uuid('Invalid order ID'),
    reason: z.string().trim().max(1000, 'Reason cannot exceed 1000 characters').optional().nullable(),
  })
  .strict();

export type CancelShopOrderInput = z.infer<typeof cancelShopOrderSchema>;

export const updateShopOrderStatusSchema = z
  .object({
    orderId: z.string().uuid('Invalid order ID'),
    status: z.enum(ORDER_STATUSES as [string, ...string[]]),
  })
  .strict();

export type UpdateShopOrderStatusInput = z.infer<typeof updateShopOrderStatusSchema>;

export const updateShopOrderFulfillmentStatusSchema = z
  .object({
    orderId: z.string().uuid('Invalid order ID'),
    fulfillmentStatus: z.enum(FULFILLMENT_STATUSES as [string, ...string[]]),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  })
  .strict();

export type UpdateShopOrderFulfillmentStatusInput = z.infer<typeof updateShopOrderFulfillmentStatusSchema>;

export const recordCommercePaymentSchema = z
  .object({
    orderId: z.string().uuid('Invalid order ID'),
    amount: z.coerce.number().positive('Amount must be positive').max(10000000, 'Amount cannot exceed 10,000,000'),
    paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER']).default('UPI'),
    transactionReference: z.string().trim().max(100, 'Transaction reference cannot exceed 100 characters').optional().nullable(),
  })
  .strict();

export type RecordCommercePaymentInput = z.infer<typeof recordCommercePaymentSchema>;

