import { z } from 'zod';
import { uuidSchema } from './common';

export const paymentRecordSchema = z
  .object({
    invoiceId: uuidSchema('Invalid invoice ID').optional().nullable(),
    bookingId: uuidSchema('Invalid booking ID').optional().nullable(),
    shopOrderId: uuidSchema('Invalid shop order ID').optional().nullable(),
    barOrderId: uuidSchema('Invalid bar order ID').optional().nullable(),
    memberId: uuidSchema('Invalid member ID').optional().nullable(),
    amount: z.coerce.number().positive('Payment amount must be greater than zero').max(10000000, 'Payment amount cannot exceed 10,000,000'),
    paymentMethod: z.enum(['CASH', 'CARD', 'UPI', 'BANK_TRANSFER'] as const),
    transactionReference: z.string().trim().max(100, 'Transaction reference cannot exceed 100 characters').optional().nullable(),
  })
  .strict()
  .refine(
    (data) => data.invoiceId || data.bookingId || data.shopOrderId || data.barOrderId || data.memberId,
    {
      message: 'Payment must link to an invoice, booking, shop order, bar order, or member account',
      path: ['amount'],
    }
  );

export type PaymentRecordInput = z.infer<typeof paymentRecordSchema>;

export const invoiceItemSchema = z
  .object({
    description: z.string().trim().min(2, 'Description required').max(200, 'Description cannot exceed 200 characters'),
    quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(10000, 'Quantity cannot exceed 10,000').default(1),
    unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative').max(1000000, 'Unit price cannot exceed 1,000,000'),
  })
  .strict();

export const invoiceCreateSchema = z
  .object({
    memberId: uuidSchema('Invalid member ID').optional().nullable(),
    recipientName: z.string().trim().min(2, 'Recipient name is required').max(100, 'Recipient name cannot exceed 100 characters'),
    recipientEmail: z.string().trim().max(255, 'Email cannot exceed 255 characters').email('Invalid recipient email').optional().or(z.literal('')).nullable(),
    recipientType: z.enum(['MEMBER', 'BUSINESS_CLIENT', 'WALK_IN'] as const).default('MEMBER'),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be YYYY-MM-DD'),
    taxAmount: z.coerce.number().min(0, 'Tax amount cannot be negative').max(1000000, 'Tax amount cannot exceed 1,000,000').default(0),
    items: z.array(invoiceItemSchema).min(1, 'Invoice must contain at least one line item').max(100, 'Invoice cannot exceed 100 line items'),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  })
  .strict();

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
