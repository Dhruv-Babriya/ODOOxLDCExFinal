'use server';

import { createClient } from '@/lib/supabase/server';
import {
  publicEnquirySchema,
  quoteCreateSchema,
  type PublicEnquiryInput,
  type QuoteCreateInput,
} from '@/lib/validations/enquiry';
import { handleActionError } from '@/lib/errors';
import { requirePermission } from '@/lib/auth/session';
import type { ActionResult } from '@/types/shared';
import type { Database } from '@/types/database.types';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Public Enquiry Submission (no auth required)
// ---------------------------------------------------------------------------

/**
 * Submit a public enquiry/trial request.
 * This is accessible by unauthenticated visitors via the public website.
 * Server-side validation protects against abuse.
 */
export async function submitPublicEnquiryAction(
  input: PublicEnquiryInput
): Promise<ActionResult<{ enquiryId: string }>> {
  try {
    const validated = publicEnquirySchema.parse(input);
    const supabase = await createClient();

    const { data: enquiry, error } = await supabase
      .from('enquiries')
      .insert({
        full_name: validated.fullName,
        email: validated.email,
        phone: validated.phone,
        interested_sport: (validated.interestedSport as Database['public']['Enums']['app_sport_type']) || null,
        interested_plan_id: validated.interestedPlanId || null,
        requested_trial_date: validated.requestedTrialDate || null,
        message: validated.message || null,
        status: 'NEW',
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      success: true,
      data: { enquiryId: enquiry.id },
      message: 'Your enquiry has been submitted. A club advisor will contact you shortly.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Staff Enquiry Management (requires auth)
// ---------------------------------------------------------------------------

/**
 * Update enquiry status in the pipeline
 */
export async function updateEnquiryStatusAction(
  enquiryId: string,
  status: string,
  assignedTo?: string
): Promise<ActionResult<{ enquiryId: string }>> {
  try {
    await requirePermission('enquiries:manage');
    const supabase = await createClient();

    const updateData: {
      status: Database['public']['Enums']['app_enquiry_status'];
      assigned_to?: string;
    } = {
      status: status as Database['public']['Enums']['app_enquiry_status'],
    };
    if (assignedTo) updateData.assigned_to = assignedTo;

    const { error } = await supabase
      .from('enquiries')
      .update(updateData)
      .eq('id', enquiryId);

    if (error) throw error;

    revalidatePath('/dashboard/enquiries');
    return { success: true, data: { enquiryId }, message: `Enquiry status updated to ${status}.` };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

/**
 * Create a quote, optionally linked to an enquiry
 */
export async function createQuoteAction(
  input: QuoteCreateInput
): Promise<ActionResult<{ quoteId: string; quoteNumber: string }>> {
  try {
    const user = await requirePermission('quotes:manage');
    const validated = quoteCreateSchema.parse(input);
    const supabase = await createClient();

    const quoteNumber = `QT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        quote_number: quoteNumber,
        enquiry_id: validated.enquiryId || null,
        recipient_name: validated.recipientName,
        recipient_email: validated.recipientEmail,
        membership_plan_id: validated.membershipPlanId || null,
        quoted_amount: validated.quotedAmount,
        valid_until: validated.validUntil,
        status: (validated.status as Database['public']['Enums']['app_quote_status']) || 'DRAFT',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error) throw error;

    // If linked to an enquiry, update its status to QUOTE_SENT
    if (validated.enquiryId) {
      await supabase
        .from('enquiries')
        .update({ status: 'QUOTE_SENT' })
        .eq('id', validated.enquiryId);
    }

    revalidatePath('/dashboard/enquiries');
    return {
      success: true,
      data: { quoteId: quote.id, quoteNumber },
      message: 'Quote created successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Update quote status
 */
export async function updateQuoteStatusAction(
  quoteId: string,
  status: string
): Promise<ActionResult<{ quoteId: string }>> {
  try {
    await requirePermission('quotes:manage');
    const supabase = await createClient();

    const { error } = await supabase
      .from('quotes')
      .update({ status: status as Database['public']['Enums']['app_quote_status'] })
      .eq('id', quoteId);

    if (error) throw error;

    revalidatePath('/dashboard/enquiries');
    return { success: true, data: { quoteId }, message: `Quote status updated to ${status}.` };
  } catch (err) {
    return handleActionError(err);
  }
}
