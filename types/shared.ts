/**
 * The Champions Club - Shared Type Definitions & Enums
 *
 * All developers must import enums and core contracts from this file to ensure
 * consistency across frontend, server actions, route handlers, and database queries.
 */

// ---------------------------------------------------------------------------
// Core Roles & Auth
// ---------------------------------------------------------------------------
export type AppRole =
  | 'OWNER'
  | 'ADMIN'
  | 'FRONT_DESK'
  | 'SHOP_STAFF'
  | 'BAR_STAFF'
  | 'MEMBER';

export const APP_ROLES: readonly AppRole[] = [
  'OWNER',
  'ADMIN',
  'FRONT_DESK',
  'SHOP_STAFF',
  'BAR_STAFF',
  'MEMBER',
] as const;

// ---------------------------------------------------------------------------
// Memberships (Developer 1)
// ---------------------------------------------------------------------------
export type MembershipTier = 'GOLD' | 'SILVER' | 'JUNIOR';

export const MEMBERSHIP_TIERS: readonly MembershipTier[] = [
  'GOLD',
  'SILVER',
  'JUNIOR',
] as const;

export type MembershipStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'CANCELLED'
  | 'PENDING';

export const MEMBERSHIP_STATUSES: readonly MembershipStatus[] = [
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'CANCELLED',
  'PENDING',
] as const;

// ---------------------------------------------------------------------------
// Courts & Bookings (Developer 2)
// ---------------------------------------------------------------------------
export type SportType = 'TENNIS' | 'CRICKET';

export const SPORT_TYPES: readonly SportType[] = [
  'TENNIS',
  'CRICKET',
] as const;

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
] as const;

export type BookingType =
  | 'STANDARD'
  | 'SOCIAL_PLAY'
  | 'COACHING'
  | 'MAINTENANCE';

export const BOOKING_TYPES: readonly BookingType[] = [
  'STANDARD',
  'SOCIAL_PLAY',
  'COACHING',
  'MAINTENANCE',
] as const;

// ---------------------------------------------------------------------------
// Shop & Inventory (Developer 3)
// ---------------------------------------------------------------------------
export type OrderChannel = 'COUNTER' | 'ONLINE';

export const ORDER_CHANNELS: readonly OrderChannel[] = [
  'COUNTER',
  'ONLINE',
] as const;

export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'CANCELLED';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
] as const;

export type FulfillmentType = 'PICKUP' | 'DELIVERY';

export const FULFILLMENT_TYPES: readonly FulfillmentType[] = [
  'PICKUP',
  'DELIVERY',
] as const;

export type InventoryTransactionType =
  | 'PURCHASE_RECEIPT'
  | 'SALE_COUNTER'
  | 'SALE_ONLINE'
  | 'ADJUSTMENT'
  | 'RETURN';

export const INVENTORY_TRANSACTION_TYPES: readonly InventoryTransactionType[] = [
  'PURCHASE_RECEIPT',
  'SALE_COUNTER',
  'SALE_ONLINE',
  'ADJUSTMENT',
  'RETURN',
] as const;

// ---------------------------------------------------------------------------
// Bar & Cafeteria (Developer 3)
// ---------------------------------------------------------------------------
export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';

export const TABLE_STATUSES: readonly TableStatus[] = [
  'AVAILABLE',
  'OCCUPIED',
  'RESERVED',
] as const;

export type KitchenStatus =
  | 'PENDING'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'CANCELLED';

export const KITCHEN_STATUSES: readonly KitchenStatus[] = [
  'PENDING',
  'PREPARING',
  'READY',
  'SERVED',
  'CANCELLED',
] as const;

export type TabStatus = 'OPEN' | 'CLOSED' | 'VOID';

export const TAB_STATUSES: readonly TabStatus[] = [
  'OPEN',
  'CLOSED',
  'VOID',
] as const;

// ---------------------------------------------------------------------------
// Finance & Invoicing (Developer 4)
// ---------------------------------------------------------------------------
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI' | 'BANK_TRANSFER';

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'CASH',
  'CARD',
  'UPI',
  'BANK_TRANSFER',
] as const;

export type PaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'PENDING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
] as const;

export type RecipientType = 'MEMBER' | 'BUSINESS_CLIENT' | 'WALK_IN';

export const RECIPIENT_TYPES: readonly RecipientType[] = [
  'MEMBER',
  'BUSINESS_CLIENT',
  'WALK_IN',
] as const;

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID';

export const INVOICE_STATUSES: readonly InvoiceStatus[] = [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'VOID',
] as const;

// ---------------------------------------------------------------------------
// Staff, HR & Enquiries (Developer 4)
// ---------------------------------------------------------------------------
export type Department =
  | 'MANAGEMENT'
  | 'FRONT_DESK'
  | 'COURTS'
  | 'SHOP'
  | 'BAR'
  | 'MAINTENANCE';

export const DEPARTMENTS: readonly Department[] = [
  'MANAGEMENT',
  'FRONT_DESK',
  'COURTS',
  'SHOP',
  'BAR',
  'MAINTENANCE',
] as const;

export type ShiftStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'MISSED'
  | 'CANCELLED';

