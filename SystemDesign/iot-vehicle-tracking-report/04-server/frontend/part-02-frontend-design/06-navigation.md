## XIII.6 Navigation Structure

```typescript
// src/config/nav-config.ts
export const navItems: NavItem[] = [
  {
    title: 'Tổng quan',
    url: '/dashboard',
    icon: 'dashboard',
    shortcut: ['d', 'd'],
  },
  {
    title: 'Xe',
    url: '/dashboard/vehicles',
    icon: 'car',
    items: [
      { title: 'Danh sách xe', url: '/dashboard/vehicles' },
      { title: 'Thêm xe mới', url: '/dashboard/vehicles/new' },
    ],
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
    badge: 'count', // Dynamic badge với số alerts chưa xử lý
  },
  {
    title: 'Vi phạm',
    url: '/dashboard/violations',
    icon: 'alert-triangle',
  },
  {
    title: 'Bản đồ',
    url: '/dashboard/map',
    icon: 'map',
  },
  {
    title: 'Thiết bị',
    url: '/dashboard/devices',
    icon: 'device',
  },
  {
    title: 'Vùng địa lý',
    url: '/dashboard/geofences',
    icon: 'map-pin',
  },
  {
    title: 'Bảo trì',
    url: '/dashboard/maintenance',
    icon: 'wrench',
  },
  {
    title: 'Thông báo',
    url: '/dashboard/notifications',
    icon: 'notification',
  },
  {
    title: 'Cài đặt',
    url: '/dashboard/settings',
    icon: 'settings',
    items: [
      { title: 'Chung', url: '/dashboard/settings' },
      { title: 'Hồ sơ', url: '/dashboard/settings/profile' },
      { title: 'Người dùng', url: '/dashboard/settings/users' },
    ],
  },
  // [Phase 2]
  {
    title: 'Đặt xe',
    url: '/dashboard/bookings',
    icon: 'calendar',
    phase: 2,
  },
];
```

