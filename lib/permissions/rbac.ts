import type { AppRole } from '@/types/shared';

export type Permission =
  // Memberships & Profiles
  | 'members:read'
  | 'members:manage'
  | 'membership_plans:read'
  | 'membership_plans:manage'
  | 'profiles:read'
  | 'profiles:manage'
  // Courts & Bookings
  | 'courts:read'
  | 'courts:manage'
  | 'bookings:create'
  | 'bookings:read_all'
  | 'bookings:manage'
  // Shop & Inventory
  | 'shop:read_products'
  | 'shop:manage_products'
  | 'inventory:manage'
  | 'shop_orders:create'
  | 'shop_orders:manage'
  // Bar & Cafeteria
  | 'bar:read_menu'
  | 'bar:manage_menu'
  | 'bar_tables:manage'
  | 'bar_orders:create'
  | 'bar_orders:manage'
  | 'tabs:manage'
  // Staff & HR
  | 'staff:read'
  | 'staff:manage'
  | 'shifts:read'
  | 'shifts:manage'
  | 'leave:submit'
  | 'leave:approve'
  // Finance & Invoices
  | 'invoices:read'
  | 'invoices:manage'
  | 'payments:create'
  | 'payments:refund'
  // Enquiries & Quotes
  | 'enquiries:read'
  | 'enquiries:manage'
  | 'quotes:manage'
  // Owner & Reporting
  | 'reports:view'
  | 'audit:read'
  | 'settings:manage';

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  OWNER: [
    'members:read',
    'members:manage',
    'membership_plans:read',
    'membership_plans:manage',
    'profiles:read',
    'profiles:manage',
    'courts:read',
    'courts:manage',
    'bookings:create',
    'bookings:read_all',
    'bookings:manage',
    'shop:read_products',
    'shop:manage_products',
    'inventory:manage',
    'shop_orders:create',
    'shop_orders:manage',
    'bar:read_menu',
    'bar:manage_menu',
    'bar_tables:manage',
    'bar_orders:create',
    'bar_orders:manage',
    'tabs:manage',
    'staff:read',
    'staff:manage',
    'shifts:read',
    'shifts:manage',
    'leave:submit',
    'leave:approve',
    'invoices:read',
    'invoices:manage',
    'payments:create',
    'payments:refund',
    'enquiries:read',
    'enquiries:manage',
    'quotes:manage',
    'reports:view',
    'audit:read',
    'settings:manage',
  ],
  ADMIN: [
    'members:read',
    'members:manage',
    'membership_plans:read',
    'membership_plans:manage',
    'profiles:read',
    'profiles:manage',
    'courts:read',
    'courts:manage',
    'bookings:create',
    'bookings:read_all',
    'bookings:manage',
    'shop:read_products',
    'shop:manage_products',
    'inventory:manage',
    'shop_orders:create',
    'shop_orders:manage',
    'bar:read_menu',
    'bar:manage_menu',
    'bar_tables:manage',
    'bar_orders:create',
    'bar_orders:manage',
    'tabs:manage',
    'staff:read',
    'staff:manage',
    'shifts:read',
    'shifts:manage',
    'leave:submit',
    'leave:approve',
    'invoices:read',
    'invoices:manage',
    'payments:create',
    'enquiries:read',
    'enquiries:manage',
    'quotes:manage',
    'reports:view',
    'audit:read',
  ],
  FRONT_DESK: [
    'members:read',
    'members:manage',
    'membership_plans:read',
    'profiles:read',
    'courts:read',
    'bookings:create',
    'bookings:read_all',
    'bookings:manage',
    'shop:read_products',
    'shop:manage_products',
    'inventory:manage',
    'shop_orders:create',
    'shop_orders:manage',
    'bar:read_menu',
    'bar:manage_menu',
    'bar_tables:manage',
    'bar_orders:create',
    'bar_orders:manage',
    'tabs:manage',
    'shifts:read',
    'leave:submit',
    'invoices:read',
    'invoices:manage',
    'payments:create',
    'enquiries:read',
    'enquiries:manage',
    'quotes:manage',
  ],
  SHOP_STAFF: [
    'membership_plans:read',
    'shop:read_products',
    'shop:manage_products',
    'inventory:manage',
    'shop_orders:create',
    'shop_orders:manage',
    'shifts:read',
    'leave:submit',
    'payments:create',
  ],
  BAR_STAFF: [
    'membership_plans:read',
    'bar:read_menu',
    'bar:manage_menu',
    'bar_tables:manage',
    'bar_orders:create',
    'bar_orders:manage',
    'tabs:manage',
    'shifts:read',
    'leave:submit',
    'payments:create',
  ],
  MEMBER: [
    'membership_plans:read',
    'courts:read',
    'bookings:create',
    'shop:read_products',
    'bar:read_menu',
    'shop_orders:create',
  ],
};

/**
 * Checks whether a given role is granted a specific permission
 */
export function hasPermission(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}
