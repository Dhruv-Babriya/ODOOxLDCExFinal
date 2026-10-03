'use server';

import { createClient } from '@/lib/supabase/server';
import { paymentRecordSchema, type PaymentRecordInput } from '@/lib/validations/payment';
import { handleActionError } from '@/lib/errors';
import { requirePermission } from '@/lib/auth/session';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Server action to record a financial payment across bookings, shop orders, bar orders, or invoices.
 * 
 * Security:
 * - Server-side Zod validation (never trust frontend amounts)
 * - Permission check (payments:create)
 * - Duplicate payment prevention via unique payment_number
 * - Reference validation against existing records
 * - Amount validation (positive, capped at outstanding balance for invoices)
 */
export async function recordPaymentAction(
  input: PaymentRecordInput
): Promise<ActionResult<{ paymentId: string; paymentNumber: string }>> {
  try {
    const validated = paymentRecordSchema.parse(input);
    const user = await requirePermission('payments:create');
    const supabase = await createClient();

    // If payment is linked to an invoice, validate the invoice exists and check overpayment
    if (validated.invoiceId) {
      const { data: invoice, error: invCheckError } = await supabase
        .from('invoices')
        .select('id, total_amount, paid_amount, status')
        .eq('id', validated.invoiceId)
        .single();

      if (invCheckError || !invoice) {
        return {
          success: false,
          error: 'Referenced invoice not found.',
          code: 'INVALID_REFERENCE',
        };
      }

      if (invoice.status === 'VOID') {
        return {
          success: false,
          error: 'Cannot record payment against a voided invoice.',
          code: 'INVALID_REFERENCE',
        };
      }

      if (invoice.status === 'PAID') {
        return {
          success: false,
          error: 'This invoice has already been fully paid.',
          code: 'DUPLICATE_PAYMENT',
        };
      }

      const outstanding = Number(invoice.total_amount) - Number(invoice.paid_amount);
      if (validated.amount > outstanding + 0.01) {
        return {
          success: false,
          error: `Payment amount (₹${validated.amount}) exceeds outstanding balance (₹${outstanding.toFixed(2)}).`,
          code: 'OVERPAYMENT',
        };
      }
    }

    // Validate booking reference if provided
    if (validated.bookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('court_bookings')
        .select('id, status, final_price')
        .eq('id', validated.bookingId)
        .single();

      if (bookingError || !booking) {
        return {
          success: false,
          error: 'Referenced booking not found.',
          code: 'INVALID_REFERENCE',
        };
      }

      const { data: existingPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('booking_id', validated.bookingId)
        .neq('status', 'FAILED');
      
      const paidSoFar = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      if (paidSoFar + validated.amount > Number(booking.final_price) + 0.01) {
        return {
          success: false,
          error: `Payment amount (₹${validated.amount}) exceeds outstanding balance (₹${(Number(booking.final_price) - paidSoFar).toFixed(2)}).`,
          code: 'OVERPAYMENT',
        };
      }
    }

    // Validate shop order reference if provided
    if (validated.shopOrderId) {
      const { data: order, error: orderError } = await supabase
        .from('shop_orders')
        .select('id, total_amount')
        .eq('id', validated.shopOrderId)
        .single();

      if (orderError || !order) {
        return {
          success: false,
          error: 'Referenced shop order not found.',
          code: 'INVALID_REFERENCE',
        };
      }

      const { data: existingPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('shop_order_id', validated.shopOrderId)
        .neq('status', 'FAILED');
      
      const paidSoFar = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      if (paidSoFar + validated.amount > Number(order.total_amount) + 0.01) {
        return {
          success: false,
          error: `Payment amount (₹${validated.amount}) exceeds outstanding balance (₹${(Number(order.total_amount) - paidSoFar).toFixed(2)}).`,
          code: 'OVERPAYMENT',
        };
      }
    }

    // Validate bar order reference if provided
    if (validated.barOrderId) {
      const { data: barOrder, error: barOrderError } = await supabase
        .from('bar_orders')
        .select('id, total_amount')
        .eq('id', validated.barOrderId)
        .single();

      if (barOrderError || !barOrder) {
        return {
          success: false,
          error: 'Referenced bar order not found.',
          code: 'INVALID_REFERENCE',
        };
      }

      const { data: existingPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('bar_order_id', validated.barOrderId)
        .neq('status', 'FAILED');
      
      const paidSoFar = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      if (paidSoFar + validated.amount > Number(barOrder.total_amount) + 0.01) {
        return {
          success: false,
          error: `Payment amount (₹${validated.amount}) exceeds outstanding balance (₹${(Number(barOrder.total_amount) - paidSoFar).toFixed(2)}).`,
          code: 'OVERPAYMENT',
        };
      }
    }

    // Generate unique payment number
    const paymentNumber = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // Insert payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_number: paymentNumber,
        invoice_id: validated.invoiceId || null,
        booking_id: validated.bookingId || null,
        shop_order_id: validated.shopOrderId || null,
        bar_order_id: validated.barOrderId || null,
        member_id: validated.memberId || null,
        amount: validated.amount,
        payment_method: validated.paymentMethod,
        status: 'COMPLETED',
        transaction_reference: validated.transactionReference || null,
        recorded_by: user.id,
      })
      .select('id')
      .single();

    if (paymentError) throw paymentError;

    // If linked to an invoice, update paid_amount and status on the invoice
    if (validated.invoiceId) {
      const { data: inv } = await supabase
        .from('invoices')
        .select('total_amount, paid_amount')
        .eq('id', validated.invoiceId)
        .single();

      if (inv) {
        const newPaid = Number(inv.paid_amount) + validated.amount;
        const total = Number(inv.total_amount);
        const newStatus = newPaid >= total ? 'PAID' : 'PARTIALLY_PAID';

        await supabase
          .from('invoices')
          .update({
            paid_amount: newPaid,
            status: newStatus,
          })
          .eq('id', validated.invoiceId);
      }
    }

    revalidatePath('/dashboard/payments');
    revalidatePath('/dashboard/invoices');

    return {
      success: true,
      data: { paymentId: payment.id, paymentNumber },
      message: 'Payment recorded successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}
