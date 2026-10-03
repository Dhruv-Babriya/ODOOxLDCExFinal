'use server';

import { createClient } from '@/lib/supabase/server';
import { paymentRecordSchema, type PaymentRecordInput } from '@/lib/validations/payment';
import { handleActionError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth/session';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Server action to record a financial payment across bookings, shop orders, bar orders, or invoices
 */
export async function recordPaymentAction(
  input: PaymentRecordInput
): Promise<ActionResult<{ paymentId: string; paymentNumber: string }>> {
  try {
    const validated = paymentRecordSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    const paymentNumber = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

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

    // If linked to an invoice, update paid_amount on the invoice
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
