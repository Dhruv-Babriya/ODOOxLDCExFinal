import { z } from 'zod';
import {
  FULFILLMENT_TYPES,
  FULFILLMENT_STATUSES,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  INVENTORY_TRANSACTION_TYPES,
} from '@/types/shared';

export const productCategoryCreateSchema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters'),
  description: z.string().trim().optional().nullable(),
});

export type ProductCategoryCreateInput = z.infer<typeof productCategoryCreateSchema>;

export const productCreateSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  sku: z.string().trim().min(3, 'SKU must be at least 3 characters').toUpperCase(),
  name: z.string().trim().min(2, 'Product name required'),
  description: z.string().trim().optional().nullable(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')).nullable(),
  initialStock: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  name: z.string().trim().min(2, 'Product name required'),
  description: z.string().trim().optional().nullable(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')).nullable(),
  isActive: z.boolean(),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

export const productToggleActiveSchema = z.object({
  id: z.string().uuid('Invalid product ID'),
  isActive: z.boolean(),
});

export type ProductToggleActiveInput = z.infer<typeof productToggleActiveSchema>;

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  changeQuantity: z.coerce.number().int().refine((val) => val !== 0, 'Change quantity cannot be zero'),
  transactionType: z.enum(INVENTORY_TRANSACTION_TYPES as [string, ...string[]]),
  notes: z.string().trim().optional().nullable(),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

export const shopOrderCreateSchema = z
  .object({
    memberId: z.string().uuid('Invalid member ID').optional().nullable(),
    customerName: z.string().trim().optional().nullable(),
    customerPhone: z.string().trim().optional().nullable(),
    customerEmail: z.string().trim().email('Invalid email').optional().or(z.literal('')).nullable(),
    orderChannel: z.enum(ORDER_CHANNELS as [string, ...string[]]).default('COUNTER'),
    fulfillmentType: z.enum(FULFILLMENT_TYPES as [string, ...string[]]).default('PICKUP'),
    deliveryAddress: z.string().trim().optional().nullable(),
    items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
    notes: z.string().trim().optional().nullable(),
  })
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

export const cancelShopOrderSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  reason: z.string().trim().optional().nullable(),
});

export type CancelShopOrderInput = z.infer<typeof cancelShopOrderSchema>;

export const updateShopOrderStatusSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  status: z.enum(ORDER_STATUSES as [string, ...string[]]),
});

export type UpdateShopOrderStatusInput = z.infer<typeof updateShopOrderStatusSchema>;

export const updateShopOrderFulfillmentStatusSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  fulfillmentStatus: z.enum(FULFILLMENT_STATUSES as [string, ...string[]]),
  notes: z.string().trim().optional().nullable(),
});

export type UpdateShopOrderFulfillmentStatusInput = z.infer<typeof updateShopOrderFulfillmentStatusSchema>;

export const recordCommercePaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  amount: z.coerce.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER']).default('UPI'),
  transactionReference: z.string().trim().optional().nullable(),
});

export type RecordCommercePaymentInput = z.infer<typeof recordCommercePaymentSchema>;

