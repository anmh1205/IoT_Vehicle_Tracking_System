## PHẦN XIII.8: IMPLEMENTATION STEPS - COPY TEMPLATE & DEVELOP

### XIII.8.1 Tổng Quan

Hướng dẫn chi tiết các bước copy template từ `Example/frontend_v2` và phát triển thành Vehicle Tracking System frontend.

**Mục tiêu:**
1. Copy cấu trúc cơ bản từ example
2. Copy theme, sidebar, header
3. Customize cho Vehicle Tracking System
4. Phát triển các features mới

---

### XIII.8.2 Bước 1: Setup Project Mới

#### 1.1 Tạo Next.js Project

```bash
# Tạo project mới
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir=false

# Hoặc với src directory
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir

cd frontend
```

#### 1.2 Copy Dependencies từ Example

```bash
# Copy package.json từ Example/frontend_v2
# Hoặc cài đặt thủ công các dependencies quan trọng
```

**Cài đặt dependencies:**

```bash
# Core
npm install next@^16.0.7 react@^19.2.0 react-dom@^19.2.0

# UI Framework
npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast
npm install tailwindcss@^4.0.0 @tailwindcss/postcss
npm install class-variance-authority clsx tailwind-merge

# State Management
npm install zustand@^5.0.2
npm install @tanstack/react-query@^5.90.5 @tanstack/react-query-devtools@^5.90.2

# Forms
npm install react-hook-form@^7.54.1 @hookform/resolvers@^5.2.1 zod@^4.1.8

# Realtime
npm install socket.io-client@^4.8.1

# Maps
npm install leaflet@^1.9.4 react-leaflet@^5.0.0

# Charts
npm install recharts@^2.15.1 chart.js@^4.4.8 react-chartjs-2@^5.3.0

# Icons
npm install lucide-react@^0.476.0 @tabler/icons-react@^3.31.0

# Utils
npm install date-fns@^4.1.0 dayjs@^1.11.19 sonner@^1.7.1 next-themes@^0.4.6 nextjs-toploader@^3.7.15

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom @types/leaflet
npm install -D eslint eslint-config-next prettier prettier-plugin-tailwindcss
```

#### 1.3 Setup shadcn/ui

```bash
# Khởi tạo shadcn/ui
npx shadcn@latest init

# Chọn options:
# - Style: New York
# - Base color: Zinc
# - CSS variables: Yes
```

**Copy `components.json` từ example:**

```bash
cp Example/frontend_v2/components.json .
```

---

### XIII.8.3 Bước 2: Copy Theme & Styling

#### 2.1 Copy CSS Files

```bash
# Copy globals.css
cp Example/frontend_v2/src/app/globals.css src/app/globals.css

# Copy theme.css
cp Example/frontend_v2/src/app/theme.css src/app/theme.css
```

#### 2.2 Copy Theme Constants

```bash
# Copy theme constants
cp Example/frontend_v2/src/lib/constants/theme.ts src/lib/constants/theme.ts
```

#### 2.3 Setup Tailwind Config

**Tạo `tailwind.config.ts`:**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

**Hoặc copy từ example:**

```bash
# Nếu example có tailwind.config.ts
cp Example/frontend_v2/tailwind.config.ts .
```

#### 2.4 Setup PostCSS

**Tạo `postcss.config.js`:**

