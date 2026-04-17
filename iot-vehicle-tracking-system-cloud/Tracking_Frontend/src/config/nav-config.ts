import {
  Activity,
  Bell,
  Boxes,
  Command,
  Layers3,
  type LucideIcon,
} from 'lucide-react';
import type { NavItem } from '@/types';
import {
  dashboardRouteRegistry,
  getDashboardRouteChildren,
  type DashboardSurface,
} from '@/config/dashboard-route-registry';

const surfaceIcons: Record<DashboardSurface, LucideIcon> = {
  command: Command,
  operations: Activity,
  fleet: Boxes,
  attention: Bell,
  platform: Layers3,
};

const primaryRouteOrder = ['command', 'operations', 'fleet', 'attention', 'platform'];

const primaryRoutes = dashboardRouteRegistry.filter((route) => route.navLevel === 'primary');

const toNavItem = (routeId: string): NavItem | null => {
  const route = primaryRoutes.find((item) => item.id === routeId);

  if (!route) {
    return null;
  }

  const children = getDashboardRouteChildren(route.id).map<NavItem>((child) => ({
    title: child.navLabel ?? child.title,
    url: child.path,
    permissionKey: child.permissionKey,
  }));

  return {
    title: route.navLabel ?? route.title,
    url: route.path,
    icon: surfaceIcons[route.surface],
    permissionKey: route.permissionKey,
    items: children.length > 0 ? children : undefined,
  };
};

export const navConfig: { main: NavItem[]; secondary: NavItem[] } = {
  main: primaryRouteOrder
    .map(toNavItem)
    .filter((item): item is NavItem => item !== null),
  secondary: [],
};
