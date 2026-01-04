import { NavItem } from '@/types';

export const navItems: NavItem[] = [
    {
        title: 'Tổng quan',
        url: '/dashboard',
        icon: 'dashboard',
        shortcut: ['d', 'd'],
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
        items: [
            { title: 'Danh sách', url: '/dashboard/vehicles' },
            { title: 'Thêm mới', url: '/dashboard/vehicles/new' },
        ],
    },
    {
        title: 'Khách hàng',
        url: '/dashboard/customers',
        icon: 'users',
        items: [
            { title: 'Danh sách', url: '/dashboard/customers' },
            { title: 'Thêm mới', url: '/dashboard/customers/new' },
        ],
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
        items: [
            { title: 'Danh sách', url: '/dashboard/devices' },
            { title: 'Thêm mới', url: '/dashboard/devices/new' },
        ],
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
        items: [
            { title: 'Hồ sơ', url: '/dashboard/settings/profile' },
            { title: 'Thông báo', url: '/dashboard/settings/notifications' },
            { title: 'Hệ thống', url: '/dashboard/settings/system' },
        ],
    },
];
