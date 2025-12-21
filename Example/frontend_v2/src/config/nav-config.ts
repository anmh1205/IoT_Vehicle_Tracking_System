import { NavItem } from '@/types';

/**
 * Navigation configuration with RBAC support
 *
 * This configuration is used for both the sidebar navigation and Cmd+K bar.
 *
 * RBAC Access Control:
 * Each navigation item can have an `access` property that controls visibility
 * based on permissions, plans, features, roles, and organization context.
 *
 * Examples:
 *
 * 1. Require organization:
 *    access: { requireOrg: true }
 *
 * 2. Require specific permission:
 *    access: { requireOrg: true, permission: 'org:teams:manage' }
 *
 * 3. Require specific plan:
 *    access: { plan: 'pro' }
 *
 * 4. Require specific feature:
 *    access: { feature: 'premium_access' }
 *
 * 5. Require specific role:
 *    access: { role: 'admin' }
 *
 * 6. Multiple conditions (all must be true):
 *    access: { requireOrg: true, permission: 'org:teams:manage', plan: 'pro' }
 *
 * Note: The `visible` function is deprecated but still supported for backward compatibility.
 * Use the `access` property for new items.
 */
export const navItems: NavItem[] = [
  {
    title: 'Tổng quan',
    url: '/dashboard',
    icon: 'dashboard',
    isActive: false,
    shortcut: ['d', 'd'],
    items: []
  },
  {
    title: 'Thiết bị',
    url: '/dashboard/device',
    icon: 'device',
    isActive: false,
    items: []
  },
  {
    title: 'Firmware',
    url: '/dashboard/firmware',
    icon: 'firmware',
    isActive: false,
    items: []
  },
  {
    title: 'Thông báo',
    url: '/dashboard/notifications',
    icon: 'notifications',
    isActive: false,
    items: []
  },
  {
    title: 'Mô phỏng',
    url: '/dashboard/simulator',
    icon: 'simulator',
    isActive: false,
    items: []
  },
  {
    title: 'Người dùng',
    url: '/dashboard/users',
    icon: 'user',
    isActive: false,
    items: []
  },
  {
    title: 'Cài đặt',
    url: '/dashboard/settings',
    icon: 'settings',
    isActive: false,
    items: []
  },
  {
    title: 'Trạng thái hệ thống',
    url: '/dashboard/system-status',
    icon: 'system',
    isActive: false,
    items: []
  }
];
