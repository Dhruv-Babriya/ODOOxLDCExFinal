import { z } from 'zod';

export const paymentRecordSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID').optional().nullable(),
  bookingId: z.string().uuid('Invalid booking ID').optional().nullable(),
  shopOrderId: z.string().uuid('Invalid shop order ID').optional().nullable(),
  barOrderId: z.string().uuid('Invalid bar order ID').optional().nullable(),
  memberId: z.string().uuid('Invalid member ID').optional().nullable(),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'] as const),
  transactionReference: z.string().trim().optional(),
}).refine(
  (data) => data.invoiceId || data.bookingId || data.shopOrderId || data.barOrderId || data.memberId,
  {
    message: 'Payment must link to an invoice, booking, shop order, bar order, or member account',
    path: ['amount'],
  }
);

export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(2, 'Description required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
});

export const invoiceCreateSchema = z.object({
  memberId: z.string().uuid('Invalid member ID').optional().nullable(),
  recipientName: z.string().trim().min(2, 'Recipient name is required'),
  recipientEmail: z.string().trim().email('Invalid recipient email').optional().or(z.literal('')),
  recipientType: z.enum(['MEMBER', 'BUSINESS_CLIENT', 'WALK_IN'] as const).default('MEMBER'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
  taxAmount: z.coerce.number().min(0).default(0),
  items: z.array(invoiceItemSchema).min(1, 'Invoice must contain at least one line item'),
  notes: z.string().trim().optional(),
});

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