export const SHIFT_STATUSES: readonly ShiftStatus[] = [
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'MISSED',
  'CANCELLED',
] as const;

export type LeaveType = 'CASUAL' | 'SICK' | 'ANNUAL' | 'UNPAID';

export const LEAVE_TYPES: readonly LeaveType[] = [
  'CASUAL',
  'SICK',
  'ANNUAL',
  'UNPAID',
] as const;

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export const LEAVE_STATUSES: readonly LeaveStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type EnquiryStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'TRIAL_SCHEDULED'
  | 'QUOTE_SENT'
  | 'CONVERTED'
  | 'CLOSED';

export const ENQUIRY_STATUSES: readonly EnquiryStatus[] = [
  'NEW',
  'CONTACTED',
  'TRIAL_SCHEDULED',
  'QUOTE_SENT',
  'CONVERTED',
  'CLOSED',
] as const;

export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'REJECTED';

export const QUOTE_STATUSES: readonly QuoteStatus[] = [
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'EXPIRED',
  'REJECTED',
] as const;

// ---------------------------------------------------------------------------
// Standard Server Action & API Contracts
// ---------------------------------------------------------------------------
export type ActionResult<T = unknown> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Developer 1 — Concrete Entity View Contracts
// ---------------------------------------------------------------------------
export interface MemberWithDetails {
  id: string;
  profile_id: string;
  membership_number: string;
  current_plan_id: string | null;
  status: MembershipStatus;
  start_date: string;
  end_date: string;
  emergency_contact: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: AppRole;
    avatar_url: string | null;
    is_active: boolean;
  };
  membership_plans: {
    id: string;
    name: string;
    tier: MembershipTier;
    description: string | null;
    duration_days: number;
    price: number;
    court_discount_percent: number;
    shop_discount_percent: number;
    bar_discount_percent: number;
    free_court_hours_per_day: number;
    max_daily_bookings: number;
    is_active: boolean;
  } | null;
  derived_status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'PENDING';
  days_remaining: number;
}

export interface MembershipHistoryItem {
  id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: MembershipStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
  membership_plans?: {
    name: string;
    tier: MembershipTier;
    price: number;
  } | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export interface MembershipPlanItem {
  id: string;
  name: string;
  tier: MembershipTier;
  description: string | null;
  duration_days: number;
  price: number;
  court_discount_percent: number;
  shop_discount_percent: number;
  bar_discount_percent: number;
  free_court_hours_per_day: number;
  max_daily_bookings: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

/**
 * Calculates derived membership expiry status from dates and stored status.
 * Requirement: Active, Expiring soon (within 30 days), Expired.
 */
export function calculateMembershipExpiryStatus(
  status: MembershipStatus,
  endDateStr: string
): {
  derivedStatus: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'PENDING';
  daysRemaining: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
} {
  if (status === 'SUSPENDED' || status === 'CANCELLED' || status === 'PENDING') {
    return {
      derivedStatus: status,
      daysRemaining: 0,
      isExpiringSoon: false,
      isExpired: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      derivedStatus: 'EXPIRED',
      daysRemaining,
      isExpiringSoon: false,
      isExpired: true,
    };
  }

  if (daysRemaining <= 30) {
    return {
      derivedStatus: 'EXPIRING_SOON',
      daysRemaining,
      isExpiringSoon: true,
      isExpired: false,
    };
  }

  return {
    derivedStatus: 'ACTIVE',
    daysRemaining,
    isExpiringSoon: false,
    isExpired: false,
  };
}

// ---------------------------------------------------------------------------
// Notifications & Member Portal Contracts (Phase 2)
// ---------------------------------------------------------------------------
export type NotificationType =
  | 'INFO'
  | 'SUCCESS'
  | 'WARNING'
  | 'ALERT'
  | 'EXPIRY'
  | 'BOOKING'
  | 'FINANCE'
  | 'ORDER';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface MemberPortalData {
  member: MemberWithDetails;
  upcomingBookings: Array<{
    id: string;
    court_id: string;
    court_name: string;
    sport_type: SportType;
    is_indoor: boolean;
    start_time: string;
    end_time: string;
    booking_type: string;
    status: string;
    total_price: number;
    notes: string | null;
  }>;
  pastBookings: Array<{
    id: string;
    court_id: string;
    court_name: string;
    sport_type: SportType;
    start_time: string;
    end_time: string;
    booking_type: string;
    status: string;
    total_price: number;
  }>;
  shopOrders: Array<{
    id: string;
    order_number: string;
    channel: string;
    total_amount: number;
    status: string;
    payment_status: string;
    created_at: string;
    items_count: number;
    items_summary: string;
  }>;
  customerTabs: Array<{
    id: string;
    tab_number: string;
    credit_limit: number;
    current_balance: number;
    status: string;
    opened_at: string;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    paid_amount: number;
    status: string;
    due_date: string;
    created_at: string;
  }>;
  payments: Array<{
    id: string;
    receipt_number: string;
    amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    reference_id: string | null;
  }>;
  history: MembershipHistoryItem[];
  notifications: NotificationItem[];
}


