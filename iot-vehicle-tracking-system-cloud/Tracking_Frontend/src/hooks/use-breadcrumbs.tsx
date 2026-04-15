'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Tổng quan', link: '/dashboard' }],
  '/dashboard/map': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Bản đồ', link: '/dashboard/map' },
  ],
  '/dashboard/devices': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Thiết bị', link: '/dashboard/devices' },
  ],
  '/dashboard/vehicles': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Phương tiện', link: '/dashboard/vehicles' },
  ],
  '/dashboard/customers': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Khách hàng', link: '/dashboard/customers' },
  ],
  '/dashboard/alerts': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Cảnh báo', link: '/dashboard/alerts' },
  ],
  '/dashboard/notifications': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Thông báo', link: '/dashboard/notifications' },
  ],
  '/dashboard/violations': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Vi phạm', link: '/dashboard/violations' },
  ],
  '/dashboard/trips': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Chuyến đi', link: '/dashboard/trips' },
  ],
  '/dashboard/geofences': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Vùng giám sát', link: '/dashboard/geofences' },
  ],
  '/dashboard/maintenance': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Bảo trì', link: '/dashboard/maintenance' },
  ],
  '/dashboard/statistics': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Báo cáo', link: '/dashboard/statistics' },
  ],
  '/dashboard/firmware': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Firmware', link: '/dashboard/firmware' },
  ],
  '/dashboard/exports': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Xuất dữ liệu', link: '/dashboard/exports' },
  ],
  '/dashboard/simulator': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Mô phỏng', link: '/dashboard/simulator' },
  ],
  '/dashboard/fuel': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Nhiên liệu', link: '/dashboard/fuel' },
  ],
  '/dashboard/system-status': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Trạng thái hệ thống', link: '/dashboard/system-status' },
  ],
  '/dashboard/settings': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Cài đặt', link: '/dashboard/settings' },
  ],
  '/dashboard/users': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Quản lý người dùng', link: '/dashboard/users' },
  ],
  '/dashboard/system-admin': [
    { title: 'Tổng quan', link: '/dashboard' },
    { title: 'Quản trị hệ thống', link: '/dashboard/system-admin' },
  ],
};

const segmentLabels: Record<string, string> = {
  dashboard: 'Tổng quan',
  map: 'Bản đồ',
  devices: 'Thiết bị',
  vehicles: 'Phương tiện',
  customers: 'Khách hàng',
  alerts: 'Cảnh báo',
  notifications: 'Thông báo',
  violations: 'Vi phạm',
  trips: 'Chuyến đi',
  geofences: 'Vùng giám sát',
  maintenance: 'Bảo trì',
  statistics: 'Báo cáo',
  firmware: 'Firmware',
  exports: 'Xuất dữ liệu',
  simulator: 'Mô phỏng',
  fuel: 'Nhiên liệu',
  'system-status': 'Trạng thái hệ thống',
  settings: 'Cài đặt',
  users: 'Quản lý người dùng',
  'system-admin': 'Quản trị hệ thống',
};

const normalizePath = (value: string) => {
  const cleaned = value.replace(/\/+$/, '');
  return cleaned.length > 0 ? cleaned : '/';
};

const prettifySegment = (segment: string) =>
  segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const toSegmentTitle = (segment: string, previousSegment?: string) => {
  if (/^\d+$/.test(segment)) {
    if (previousSegment === 'trips') {
      return `Chi tiết #${segment}`;
    }
    return `Chi tiết #${segment}`;
  }
  return segmentLabels[segment] ?? prettifySegment(segment);
};

export const useBreadcrumbs = () => {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const normalizedPath = normalizePath(pathname);
    if (routeMapping[normalizedPath]) {
      return routeMapping[normalizedPath];
    }

    const segments = normalizedPath.split('/').filter(Boolean);
    let currentPath = '';

    return segments.map((segment, index) => {
      currentPath += `/${segment}`;
      return {
        title: toSegmentTitle(segment, segments[index - 1]),
        link: currentPath,
      };
    });
  }, [pathname]);

  return breadcrumbs;
};