```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

**Hoặc copy từ example:**

```bash
cp Example/frontend_v2/postcss.config.js .
```

---

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

### XIII.8.5 Bước 4: Copy UI Components từ shadcn/ui

#### 4.1 Cài đặt các UI Components cần thiết

```bash
# Cài đặt các components từ shadcn/ui
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add table
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add select
npx shadcn@latest add badge
npx shadcn@latest add alert
npx shadcn@latest add toast
npx shadcn@latest add tabs
npx shadcn@latest add dropdown-menu
npx shadcn@latest add sidebar
npx shadcn@latest add separator
npx shadcn@latest add avatar
npx shadcn@latest add skeleton
npx shadcn@latest add switch
npx shadcn@latest add checkbox
npx shadcn@latest add radio-group
npx shadcn@latest add slider
npx shadcn@latest add date-picker
```

#### 4.2 Copy Form Components từ Example

```bash
# Copy form components
mkdir -p src/components/forms
cp Example/frontend_v2/src/components/forms/*.tsx src/components/forms/
```

---

### XIII.8.6 Bước 5: Copy Utilities & Configs

#### 5.1 Copy Utils

```bash
# Copy utils
cp Example/frontend_v2/src/lib/utils.ts src/lib/utils.ts
cp Example/frontend_v2/src/lib/utils/cn.ts src/lib/utils/cn.ts
```

#### 5.2 Copy HTTP Client

```bash
# Copy HTTP client
mkdir -p src/lib/api
cp Example/frontend_v2/src/lib/api/http.ts src/lib/api/http.ts
```

**Customize HTTP Client:**

- Update API base URL
- Update error handling cho Vehicle Tracking System
- Giữ nguyên retry logic và timeout handling

#### 5.3 Copy Auth Store

```bash
# Copy auth store
mkdir -p src/lib/store
cp Example/frontend_v2/src/lib/store/authStore.ts src/lib/store/authStore.ts
```

**Customize Auth Store:**

- Update login/logout logic
- Update user type
- Giữ nguyên token management

#### 5.4 Copy Notification Utils

```bash
# Copy notification utils
cp Example/frontend_v2/src/lib/notification.ts src/lib/notification.ts
```

---

### XIII.8.7 Bước 6: Copy Providers

#### 6.1 Copy Query Provider

```bash
# Copy query provider
mkdir -p src/components/providers
cp Example/frontend_v2/src/components/providers/QueryProvider.tsx src/components/providers/QueryProvider.tsx
```

#### 6.2 Copy Realtime Provider

```bash
# Copy realtime provider
cp Example/frontend_v2/src/components/providers/RealtimeProvider.tsx src/components/providers/RealtimeProvider.tsx

# Copy realtime client
mkdir -p src/lib/realtime
cp Example/frontend_v2/src/lib/realtime/client.ts src/lib/realtime/client.ts
cp Example/frontend_v2/src/lib/realtime/events.ts src/lib/realtime/events.ts
```

**Customize Realtime:**

- Update namespaces cho Vehicle Tracking System
- Update event types
- Giữ nguyên connection logic

#### 6.3 Copy Theme Provider

```bash
# Copy theme provider (hoặc tạo mới)
# src/components/providers/ThemeProvider.tsx
```

#### 6.4 Setup Root Layout với Providers

```typescript
// src/app/layout.tsx
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { Toaster } from '@/components/ui/sonner';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <RealtimeProvider>
              {children}
              <Toaster />
            </RealtimeProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

### XIII.8.8 Bước 7: Copy Auth Components

#### 7.1 Copy Auth Guard

```bash
# Copy auth guard
cp Example/frontend_v2/src/components/layout/auth-guard.tsx src/components/layout/auth-guard.tsx
```

#### 7.2 Copy Login Page

```bash
# Copy login page
mkdir -p src/app/login
cp Example/frontend_v2/src/app/login/page.tsx src/app/login/page.tsx

# Copy auth components
mkdir -p src/components/auth
cp -r Example/frontend_v2/src/components/auth/* src/components/auth/
```

**Customize Login:**

- Update API endpoint
- Update form fields
- Update validation

---

### XIII.8.9 Bước 8: Copy Common Components

#### 8.1 Copy Common Utilities

```bash
# Copy common components
mkdir -p src/components/common
cp Example/frontend_v2/src/components/common/confirm-dialog.tsx src/components/common/confirm-dialog.tsx
cp Example/frontend_v2/src/components/form-card-skeleton.tsx src/components/form-card-skeleton.tsx
```

#### 8.2 Copy Hooks

```bash
# Copy hooks
mkdir -p src/hooks
cp Example/frontend_v2/src/hooks/use-debounce.tsx src/hooks/use-debounce.tsx
cp Example/frontend_v2/src/hooks/use-media-query.ts src/hooks/use-media-query.ts
cp Example/frontend_v2/src/hooks/use-mobile.tsx src/hooks/use-mobile.tsx
cp Example/frontend_v2/src/hooks/use-breadcrumbs.tsx src/hooks/use-breadcrumbs.tsx
```

---

### XIII.8.10 Bước 9: Setup TypeScript Types

#### 9.1 Copy Types từ Example

```bash
# Copy types
mkdir -p src/types
cp Example/frontend_v2/src/types/auth.d.ts src/types/auth.d.ts
cp Example/frontend_v2/src/types/index.ts src/types/index.ts
```

#### 9.2 Tạo Types mới cho Vehicle Tracking

```typescript
// src/types/vehicle.d.ts
export interface Vehicle {
  id: number;
  vehicle_id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  vehicle_type: string;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  mileage_km: number;
  device?: Device;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleDto {
  vehicle_id: string;
  plate_number: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  vehicle_type: string;
}

export interface UpdateVehicleDto extends Partial<CreateVehicleDto> {
  status?: Vehicle['status'];
  mileage_km?: number;
}
```

```typescript
// src/types/customer.d.ts
export interface Customer {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_type: string;
  status: 'active' | 'suspended' | 'blacklisted';
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
}
```

```typescript
// src/types/trip.d.ts
export interface Trip {
  id: number;
  trip_id: string;
  vehicle_id: number;
  customer_id: number;
  start_time: string;
  end_time: string | null;
  start_location: Location;
  end_location: Location | null;
  distance_km: number;
  duration_minutes: number;
  max_speed: number;
  avg_speed: number;
  status: 'in_progress' | 'completed' | 'cancelled';
}

export interface Location {
  lat: number;
  lon: number;
  address?: string;
}
```

```typescript
// src/types/alert.d.ts
export interface Alert {
  id: number;
  vehicle_id: number;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  location: Location;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}
```

---

### XIII.8.11 Bước 10: Tạo API Clients

#### 10.1 Tạo Vehicle API

```typescript
// src/lib/api/vehicles.ts
import { http } from './http';
import type { Vehicle, CreateVehicleDto, UpdateVehicleDto } from '@/types/vehicle';

export const vehicleApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    http.get<{ data: Vehicle[]; meta: any }>('/vehicles', { params }),
  
  get: (id: number) =>
    http.get<Vehicle>(`/vehicles/${id}`),
  
  create: (data: CreateVehicleDto) =>
    http.post<Vehicle>('/vehicles', data),
  
  update: (id: number, data: UpdateVehicleDto) =>
    http.put<Vehicle>(`/vehicles/${id}`, data),
  
  delete: (id: number) =>
    http.delete(`/vehicles/${id}`),
  
  getStatus: (id: number) =>
    http.get<VehicleStatus>(`/vehicles/${id}/status`),
};
```

#### 10.2 Tạo các API Clients khác

Tương tự cho:
- `src/lib/api/customers.ts`
- `src/lib/api/trips.ts`
- `src/lib/api/alerts.ts`
- `src/lib/api/violations.ts`
- `src/lib/api/devices.ts`
- `src/lib/api/geofences.ts`
- `src/lib/api/maintenance.ts`
- `src/lib/api/notifications.ts`

---

### XIII.8.12 Bước 11: Tạo Features Modules

#### 11.1 Tạo Vehicle Feature

```bash
# Tạo vehicle feature structure
mkdir -p src/features/vehicles/components
mkdir -p src/features/vehicles/hooks
```

**Tạo hooks:**

```typescript
// src/features/vehicles/hooks/useVehicles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleApi } from '@/lib/api/vehicles';
import type { Vehicle, CreateVehicleDto, UpdateVehicleDto } from '@/types/vehicle';

export function useVehicles(params?: { page?: number; limit?: number; status?: string; search?: string }) {
  return useQuery({
    queryKey: ['vehicles', params],
    queryFn: () => vehicleApi.list(params),
  });
}

export function useVehicle(id: number) {
  return useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => vehicleApi.get(id),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVehicleDto }) =>
      vehicleApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', variables.id] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: vehicleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
```

**Tạo components:**

```typescript
// src/features/vehicles/components/vehicle-list.tsx
'use client';

import { useVehicles } from '../hooks/useVehicles';
import { DataTable } from '@/components/ui/data-table';

export function VehicleList() {
  const { data, isLoading } = useVehicles();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <DataTable
      data={data?.data || []}
      columns={[
        { accessorKey: 'plate_number', header: 'Biển số' },
        { accessorKey: 'brand', header: 'Hãng' },
        { accessorKey: 'model', header: 'Model' },
        { accessorKey: 'status', header: 'Trạng thái' },
      ]}
    />
  );
}
```

#### 11.2 Tạo các Features khác

Tương tự cho:
- `src/features/customers/`
- `src/features/trips/`
- `src/features/alerts/`
- `src/features/violations/`
- `src/features/devices/`
- `src/features/geofences/`
- `src/features/maintenance/`

---

### XIII.8.13 Bước 12: Tạo Pages

#### 12.1 Tạo Dashboard Overview Page

```typescript
// src/app/dashboard/page.tsx
import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentAlerts } from '@/components/dashboard/recent-alerts';
import { ActiveVehiclesMap } from '@/components/dashboard/active-vehicles-map';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tổng quan</h1>
        <p className="text-muted-foreground">Thống kê và theo dõi hệ thống</p>
      </div>
      
      <StatsCards />
      <RecentAlerts />
      <ActiveVehiclesMap />
    </div>
  );
}
```

#### 12.2 Tạo Vehicle Pages

```typescript
// src/app/dashboard/vehicles/page.tsx
import { VehicleList } from '@/features/vehicles/components/vehicle-list';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function VehiclesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý xe</h1>
          <p className="text-muted-foreground">Danh sách tất cả phương tiện</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/vehicles/new">Thêm xe mới</Link>
        </Button>
      </div>
      
      <VehicleList />
    </div>
  );
}
```

```typescript
// src/app/dashboard/vehicles/[id]/page.tsx
import { useVehicle } from '@/features/vehicles/hooks/useVehicle';
import { VehicleDetail } from '@/features/vehicles/components/vehicle-detail';

export default function VehicleDetailPage({ params }: { params: { id: string } }) {
  const { data: vehicle, isLoading } = useVehicle(Number(params.id));
  
  if (isLoading) return <div>Loading...</div>;
  if (!vehicle) return <div>Not found</div>;
  
  return <VehicleDetail vehicle={vehicle} />;
}
```

#### 12.3 Tạo các Pages khác

Tương tự cho:
- `/dashboard/customers`
- `/dashboard/trips`
- `/dashboard/alerts`
- `/dashboard/violations`
- `/dashboard/devices`
- `/dashboard/geofences`
- `/dashboard/maintenance`
- `/dashboard/map`
- `/dashboard/notifications`
- `/dashboard/settings`

---

### XIII.8.14 Bước 13: Copy Next.js Config

#### 13.1 Copy next.config.ts

```bash
cp Example/frontend_v2/next.config.ts next.config.ts
```

**Customize:**

- Update API base URL
- Update rewrites nếu cần
- Giữ nguyên security headers

#### 13.2 Copy tsconfig.json

```bash
cp Example/frontend_v2/tsconfig.json tsconfig.json
```

---

### XIII.8.15 Bước 14: Copy Dockerfile

```bash
cp Example/frontend_v2/Dockerfile Dockerfile
```

**Customize:**

- Update port nếu cần
- Update build args
- Giữ nguyên multi-stage build

---

### XIII.8.16 Bước 15: Testing & Development

#### 15.1 Chạy Development Server

```bash
npm run dev
```

#### 15.2 Kiểm tra

1. ✅ Theme switching hoạt động
2. ✅ Sidebar navigation hoạt động
3. ✅ Header với breadcrumbs hoạt động
4. ✅ Auth guard hoạt động
5. ✅ API calls hoạt động
6. ✅ Realtime connection hoạt động

---

### XIII.8.17 Summary Checklist

**Setup:**
- [ ] Tạo Next.js project
- [ ] Cài đặt dependencies
- [ ] Setup shadcn/ui
- [ ] Copy theme & styling
- [ ] Copy layout components
- [ ] Copy UI components
- [ ] Copy utilities & configs
- [ ] Copy providers
- [ ] Copy auth components
- [ ] Setup TypeScript types
- [ ] Tạo API clients
- [ ] Tạo features modules
- [ ] Tạo pages
- [ ] Copy config files
- [ ] Copy Dockerfile

**Customization:**
- [ ] Update navigation config
- [ ] Update icons
- [ ] Update API endpoints
- [ ] Update types
- [ ] Customize components cho Vehicle Tracking

**Development:**
- [ ] Tạo vehicle management
- [ ] Tạo customer management
- [ ] Tạo trip management
- [ ] Tạo alert management
- [ ] Tạo map view
- [ ] Tạo notification settings

---

### XIII.8.18 Next Steps

Sau khi hoàn thành các bước trên:

1. **Xem các file chi tiết khác:**
   - [`part-02-03-layout-components.md`](./part-02-03-layout-components.md) - Chi tiết layout components
   - [`part-02-04-ui-components.md`](./part-02-04-ui-components.md) - Chi tiết UI components
   - [`part-02-05-pages-and-features.md`](./part-02-05-pages-and-features.md) - Chi tiết pages và features
   - [`part-02-06-api-integration.md`](./part-02-06-api-integration.md) - Chi tiết API integration
   - [`part-02-07-realtime-integration.md`](./part-02-07-realtime-integration.md) - Chi tiết realtime integration

2. **Phát triển tiếp:**
   - Implement các features còn lại
   - Add error handling
   - Add loading states
   - Add empty states
   - Optimize performance
   - Add tests

