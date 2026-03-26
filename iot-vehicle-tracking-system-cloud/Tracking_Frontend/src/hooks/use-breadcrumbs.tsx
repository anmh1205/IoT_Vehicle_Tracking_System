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
export const useBreadcrumbs = () => {
  const pathname = usePathname();
  const breadcrumbs = useMemo(() => {
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path,
      };
    });
  }, [pathname]);
  return breadcrumbs;
};
