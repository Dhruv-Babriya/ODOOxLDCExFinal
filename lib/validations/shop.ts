import { z } from 'zod';

export const productCreateSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional().nullable(),
  sku: z.string().trim().min(3, 'SKU must be at least 3 characters'),
  name: z.string().trim().min(2, 'Product name required'),
  description: z.string().trim().optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  initialStock: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  changeQuantity: z.coerce.number().int().refine((val) => val !== 0, 'Change quantity cannot be zero'),
  transactionType: z.enum([
    'PURCHASE_RECEIPT',
    'SALE_COUNTER',
    'SALE_ONLINE',
    'ADJUSTMENT',
    'RETURN',
  ] as const),
  notes: z.string().trim().optional(),
});

export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;

export const orderItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

export const shopOrderCreateSchema = z.object({
  memberId: z.string().uuid('Invalid member ID').optional().nullable(),
  orderChannel: z.enum(['COUNTER', 'ONLINE'] as const).default('COUNTER'),
  items: z.array(orderItemSchema).min(1, 'Order must contain at least one item'),
  notes: z.string().trim().optional(),
});

export type ShopOrderCreateInput = z.infer<typeof shopOrderCreateSchema>;
