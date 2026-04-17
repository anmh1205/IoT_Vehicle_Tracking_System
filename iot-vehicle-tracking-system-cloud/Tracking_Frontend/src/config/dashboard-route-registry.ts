export type DashboardSurface = 'command' | 'operations' | 'fleet' | 'attention' | 'platform';

export type DashboardPermissionKey =
  | 'canAccessSystemAdmin'
  | 'canViewSystemInfo'
  | 'canManageUsers'
  | 'canManageFirmware'
  | 'canExportData';

export type DashboardRouteDef = {
  id: string;
  title: string;
  path: string;
  surface: DashboardSurface;
  parentId?: string;
  aliases?: string[];
  navLevel?: 'primary' | 'secondary' | 'hidden';
  navLabel?: string;
  permissionKey?: DashboardPermissionKey;
};

export type DashboardBreadcrumbItem = {
  title: string;
  link: string;
};

type DashboardRouteMatch = {
  route: DashboardRouteDef;
  matchedPath: string;
};

const normalizePath = (value: string) => {
  const stripped = value.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') ?? '';
  return stripped.length > 0 ? stripped : '/';
};

const splitPath = (value: string) => normalizePath(value).split('/').filter(Boolean);

const isDynamicSegment = (segment: string) => segment.startsWith('[') && segment.endsWith(']');

const matchesRoutePath = (pattern: string, candidate: string) => {
  const patternSegments = splitPath(pattern);
  const candidateSegments = splitPath(candidate);

  if (patternSegments.length !== candidateSegments.length) {
    return false;
  }

  return patternSegments.every((segment, index) => {
    if (isDynamicSegment(segment)) {
      return candidateSegments[index]?.length > 0;
    }

    return segment === candidateSegments[index];
  });
};

const prettifySegment = (segment: string) =>
  segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getDynamicSegmentTitle = (routePath: string, actualPath: string) => {
  const routeSegments = splitPath(routePath);
  const actualSegments = splitPath(actualPath);
  const dynamicIndex = routeSegments.findIndex(isDynamicSegment);

  if (dynamicIndex === -1) {
    return prettifySegment(actualSegments[actualSegments.length - 1] ?? 'chi-tiet');
  }

  return actualSegments[dynamicIndex] ?? 'Chi tiết';
};

export const DASHBOARD_SURFACE_LABELS: Record<DashboardSurface, string> = {
  command: 'Điều hành',
  operations: 'Vận hành',
  fleet: 'Đội xe',
  attention: 'Cảnh báo',
  platform: 'Nền tảng',
};

