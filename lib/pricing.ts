import type { MembershipTier } from '@/types/shared';

export interface PlanDiscounts {
  tier: MembershipTier;
  courtDiscountPercent: number;
  shopDiscountPercent: number;
  barDiscountPercent: number;
  freeCourtHoursPerDay: number;
  maxDailyBookings: number;
}

export const DEFAULT_PLAN_DISCOUNTS: Record<MembershipTier, PlanDiscounts> = {
  GOLD: {
    tier: 'GOLD',
    courtDiscountPercent: 50,
    shopDiscountPercent: 15,
    barDiscountPercent: 15,
    freeCourtHoursPerDay: 1,
    maxDailyBookings: 2,
  },
  SILVER: {
    tier: 'SILVER',
    courtDiscountPercent: 25,
    shopDiscountPercent: 10,
    barDiscountPercent: 10,
    freeCourtHoursPerDay: 0,
    maxDailyBookings: 2,
  },
  JUNIOR: {
    tier: 'JUNIOR',
    courtDiscountPercent: 30,
    shopDiscountPercent: 10,
    barDiscountPercent: 5,
    freeCourtHoursPerDay: 0,
    maxDailyBookings: 2,
  },
};

/**
 * Calculates court booking price given base rate, plan details, and existing booking count for the day.
 */
export function calculateCourtPrice(params: {
  hourlyRate: number;
  plan?: {
    tier: MembershipTier;
    courtDiscountPercent: number;
    freeCourtHoursPerDay: number;
  } | null;
  hoursBookedToday?: number;
}): {
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  isFreeBenefit: boolean;
} {
  const { hourlyRate, plan, hoursBookedToday = 0 } = params;

  if (!plan) {
    return {
      basePrice: hourlyRate,
      discountAmount: 0,
      finalPrice: hourlyRate,
      isFreeBenefit: false,
    };
  }

  // Check if member qualifies for a free daily court session benefit
  if (hoursBookedToday < plan.freeCourtHoursPerDay) {
    return {
      basePrice: hourlyRate,
      discountAmount: hourlyRate,
      finalPrice: 0,
      isFreeBenefit: true,
    };
  }

  // Apply percentage discount
  const discountAmount = Number(((hourlyRate * plan.courtDiscountPercent) / 100).toFixed(2));
  const finalPrice = Math.max(0, Number((hourlyRate - discountAmount).toFixed(2)));

  return {
    basePrice: hourlyRate,
    discountAmount,
    finalPrice,
    isFreeBenefit: false,
  };
}

/**
 * Calculates shop purchase pricing with applicable member discount.
 */
export function calculateShopPrice(params: {
  subtotal: number;
  shopDiscountPercent?: number;
}): {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
} {
  const { subtotal, shopDiscountPercent = 0 } = params;
  const discountAmount = Number(((subtotal * shopDiscountPercent) / 100).toFixed(2));
  const totalAmount = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  return {
    subtotal,
    discountAmount,
    totalAmount,
  };
}

/**
 * Calculates bar/cafeteria order pricing with applicable member discount.
 */
export function calculateBarPrice(params: {
  subtotal: number;
  barDiscountPercent?: number;
}): {
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
} {
  const { subtotal, barDiscountPercent = 0 } = params;
  const discountAmount = Number(((subtotal * barDiscountPercent) / 100).toFixed(2));
  const totalAmount = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  return {
    subtotal,
    discountAmount,
    totalAmount,
  };
}
