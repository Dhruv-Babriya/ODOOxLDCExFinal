'use server';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import {
  memberCreateSchema,
  memberRegisterSchema,
  memberUpdateSchema,
  memberRenewalSchema,
  memberStatusUpdateSchema,
  type MemberCreateInput,
  type MemberRegisterInput,
  type MemberUpdateInput,
  type MemberRenewalInput,
  type MemberStatusUpdateInput,
} from '@/lib/validations/member';
import { handleActionError } from '@/lib/errors';
import { requirePermission, requireAuth } from '@/lib/auth/session';
import {
  calculateMembershipExpiryStatus,
  type ActionResult,
  type MemberWithDetails,
  type MembershipHistoryItem,
  type MemberPortalData,
  type SportType,
  type NotificationItem,
} from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Server action to register a new member with full profile details, financial invoice, and notifications
 */
export async function registerMemberAction(
  input: MemberRegisterInput
): Promise<ActionResult<{ memberId: string; membershipNumber: string }>> {
  try {
    const user = await requirePermission('members:manage');
    const validated = memberRegisterSchema.parse(input);
    const supabase = await createClient();

    // 1. Fetch Plan details for pricing and financial integration
    const { data: plan, error: planError } = await supabase
      .from('membership_plans')
      .select('id, name, price, duration_days')
      .eq('id', validated.planId)
      .single();

    if (planError || !plan) {
      throw new Error('Selected membership plan was not found.');
    }

    // 2. Check if profile already exists by email or create new profile
    let profileId: string;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', validated.email)
      .maybeSingle();

    if (existingProfile) {
      profileId = existingProfile.id;

      // Update phone or name if provided
      await supabase
        .from('profiles')
        .update({
          full_name: validated.fullName,
          phone: validated.phone || null,
        })
        .eq('id', profileId);
    } else {
      // Create new profile record with auto-generated UUID
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          email: validated.email,
          full_name: validated.fullName,
          phone: validated.phone || null,
          role: 'MEMBER',
          is_active: true,
        })
        .select('id')
        .single();

      if (profileError || !newProfile) {
        throw new Error(profileError?.message || 'Failed to create member user profile');
      }
      profileId = newProfile.id;
    }

    // 3. Verify profile does not already have an active member record
    const { data: existingMember } = await supabase
      .from('members')
      .select('id, membership_number')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (existingMember) {
      return {
        success: false,
        error: `This profile is already registered as member #${existingMember.membership_number}`,
        code: 'MEMBER_EXISTS',
      };
    }

    // 4. Insert member record
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        profile_id: profileId,
        membership_number: validated.membershipNumber,
        current_plan_id: validated.planId,
        status: 'ACTIVE',
        start_date: validated.startDate,
        end_date: validated.endDate,
        emergency_contact: validated.emergencyContact || null,
        notes: validated.notes || null,
      })
      .select('id')
      .single();

    if (memberError || !member) {
      throw memberError || new Error('Failed to create member record');
    }

    // 5. Record initial entry in membership_history
    await supabase.from('membership_history').insert({
      member_id: member.id,
      plan_id: validated.planId,
      start_date: validated.startDate,
      end_date: validated.endDate,
      status: 'ACTIVE',
      changed_by: user.id,
      notes: validated.notes ? `Initial registration: ${validated.notes}` : 'Initial registration',
    });

    // 6. Cross-Module Financial Integration: Generate Registration Invoice & Payment (Developer 4)
    const isPaid = validated.paymentMethod && validated.paymentMethod !== 'UNPAID';
    const planPrice = Number(plan.price);
    const invoiceNumber = `INV-REG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const { data: invoice } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        member_id: member.id,
        recipient_name: validated.fullName,
        recipient_email: validated.email,
        recipient_type: 'MEMBER',
        subtotal: planPrice,
        tax_amount: 0,
        total_amount: planPrice,
        paid_amount: isPaid ? planPrice : 0,
        status: isPaid ? 'PAID' : 'ISSUED',
        due_date: validated.startDate,
        notes: `Initial registration fee for ${plan.name}`,
        created_by: user.id,
      })
      .select('id')
      .maybeSingle();

    if (invoice) {
      await supabase.from('invoice_items').insert({
        invoice_id: invoice.id,
        description: `Initial Membership: ${plan.name} (${validated.startDate} to ${validated.endDate})`,
        quantity: 1,
        unit_price: planPrice,
        total_price: planPrice,
      });

      if (isPaid && validated.paymentMethod !== 'UNPAID') {
        const paymentNumber = `PAY-REG-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        await supabase.from('payments').insert({
          payment_number: paymentNumber,
          amount: planPrice,
          payment_method: validated.paymentMethod as Database['public']['Enums']['app_payment_method'],
          status: 'COMPLETED',
          transaction_reference: validated.paymentReference || null,
          member_id: member.id,
          invoice_id: invoice.id,
          recorded_by: user.id,
        });
      }
    }

    // 7. Notification Integration: Welcome in-app notification
    await supabase.from('notifications').insert({
      user_id: profileId,
      title: 'Welcome to The Champions Club!',
      message: `Your ${plan.name} membership (#${validated.membershipNumber}) is active until ${validated.endDate}. Enjoy your court discounts and club privileges!`,
      type: 'SUCCESS',
      link: '/dashboard/portal',
      is_read: false,
    });

    revalidatePath('/dashboard/members');
    revalidatePath('/dashboard/membership-plans');
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/payments');

    return {
      success: true,
      data: { memberId: member.id, membershipNumber: validated.membershipNumber },
      message: `Member #${validated.membershipNumber} registered successfully. Invoice & notification generated.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to register a member linking directly to an existing profile UUID
 */
export async function createMemberAction(
  input: MemberCreateInput
): Promise<ActionResult<{ memberId: string }>> {
  try {
    const user = await requirePermission('members:manage');
    const validated = memberCreateSchema.parse(input);
    const supabase = await createClient();

    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        profile_id: validated.profileId,
        membership_number: validated.membershipNumber,
        current_plan_id: validated.currentPlanId,
        status: validated.status,
        start_date: validated.startDate,
        end_date: validated.endDate,
        emergency_contact: validated.emergencyContact || null,
        notes: validated.notes || null,
      })
      .select('id')
      .single();

    if (memberError || !member) {
      throw memberError || new Error('Failed to create member record');
    }

    await supabase.from('membership_history').insert({
      member_id: member.id,
      plan_id: validated.currentPlanId,
      start_date: validated.startDate,
      end_date: validated.endDate,
      status: validated.status,
      changed_by: user.id,
      notes: 'Initial registration',
    });

    revalidatePath('/dashboard/members');

    return {
      success: true,
      data: { memberId: member.id },
      message: 'Member registered successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to fetch members with search query, status, and tier filters
 */
export async function getMembersAction(params?: {
  query?: string;
  status?: string;
  tier?: string;
}): Promise<ActionResult<MemberWithDetails[]>> {
  try {
    await requirePermission('members:read');
    const supabase = await createClient();

    let queryBuilder = supabase
      .from('members')
      .select(`
        id,
        profile_id,
        membership_number,
        current_plan_id,
        status,
        start_date,
        end_date,
        emergency_contact,
        notes,
        created_at,
        updated_at,
        profiles (
          id,
          email,
          full_name,
          phone,
          role,
          avatar_url,
          is_active
        ),
        membership_plans (
          id,
          name,
          tier,
          description,
          duration_days,
          price,
          court_discount_percent,
          shop_discount_percent,
          bar_discount_percent,
          free_court_hours_per_day,
          max_daily_bookings,
          is_active
        )
      `)
      .order('created_at', { ascending: false });

    if (params?.status && params.status !== 'ALL') {
      queryBuilder = queryBuilder.eq('status', params.status as Database['public']['Enums']['app_membership_status']);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    let items = (data || []).map((raw) => {
      const m = raw as unknown as MemberWithDetails;
      const expiry = calculateMembershipExpiryStatus(m.status, m.end_date);
      return {
        ...m,
        derived_status: expiry.derivedStatus,
        days_remaining: expiry.daysRemaining,
      };
    });

    // Client-side search and tier filtering
    if (params?.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      items = items.filter(
        (m) =>
          m.membership_number.toLowerCase().includes(q) ||
          m.profiles?.full_name?.toLowerCase().includes(q) ||
          m.profiles?.email?.toLowerCase().includes(q) ||
          m.profiles?.phone?.toLowerCase().includes(q)
      );
    }

    if (params?.tier && params.tier !== 'ALL') {
      items = items.filter((m) => m.membership_plans?.tier === params.tier);
    }

    return {
      success: true,
      data: items,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to fetch a member's complete details including membership history
 */
export async function getMemberDetailsAction(memberId: string): Promise<
  ActionResult<{
    member: MemberWithDetails;
    history: MembershipHistoryItem[];
  }>
> {
  try {
    await requirePermission('members:read');
    const supabase = await createClient();

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(`
        id,
        profile_id,
        membership_number,
        current_plan_id,
        status,
        start_date,
        end_date,
        emergency_contact,
        notes,
        created_at,
        updated_at,
        profiles (
          id,
          email,
          full_name,
          phone,
          role,
          avatar_url,
          is_active
        ),
        membership_plans (
          id,
          name,
          tier,
          description,
          duration_days,
          price,
          court_discount_percent,
          shop_discount_percent,
          bar_discount_percent,
          free_court_hours_per_day,
          max_daily_bookings,
          is_active
        )
      `)
      .eq('id', memberId)
      .single();

    if (memberError || !memberData) {
      return {
        success: false,
        error: 'Member not found',
        code: 'NOT_FOUND',
      };
    }

    const expiry = calculateMembershipExpiryStatus(memberData.status, memberData.end_date);
    const member = {
      ...memberData,
      derived_status: expiry.derivedStatus,
      days_remaining: expiry.daysRemaining,
    } as unknown as MemberWithDetails;

    // Fetch history
    const { data: historyData, error: historyError } = await supabase
      .from('membership_history')
      .select(`
        id,
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        changed_by,
        notes,
        created_at,
        membership_plans (
          name,
          tier,
          price
        ),
        profiles:changed_by (
          full_name,
          email
        )
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.warn('Could not fetch membership history:', historyError);
    }

    return {
      success: true,
      data: {
        member,
        history: (historyData as unknown as MembershipHistoryItem[]) || [],
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to update member contact info, emergency contact, or notes
 */
export async function updateMemberAction(
  input: MemberUpdateInput
): Promise<ActionResult<{ memberId: string }>> {
  try {
    await requirePermission('members:manage');
    const validated = memberUpdateSchema.parse(input);
    const supabase = await createClient();

    // 1. Fetch member to obtain linked profile_id
    const { data: existing, error: findError } = await supabase
      .from('members')
      .select('profile_id, status')
      .eq('id', validated.id)
      .single();

    if (findError || !existing) {
      return { success: false, error: 'Member not found', code: 'NOT_FOUND' };
    }

    // 2. Update member table
    const memberUpdates: Database['public']['Tables']['members']['Update'] = {};
    if (validated.emergencyContact !== undefined) memberUpdates.emergency_contact = validated.emergencyContact || null;
    if (validated.notes !== undefined) memberUpdates.notes = validated.notes || null;
    if (validated.status !== undefined) memberUpdates.status = validated.status;

    if (Object.keys(memberUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('members')
        .update(memberUpdates)
        .eq('id', validated.id);

      if (updateError) throw updateError;
    }

    // 3. Update profile table if name/phone provided
    const profileUpdates: Database['public']['Tables']['profiles']['Update'] = {};
    if (validated.fullName) profileUpdates.full_name = validated.fullName;
    if (validated.phone !== undefined) profileUpdates.phone = validated.phone || null;

    if (Object.keys(profileUpdates).length > 0 && existing.profile_id) {
      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', existing.profile_id);
    }

    revalidatePath('/dashboard/members');
    revalidatePath(`/dashboard/members/${validated.id}`);

    return {
      success: true,
      data: { memberId: validated.id },
      message: 'Member details updated successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to renew or change a member's membership plan with full financial integration & notifications
 * Preserves audit trail in membership_history
 */
export async function renewMembershipAction(
  input: MemberRenewalInput
): Promise<ActionResult<{ memberId: string; invoiceNumber?: string }>> {
  try {
    const user = await requirePermission('members:manage');
    const validated = memberRenewalSchema.parse(input);
    const supabase = await createClient();

    // 1. Fetch current member and new plan details
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, profile_id, current_plan_id, status, end_date, profiles(full_name, email)')
      .eq('id', validated.memberId)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Member record not found', code: 'NOT_FOUND' };
    }

    const { data: newPlan, error: planError } = await supabase
      .from('membership_plans')
      .select('id, name, price, duration_days')
      .eq('id', validated.planId)
      .single();

    if (planError || !newPlan) {
      return { success: false, error: 'Selected membership plan not found', code: 'NOT_FOUND' };
    }

    // 2. Update member plan and validity dates
    const { error: updateError } = await supabase
      .from('members')
      .update({
        current_plan_id: validated.planId,
        start_date: validated.startDate,
        end_date: validated.endDate,
        status: 'ACTIVE',
      })
      .eq('id', validated.memberId);

    if (updateError) throw updateError;

    // 3. Insert audit entry in membership_history
    const isPlanChange = member.current_plan_id !== validated.planId;
    const historyNote = validated.notes
      ? `${isPlanChange ? 'Plan upgraded/changed' : 'Membership renewed'}: ${validated.notes}`
      : isPlanChange
      ? 'Membership plan changed'
      : 'Membership renewed for another term';

    await supabase.from('membership_history').insert({
      member_id: validated.memberId,
      plan_id: validated.planId,
      start_date: validated.startDate,
      end_date: validated.endDate,
      status: 'ACTIVE',
      changed_by: user.id,
      notes: historyNote,
    });

    // 4. Financial Integration: Create Invoice and optional Payment (Developer 4 contract)
    const isPaid = validated.paymentMethod && validated.paymentMethod !== 'UNPAID';
    const planPrice = Number(newPlan.price);
    const invoiceNumber = `INV-REN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        const profile = member.profiles as { full_name?: string | null; email?: string | null } | null;

        const { data: invoice } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            member_id: member.id,
            recipient_name: profile?.full_name || 'Club Member',
            recipient_email: profile?.email || null,
            recipient_type: 'MEMBER',
        subtotal: planPrice,
        tax_amount: 0,
        total_amount: planPrice,
        paid_amount: isPaid ? planPrice : 0,
        status: isPaid ? 'PAID' : 'ISSUED',
        due_date: validated.startDate,
        notes: `${isPlanChange ? 'Plan Upgrade' : 'Membership Renewal'} to ${newPlan.name}`,
        created_by: user.id,
      })
      .select('id')
      .maybeSingle();

    if (invoice) {
      await supabase.from('invoice_items').insert({
        invoice_id: invoice.id,
        description: `Membership Term: ${newPlan.name} (${validated.startDate} to ${validated.endDate})`,
        quantity: 1,
        unit_price: planPrice,
        total_price: planPrice,
      });

      if (isPaid && validated.paymentMethod !== 'UNPAID') {
        const paymentNumber = `PAY-REN-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        await supabase.from('payments').insert({
          payment_number: paymentNumber,
          amount: planPrice,
          payment_method: validated.paymentMethod as Database['public']['Enums']['app_payment_method'],
          status: 'COMPLETED',
          transaction_reference: validated.paymentReference || null,
          member_id: member.id,
          invoice_id: invoice.id,
          recorded_by: user.id,
        });
      }
    }

    // 5. Notification Integration: In-app renewal confirmation
    await supabase.from('notifications').insert({
      user_id: member.profile_id,
      title: 'Membership Renewed Successfully',
      message: `Your ${newPlan.name} is confirmed and active until ${validated.endDate}. Court & club perks renewed.`,
      type: 'SUCCESS',
      link: '/dashboard/portal',
      is_read: false,
    });

    revalidatePath('/dashboard/members');
    revalidatePath(`/dashboard/members/${validated.memberId}`);
    revalidatePath('/dashboard/invoices');
    revalidatePath('/dashboard/payments');

    return {
      success: true,
      data: { memberId: validated.memberId, invoiceNumber },
      message: isPlanChange
        ? `Membership upgraded to ${newPlan.name}. Invoice #${invoiceNumber} recorded.`
        : `Membership renewed successfully. Invoice #${invoiceNumber} recorded.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to update member lifecycle status (e.g. SUSPEND, CANCEL, REACTIVATE)
 * Automatically logs status transition into membership_history and generates notification
 */
export async function updateMemberStatusAction(
  input: MemberStatusUpdateInput
): Promise<ActionResult<{ memberId: string; status: string }>> {
  try {
    const user = await requirePermission('members:manage');
    const validated = memberStatusUpdateSchema.parse(input);
    const supabase = await createClient();

    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('id, profile_id, current_plan_id, start_date, end_date, status')
      .eq('id', validated.memberId)
      .single();

    if (fetchError || !member) {
      return { success: false, error: 'Member not found', code: 'NOT_FOUND' };
    }

    const { error: updateError } = await supabase
      .from('members')
      .update({ status: validated.status })
      .eq('id', validated.memberId);

    if (updateError) throw updateError;

    // Record transition in history
    if (member.current_plan_id) {
      await supabase.from('membership_history').insert({
        member_id: validated.memberId,
        plan_id: member.current_plan_id,
        start_date: member.start_date,
        end_date: member.end_date,
        status: validated.status,
        changed_by: user.id,
        notes: validated.notes || `Status transition from ${member.status} to ${validated.status}`,
      });
    }

    // In-app notification for member
    const notifType = validated.status === 'ACTIVE' ? 'SUCCESS' : 'WARNING';
    await supabase.from('notifications').insert({
      user_id: member.profile_id,
      title: `Account Status Update: ${validated.status}`,
      message: `Your sports club account status is now ${validated.status}.${validated.notes ? ` Reason: ${validated.notes}` : ''}`,
      type: notifType,
      link: '/dashboard/portal',
      is_read: false,
    });

    revalidatePath('/dashboard/members');
    revalidatePath(`/dashboard/members/${validated.memberId}`);

    return {
      success: true,
      data: { memberId: validated.memberId, status: validated.status },
      message: `Member status updated to ${validated.status}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to automatically check and process membership expiries
 * 1. Derives expired memberships (end_date < today) and updates DB status to EXPIRED with audit log.
 * 2. Emits in-app warnings for expiring soon memberships (<= 30 days remaining).
 */
export async function checkAndProcessMembershipExpiriesAction(): Promise<
  ActionResult<{ expiredCount: number; warningCount: number }>
> {
  try {
    const user = await requirePermission('members:manage');
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Identify members whose term has elapsed but status is still ACTIVE
    const { data: expiredMembers } = await supabase
      .from('members')
      .select('id, profile_id, current_plan_id, start_date, end_date, status, membership_number')
      .eq('status', 'ACTIVE')
      .lt('end_date', today);

    let expiredCount = 0;
    for (const m of expiredMembers || []) {
      // Update member status to EXPIRED
      await supabase
        .from('members')
        .update({ status: 'EXPIRED' })
        .eq('id', m.id);

      // Log transition to membership_history
      if (m.current_plan_id) {
        await supabase.from('membership_history').insert({
          member_id: m.id,
          plan_id: m.current_plan_id,
          start_date: m.start_date,
          end_date: m.end_date,
          status: 'EXPIRED',
          changed_by: user.id,
          notes: `Automated expiry check: Plan elapsed on ${m.end_date}`,
        });
      }

      // Notify member
      await supabase.from('notifications').insert({
        user_id: m.profile_id,
        title: 'Membership Expired',
        message: `Your membership (#${m.membership_number}) expired on ${m.end_date}. Please renew at the front desk or member portal to restore court booking perks.`,
        type: 'EXPIRY',
        link: '/dashboard/portal',
        is_read: false,
      });

      expiredCount++;
    }

    // 2. Identify active members expiring within the next 30 days
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];

    const { data: expiringMembers } = await supabase
      .from('members')
      .select('id, profile_id, end_date, membership_number')
      .eq('status', 'ACTIVE')
      .gte('end_date', today)
      .lte('end_date', nextMonthStr);

    let warningCount = 0;
    for (const m of expiringMembers || []) {
      // Check if notification already sent in last 7 days to prevent duplicate spam
      const { data: recentNotif } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', m.profile_id)
        .eq('type', 'EXPIRY')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!recentNotif) {
        const daysLeft = Math.ceil(
          (new Date(m.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        await supabase.from('notifications').insert({
          user_id: m.profile_id,
          title: 'Membership Expiring Soon',
          message: `Your membership (#${m.membership_number}) will expire in ${daysLeft} days (on ${m.end_date}). Renew early to avoid interruption.`,
          type: 'EXPIRY',
          link: '/dashboard/portal',
          is_read: false,
        });

        warningCount++;
      }
    }

    revalidatePath('/dashboard/members');
    revalidatePath('/dashboard/portal');

    return {
      success: true,
      data: { expiredCount, warningCount },
      message: `Scan complete: ${expiredCount} membership(s) marked expired, ${warningCount} renewal warning(s) issued.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to fetch comprehensive data for the Member Portal
 * Aggregates member profile, benefits, upcoming/past bookings (Dev 2), shop/bar orders (Dev 3),
 * invoices/payments (Dev 4), and notifications.
 * Strict isolation: authenticated user can ONLY access their own member records.
 */
export async function getMemberPortalDataAction(): Promise<ActionResult<MemberPortalData | null>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // 1. Fetch member linked to authenticated user's profile
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(`
        id,
        profile_id,
        membership_number,
        current_plan_id,
        status,
        start_date,
        end_date,
        emergency_contact,
        notes,
        created_at,
        updated_at,
        profiles (
          id,
          email,
          full_name,
          phone,
          role,
          avatar_url,
          is_active
        ),
        membership_plans (
          id,
          name,
          tier,
          description,
          duration_days,
          price,
          court_discount_percent,
          shop_discount_percent,
          bar_discount_percent,
          free_court_hours_per_day,
          max_daily_bookings,
          is_active
        )
      `)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (memberError || !memberData) {
      return {
        success: true,
        data: null,
      };
    }

    const expiry = calculateMembershipExpiryStatus(memberData.status, memberData.end_date);
    const member = {
      ...memberData,
      derived_status: expiry.derivedStatus,
      days_remaining: expiry.daysRemaining,
    } as unknown as MemberWithDetails;

    const nowIso = new Date().toISOString();

    // 2. Cross-Module: Fetch Court Bookings (Developer 2)
    const { data: bookingsData } = await supabase
      .from('court_bookings')
      .select(`
        id,
        court_id,
        start_time,
        end_time,
        booking_type,
        status,
        total_price,
        notes,
        courts (
          name,
          sport_type,
          is_indoor
        )
      `)
      .eq('member_id', member.id)
      .order('start_time', { ascending: false });

    const upcomingBookings: MemberPortalData['upcomingBookings'] = [];
    const pastBookings: MemberPortalData['pastBookings'] = [];

    type BookingItemType = {
      id: string;
      court_id: string;
      start_time: string;
      end_time: string;
      booking_type: string;
      status: string;
      total_price: number | null;
      notes: string | null;
      courts: {
        name: string;
        sport_type: SportType;
        is_indoor: boolean;
      } | null;
    };

    for (const b of (bookingsData || []) as unknown as BookingItemType[]) {
      const isUpcoming = b.start_time >= nowIso && b.status !== 'CANCELLED';
      const item = {
        id: b.id,
        court_id: b.court_id,
        court_name: b.courts?.name || 'Court',
        sport_type: b.courts?.sport_type || 'TENNIS',
        is_indoor: b.courts?.is_indoor || false,
        start_time: b.start_time,
        end_time: b.end_time,
        booking_type: b.booking_type,
        status: b.status,
        total_price: Number(b.total_price || 0),
        notes: b.notes,
      };

      if (isUpcoming) {
        upcomingBookings.push(item);
      } else {
        pastBookings.push(item);
      }
    }

    // Sort upcoming ascending (soonest first)
    upcomingBookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    // 3. Cross-Module: Fetch Shop Orders & Items (Developer 3)
    const { data: shopOrdersData } = await supabase
      .from('shop_orders')
      .select(`
        id,
        order_number,
        order_channel,
        total_amount,
        status,
        fulfillment_status,
        created_at,
        shop_order_items (
          quantity,
          unit_price,
          total_price,
          products (name)
        )
      `)
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(15);

    type ShopOrderItemType = {
      quantity: number;
      unit_price: number;
      total_price: number;
      products: { name: string } | null;
    };

    type ShopOrderQueryType = {
      id: string;
      order_number: string;
      order_channel: string;
      total_amount: number;
      status: string;
      fulfillment_status?: string;
      created_at: string;
      shop_order_items: ShopOrderItemType[] | null;
    };

    const shopOrders: MemberPortalData['shopOrders'] = (
      (shopOrdersData || []) as unknown as ShopOrderQueryType[]
    ).map((o) => {
      const items = o.shop_order_items || [];
      const count = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
      const summary = items
        .slice(0, 2)
        .map((it) => `${it.quantity}x ${it.products?.name || 'Item'}`)
        .join(', ') + (items.length > 2 ? ` (+${items.length - 2} more)` : '');

      return {
        id: o.id,
        order_number: o.order_number,
        channel: o.order_channel || 'IN_PERSON',
        total_amount: Number(o.total_amount || 0),
        status: o.fulfillment_status || o.status,
        payment_status: o.status === 'COMPLETED' ? 'PAID' : o.status === 'CANCELLED' ? 'REFUNDED' : 'UNPAID',
        created_at: o.created_at,
        items_count: count,
        items_summary: summary || 'No items',
      };
    });

    // 4. Cross-Module: Fetch Customer Tabs (Developer 3)
    const { data: customerTabsData } = await supabase
      .from('customer_tabs')
      .select('id, tab_number, credit_limit, status, opened_at')
      .eq('member_id', member.id)
      .order('opened_at', { ascending: false });

    const customerTabs: MemberPortalData['customerTabs'] = (customerTabsData || []).map((t) => ({
      id: t.id,
      tab_number: t.tab_number || 'N/A',
      credit_limit: Number(t.credit_limit || 0),
      current_balance: 0,
      status: t.status,
      opened_at: t.opened_at,
    }));

    // 5. Cross-Module: Fetch Invoices & Payments (Developer 4)
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, paid_amount, status, due_date, created_at')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(15);

    const invoices: MemberPortalData['invoices'] = (invoicesData || []).map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      total_amount: Number(inv.total_amount || 0),
      paid_amount: Number(inv.paid_amount || 0),
      status: inv.status,
      due_date: inv.due_date,
      created_at: inv.created_at,
    }));

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('id, payment_number, amount, payment_method, status, created_at, transaction_reference')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(15);

    const payments: MemberPortalData['payments'] = (paymentsData || []).map((p) => ({
      id: p.id,
      receipt_number: p.payment_number,
      amount: Number(p.amount || 0),
      payment_method: p.payment_method,
      status: p.status,
      created_at: p.created_at,
      reference_id: p.transaction_reference,
    }));

    // 6. Fetch Membership History audit log
    const { data: historyData } = await supabase
      .from('membership_history')
      .select(`
        id,
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        changed_by,
        notes,
        created_at,
        membership_plans (
          name,
          tier,
          price
        ),
        profiles:changed_by (
          full_name,
          email
        )
      `)
      .eq('member_id', member.id)
      .order('created_at', { ascending: false });

    // 7. Fetch Notifications
    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    return {
      success: true,
      data: {
        member,
        upcomingBookings,
        pastBookings,
        shopOrders,
        customerTabs,
        invoices,
        payments,
        history: (historyData as unknown as MembershipHistoryItem[]) || [],
        notifications: (notifData as unknown as NotificationItem[]) || [],
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}