export const dashboardRouteRegistry: DashboardRouteDef[] = [
  {
    id: 'command',
    title: 'Điều hành',
    navLabel: 'Điều hành',
    path: '/dashboard/command',
    aliases: ['/dashboard'],
    surface: 'command',
    navLevel: 'primary',
  },
  {
    id: 'operations',
    title: 'Vận hành',
    navLabel: 'Vận hành',
    path: '/dashboard/operations',
    surface: 'operations',
    navLevel: 'primary',
  },
  {
    id: 'operations-map',
    title: 'Bản đồ',
    path: '/dashboard/operations/map',
    aliases: ['/dashboard/map'],
    surface: 'operations',
    parentId: 'operations',
    navLevel: 'secondary',
  },
  {
    id: 'operations-trips',
    title: 'Chuyến đi',
    path: '/dashboard/operations/trips',
    aliases: ['/dashboard/trips'],
    surface: 'operations',
    parentId: 'operations',
    navLevel: 'secondary',
  },
  {
    id: 'operations-trip-detail',
    title: 'Chi tiết chuyến đi',
    path: '/dashboard/operations/trips/[id]',
    aliases: ['/dashboard/trips/[id]'],
    surface: 'operations',
    parentId: 'operations-trips',
    navLevel: 'hidden',
  },
  {
    id: 'operations-geofences',
    title: 'Vùng giám sát',
    path: '/dashboard/operations/geofences',
    aliases: ['/dashboard/geofences'],
    surface: 'operations',
    parentId: 'operations',
    navLevel: 'secondary',
  },
  {
    id: 'operations-geofence-detail',
    title: 'Chi tiết vùng giám sát',
    path: '/dashboard/operations/geofences/[id]',
    aliases: ['/dashboard/geofences/[id]'],
    surface: 'operations',
    parentId: 'operations-geofences',
    navLevel: 'hidden',
  },
  {
    id: 'fleet',
    title: 'Đội xe',
    navLabel: 'Đội xe',
    path: '/dashboard/fleet',
    surface: 'fleet',
    navLevel: 'primary',
  },
  {
    id: 'fleet-devices',
    title: 'Thiết bị',
    path: '/dashboard/fleet/devices',
    aliases: ['/dashboard/devices'],
    surface: 'fleet',
    parentId: 'fleet',
    navLevel: 'secondary',
  },
  {
    id: 'fleet-device-detail',
    title: 'Chi tiết thiết bị',
    path: '/dashboard/fleet/devices/[id]',
    aliases: ['/dashboard/devices/[id]'],
    surface: 'fleet',
    parentId: 'fleet-devices',
    navLevel: 'hidden',
  },
  {
    id: 'fleet-vehicles',
    title: 'Phương tiện',
    path: '/dashboard/fleet/vehicles',
    aliases: ['/dashboard/vehicles'],
    surface: 'fleet',
    parentId: 'fleet',
    navLevel: 'secondary',
  },
  {
    id: 'fleet-vehicle-detail',
    title: 'Chi tiết phương tiện',
    path: '/dashboard/fleet/vehicles/[id]',
    aliases: ['/dashboard/vehicles/[id]'],
    surface: 'fleet',
    parentId: 'fleet-vehicles',
    navLevel: 'hidden',
  },
  {
    id: 'fleet-drivers',
    title: 'Tài xế',
    path: '/dashboard/fleet/drivers',
    aliases: ['/dashboard/drivers'],
    surface: 'fleet',
    parentId: 'fleet',
    navLevel: 'secondary',
  },
  {
    id: 'fleet-customers',
    title: 'Khách hàng',
    path: '/dashboard/fleet/customers',
    aliases: ['/dashboard/customers'],
    surface: 'fleet',
    parentId: 'fleet',
    navLevel: 'secondary',
  },
  {
    id: 'fleet-customer-detail',
    title: 'Chi tiết khách hàng',
    path: '/dashboard/fleet/customers/[id]',
    aliases: ['/dashboard/customers/[id]'],
    surface: 'fleet',
    parentId: 'fleet-customers',
    navLevel: 'hidden',
  },
  {
    id: 'attention',
    title: 'Cảnh báo',
    navLabel: 'Cảnh báo',
    path: '/dashboard/attention',
    surface: 'attention',
    navLevel: 'primary',
  },
  {
    id: 'attention-queue',
    title: 'Hàng đợi',
    path: '/dashboard/attention/queue',
    aliases: ['/dashboard/alerts'],
    surface: 'attention',
    parentId: 'attention',
    navLevel: 'secondary',
  },
  {
    id: 'attention-maintenance',
    title: 'Bảo trì',
    path: '/dashboard/attention/maintenance',
    aliases: ['/dashboard/maintenance'],
    surface: 'attention',
    parentId: 'attention',
    navLevel: 'secondary',
  },
  {
    id: 'attention-maintenance-detail',
    title: 'Chi tiết bảo trì',
    path: '/dashboard/attention/maintenance/[id]',
    aliases: ['/dashboard/maintenance/[id]'],
    surface: 'attention',
    parentId: 'attention-maintenance',
    navLevel: 'hidden',
  },
  {
    id: 'attention-violations',
    title: 'Vi phạm',
    path: '/dashboard/attention/violations',
    aliases: ['/dashboard/violations'],
    surface: 'attention',
    parentId: 'attention',
    navLevel: 'secondary',
  },
  {
    id: 'attention-notifications',
    title: 'Thông báo',
    path: '/dashboard/attention/notifications',
    aliases: ['/dashboard/notifications'],
    surface: 'attention',
    parentId: 'attention',
    navLevel: 'secondary',
  },
  {
    id: 'platform',
    title: 'Nền tảng',
    navLabel: 'Nền tảng',
    path: '/dashboard/platform',
    surface: 'platform',
    navLevel: 'primary',
  },
  {
    id: 'platform-system-status',
    title: 'Trạng thái hệ thống',
    path: '/dashboard/platform/system-status',
    aliases: ['/dashboard/system-status', '/dashboard/admin/system-status'],
    surface: 'platform',
    parentId: 'platform',
    navLevel: 'secondary',
    permissionKey: 'canViewSystemInfo',
  },
  {
    id: 'platform-firmware',
    title: 'Firmware',
    path: '/dashboard/platform/firmware',
    aliases: ['/dashboard/firmware'],
    surface: 'platform',
    parentId: 'platform',
    navLevel: 'secondary',
    permissionKey: 'canManageFirmware',
  },
  {
    id: 'platform-exports',
    title: 'Xuất dữ liệu',
    path: '/dashboard/platform/exports',
    aliases: ['/dashboard/exports'],
    surface: 'platform',
    parentId: 'platform',
    navLevel: 'secondary',
    permissionKey: 'canExportData',
  },
  {
    id: 'platform-simulator',
    title: 'Mô phỏng',
    path: '/dashboard/platform/simulator',
    aliases: ['/dashboard/simulator'],
    surface: 'platform',
    parentId: 'platform',
    navLevel: 'secondary',
  },
  {
    id: 'platform-users',
    title: 'Quản lý người dùng',
    path: '/dashboard/platform/users',
    aliases: ['/dashboard/users', '/dashboard/admin/users'],
    surface: 'platform',
    parentId: 'platform',
    navLevel: 'secondary',
    permissionKey: 'canManageUsers',
  },
  {
    id: 'platform-system-admin',
    title: 'Quản trị hệ thống',
    path: '/dashboard/platform/system-admin',
    aliases: ['/dashboard/system-admin', '/dashboard/admin/system'],
    surface: 'platform',
    parentId: 'platform',
    navLevel: 'secondary',
    permissionKey: 'canAccessSystemAdmin',
  },
  {
    id: 'platform-my-settings',
    title: 'Cài đặt cá nhân',
    path: '/dashboard/platform/my-settings',
    aliases: ['/dashboard/settings'],
    surface: 'platform',
    parentId: 'platform',
    navLevel: 'secondary',
  },
  {
    id: 'statistics',
    title: 'Báo cáo',
    path: '/dashboard/statistics',
    surface: 'command',
    navLevel: 'hidden',
  },
  {
    id: 'fuel',
    title: 'Nhiên liệu',
    path: '/dashboard/fuel',
    surface: 'command',
    navLevel: 'hidden',
  },
];

