import { NavItem } from '@/types';

export const navItems: NavItem[] = [
    {
        title: 'Tổng quan',
        url: '/dashboard',
        icon: 'dashboard',
    },
    {
        title: 'Bản đồ',
        url: '/dashboard/map',
        icon: 'map',
    },
    {
        title: 'Phương tiện',
        url: '/dashboard/vehicles',
        icon: 'car',
    },
    {
        title: 'Khách hàng',
        url: '/dashboard/customers',
        icon: 'users',
    },
    {
        title: 'Chuyến đi',
        url: '/dashboard/trips',
        icon: 'route',
    },
    {
        title: 'Cảnh báo',
        url: '/dashboard/alerts',
        icon: 'bell',
    },
    {
        title: 'Vi phạm',
        url: '/dashboard/violations',
        icon: 'alertTriangle',
    },
    {
        title: 'Vùng địa lý',
        url: '/dashboard/geofences',
        icon: 'mapPin',
    },
    {
        title: 'Thiết bị',
        url: '/dashboard/devices',
        icon: 'device',
    },
    {
        title: 'Bảo trì',
        url: '/dashboard/maintenance',
        icon: 'tool',
    },
    {
        title: 'Cài đặt',
        url: '/dashboard/settings',
        icon: 'settings',
    },
];
