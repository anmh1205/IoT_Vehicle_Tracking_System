'use client';
import type { NavItem } from '@/types';

/**
 * Simplified nav filter for custom JWT auth (no Clerk RBAC).
 * Currently returns items as-is; hook kept for future role-based filtering.
 */
export function useFilteredNavItems(items: NavItem[]) {
  return items;
}