const routeById = new Map(dashboardRouteRegistry.map((route) => [route.id, route]));
const DASHBOARD_TITLE_SUFFIX = 'Theo dõi phương tiện IoT';

const getRouteChain = (route: DashboardRouteDef) => {
  const chain: DashboardRouteDef[] = [];
  let current: DashboardRouteDef | undefined = route;

  while (current) {
    if (current.navLevel !== 'hidden') {
      chain.unshift(current);
    }
    current = current.parentId ? routeById.get(current.parentId) : undefined;
  }

  return chain;
};

export const getDashboardRouteChildren = (parentId: string) =>
  dashboardRouteRegistry.filter((route) => route.parentId === parentId && route.navLevel === 'secondary');

export const isSameOrDescendantPath = (path: string, targetPath: string) => {
  const currentPath = normalizePath(path);
  const expectedPath = normalizePath(targetPath);

  return currentPath === expectedPath || currentPath.startsWith(`${expectedPath}/`);
};

export const findDashboardRoute = (path: string): DashboardRouteMatch | null => {
  const normalizedPath = normalizePath(path);

  for (const route of dashboardRouteRegistry) {
    const candidates = [route.path, ...(route.aliases ?? [])];

    for (const candidate of candidates) {
      if (matchesRoutePath(candidate, normalizedPath)) {
        return {
          route,
          matchedPath: candidate,
        };
      }
    }
  }

  return null;
};

export const buildDashboardMetadata = (path: string, entityLabel?: string) => {
  const match = findDashboardRoute(path);

  if (!match) {
    const pageTitle = entityLabel ? `${entityLabel} | Bảng điều khiển` : 'Bảng điều khiển';
    return {
      title: `${pageTitle} | ${DASHBOARD_TITLE_SUFFIX}`,
      description: 'Bảng điều khiển hệ thống theo dõi phương tiện IoT.',
    };
  }

  const chain = getRouteChain(match.route).map((route) => route.navLabel ?? route.title);
  const currentTitle = chain[chain.length - 1] ?? match.route.navLabel ?? match.route.title;
  const pageTitle = entityLabel ? `${entityLabel} | ${currentTitle}` : currentTitle;
  const parentChain = chain.slice(0, -1).join(' / ');
  const sectionDescription = parentChain ? ` Thuộc nhóm ${parentChain}.` : '';

  return {
    title: `${pageTitle} | ${DASHBOARD_TITLE_SUFFIX}`,
    description: `Trang ${currentTitle} của hệ thống theo dõi phương tiện IoT.${sectionDescription}`,
  };
};

export const getDashboardBreadcrumbs = (path: string): DashboardBreadcrumbItem[] => {
  const match = findDashboardRoute(path);

  if (!match) {
    const segments = splitPath(path);
    let currentPath = '';

    return segments.map((segment) => {
      currentPath += `/${segment}`;
      return {
        title: prettifySegment(segment),
        link: currentPath,
      };
    });
  }

  const breadcrumbs = getRouteChain(match.route).map((route) => ({
    title: route.navLabel ?? route.title,
    link: route.path,
  }));

  if (match.route.navLevel === 'hidden') {
    breadcrumbs.push({
      title: getDynamicSegmentTitle(match.matchedPath, path),
      link: normalizePath(path),
    });
  }

  return breadcrumbs;
};
