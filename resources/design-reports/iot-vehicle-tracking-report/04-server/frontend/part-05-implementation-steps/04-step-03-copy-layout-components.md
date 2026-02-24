## PHẦN XIII.8.4: BƯỚC 3 - COPY LAYOUT COMPONENTS

### XIII.8.4 Bước 3: Copy Layout Components

#### 3.1 Copy Sidebar Component

```bash
# Copy sidebar component
mkdir -p src/components/layout
cp Example/frontend_v2/src/components/layout/app-sidebar.tsx src/components/layout/app-sidebar.tsx

# Copy sidebar UI components
cp -r Example/frontend_v2/src/components/ui/sidebar* src/components/ui/
```

**Customize Sidebar:**

1. **Update navigation config:**

```typescript
// src/config/nav-config.ts
import { NavItem } from '@/types';

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
];
```

2. **Update icons:**

```typescript
// src/components/icons.tsx
// Thêm icons cho vehicle tracking system
export const Icons = {
  // ... existing icons
  car: () => <IconCar />,
  users: () => <IconUsers />,
  route: () => <IconRoute />,
  bell: () => <IconBell />,
  'alert-triangle': () => <IconAlertTriangle />,
  map: () => <IconMap />,
  device: () => <IconDevice />,
  'map-pin': () => <IconMapPin />,
  wrench: () => <IconWrench />,
  notification: () => <IconNotification />,
  settings: () => <IconSettings />,
};
```

#### 3.2 Copy Header Component

```bash
# Copy header component
cp Example/frontend_v2/src/components/layout/header.tsx src/components/layout/header.tsx

# Copy breadcrumbs
cp Example/frontend_v2/src/components/breadcrumbs.tsx src/components/breadcrumbs.tsx

# Copy user-nav
cp Example/frontend_v2/src/components/layout/user-nav.tsx src/components/layout/user-nav.tsx
```

**Customize Header:**

- Update breadcrumb logic cho vehicle tracking routes
- Update user menu với logout functionality
- Giữ nguyên theme toggle và theme selector

#### 3.3 Copy Dashboard Layout

```bash
# Copy dashboard layout
cp Example/frontend_v2/src/app/dashboard/layout.tsx src/app/dashboard/layout.tsx
```

**Customize Layout:**

```typescript
// src/app/dashboard/layout.tsx
import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import AuthGuard from '@/components/layout/auth-guard';

export const metadata: Metadata = {
  title: 'Vehicle Tracking Dashboard',
  description: 'Hệ thống quản lý và theo dõi phương tiện'
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <AuthGuard>
            <Header />
            {children}
          </AuthGuard>
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}
```

---

