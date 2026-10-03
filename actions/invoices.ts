'use server';

import { createClient } from '@/lib/supabase/server';
import {
  invoiceCreateSchema,
  type InvoiceCreateInput,
} from '@/lib/validations/payment';
import { handleActionError } from '@/lib/errors';
import { requirePermission } from '@/lib/auth/session';
import type { ActionResult } from '@/types/shared';
import type { Database } from '@/types/database.types';
import { revalidatePath } from 'next/cache';

/**
 * Create a new invoice with line items.
 * Server-side computes subtotal and total to prevent frontend tampering.
 */
export async function createInvoiceAction(
  input: InvoiceCreateInput
): Promise<ActionResult<{ invoiceId: string; invoiceNumber: string }>> {
  try {
    const user = await requirePermission('invoices:manage');
    const validated = invoiceCreateSchema.parse(input);
    const supabase = await createClient();

    // Server-side calculation of subtotal — never trust frontend totals
    const computedSubtotal = validated.items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);
    const roundedSubtotal = Number(computedSubtotal.toFixed(2));
    const taxAmount = Number((validated.taxAmount || 0).toFixed(2));
    const totalAmount = Number((roundedSubtotal + taxAmount).toFixed(2));

    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        member_id: validated.memberId || null,
        recipient_name: validated.recipientName,
        recipient_email: validated.recipientEmail || null,
        recipient_type: validated.recipientType,
        subtotal: roundedSubtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: 0,
        status: 'ISSUED',
        due_date: validated.dueDate,
        notes: validated.notes || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (invoiceError) throw invoiceError;

    // Insert invoice items
    const itemRows = validated.items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: Number((item.quantity * item.unitPrice).toFixed(2)),
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemRows);

    if (itemsError) throw itemsError;

    revalidatePath('/dashboard/invoices');
    return {
      success: true,
      data: { invoiceId: invoice.id, invoiceNumber },
      message: 'Invoice created successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Update invoice status (e.g. VOID, mark OVERDUE)
 */
export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: string
): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    await requirePermission('invoices:manage');
    const supabase = await createClient();

    const { error } = await supabase
      .from('invoices')
      .update({ status: status as Database['public']['Enums']['app_invoice_status'] })
      .eq('id', invoiceId);

    if (error) throw error;

    revalidatePath('/dashboard/invoices');
    return { success: true, data: { invoiceId }, message: `Invoice status updated to ${status}.` };
  } catch (err) {
    return handleActionError(err);
  }
}
