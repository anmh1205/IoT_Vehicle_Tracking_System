# Phase 4A — Frontend Foundation & Authentication

> Setup Next.js frontend: project init, layout shell (IVM26 pattern), auth system (Zustand memory-only), providers, common components, login page.

---

## CRITICAL RULES (ĐỌC TRƯỚC KHI CODE)

```
0. TRƯỚC KHI BẮT ĐẦU: XÓA toàn bộ Tracking_Frontend/ (rm -rf) rồi tạo mới từ đầu. KHÔNG giữ lại code cũ.
1. Layout PHẢI dùng: SidebarProvider + AppSidebar + SidebarInset + header (SidebarTrigger + Breadcrumbs + ThemeSelector + ModeToggle)
2. Auth PHẢI dùng Zustand store (memory-only). KHÔNG localStorage, KHÔNG React Context
3. Token lưu trong memory (Zustand). Cookie chỉ cho middleware route protection
4. Mọi UI component PHẢI từ shadcn/ui. KHÔNG hand-roll
5. Route group: app/dashboard/ (KHÔNG dùng app/(dashboard)/)
6. KHÔNG dùng @tabler/icons-react — dùng lucide-react
7. Chart library: recharts (KHÔNG ECharts)
```

---

## Task List

| ID     | Description                           | Files                                                                                                       |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| FE-001 | Project init + dependencies           | `package.json`, `next.config.ts`, `tsconfig.json`                                                           |
| FE-002 | shadcn/ui init + install components   | `components/ui/*`                                                                                           |
| FE-003 | Global styles + theme                 | `app/globals.css`, `app/theme.css`                                                                          |
| FE-004 | Root layout + providers               | `app/layout.tsx`, `components/providers/*`                                                                  |
| FE-005 | Auth store (Zustand)                  | `lib/stores/auth-store.ts`                                                                                  |
| FE-006 | API client (Axios)                    | `lib/api/client.ts`, `lib/api/auth.ts`                                                                      |
| FE-007 | Auth middleware                       | `middleware.ts`                                                                                             |
| FE-008 | Session guard component               | `components/auth/session-guard.tsx`                                                                         |
| FE-009 | Dashboard layout shell                | `app/dashboard/layout.tsx`                                                                                  |
| FE-010 | AppSidebar + nav config               | `components/layout/AppSidebar.tsx`, `config/nav-config.ts`                                                  |
| FE-011 | PageContainer                         | `components/layout/PageContainer.tsx`                                                                       |
| FE-012 | Breadcrumbs                           | `components/breadcrumbs.tsx`                                                                                |
| FE-013 | ThemeSelector + ModeToggle            | `components/theme-selector.tsx`, `components/mode-toggle.tsx`                                               |
| FE-014 | NavUser (user menu)                   | `components/nav-user.tsx`                                                                                   |
| FE-015 | KBar command palette                  | `components/kbar/*`                                                                                         |
| FE-016 | Common: DataTable                     | `components/common/data-table.tsx`, `data-table-column-header.tsx`                                          |
| FE-017 | Common: ConfirmDialog                 | `components/common/confirm-dialog.tsx`                                                                      |
| FE-018 | Common: EmptyState                    | `components/common/empty-state.tsx`                                                                         |
| FE-019 | Common: StatCard                      | `components/common/stat-card.tsx`                                                                           |
| FE-020 | Common: ConnectionBanner              | `components/common/connection-banner.tsx`                                                                   |
| FE-021 | Login page                            | `app/login/page.tsx`, `features/auth/components/login-form.tsx`                                             |
| FE-022 | Error pages                           | `app/error.tsx`, `app/not-found.tsx`, `app/global-error.tsx`                                                |
| FE-023 | Root redirect                         | `app/page.tsx`                                                                                              |
| FE-024 | useRoleAccess hook (RBAC)             | `hooks/use-role-access.ts`                                                                                  |
| FE-025 | useRealtimeSubscription hook          | `hooks/use-realtime-subscription.ts`                                                                        |
| FE-026 | useDeviceStatusRealtime hook          | `hooks/use-device-status-realtime.ts`                                                                       |
| FE-027 | Shared utilities                      | `lib/utils/query-invalidation.ts`, `lib/notification.ts`, `lib/utils/logger.ts`, `lib/utils/date/format.ts` |
| FE-028 | API services (export + device-detail) | `lib/api/export.ts`, `lib/api/device-detail.ts`                                                             |
| FE-029 | Realtime provider upgrade             | `components/providers/realtime-provider.tsx` — add joinDeviceRoom/leaveDeviceRoom                           |

---

## Backend API Contract

```
POST /api/v1/auth/login     { username, password } → { user, token }
POST /api/v1/auth/logout     (Authorization header)
GET  /api/v1/auth/me         (Authorization header) → { user }
POST /api/v1/auth/refresh    (cookie) → { token }
```

---

## FE-001: Project Init

```bash
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

### Dependencies (install tất cả):

```bash
# Core
npm i zustand @tanstack/react-query axios socket.io-client nuqs sonner
npm i react-hook-form @hookform/resolvers zod
npm i recharts date-fns
npm i kbar
npm i next-themes

# Dev
npm i -D @types/node
```

### next.config.ts

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
```

---

## FE-002: shadcn/ui Init + Components

```bash
npx shadcn@latest init -y
```

Install ALL required components:

```bash
npx shadcn@latest add button input label card badge table dialog alert-dialog \
  dropdown-menu select checkbox radio-group switch tabs textarea toast \
  separator sidebar breadcrumb avatar skeleton scroll-area sheet \
  popover command calendar form tooltip collapsible progress slider
```

---

## FE-005: Auth Store (Zustand — MEMORY ONLY)

```typescript
// lib/stores/auth-store.ts
import { create } from 'zustand';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: 'root' | 'admin' | 'operator' | 'viewer';
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, token) =>
    set({ user, token, isAuthenticated: true, isLoading: false }),

  clearAuth: () =>
    set({ user: null, token: null, isAuthenticated: false, isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),
}));
```

> ⚠️ Token chỉ tồn tại trong memory. Khi refresh page → token mất → middleware check cookie → auto re-auth hoặc redirect login.

---

## FE-006: API Client (Axios)

```typescript
// lib/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth-store';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach token from memory
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

```typescript
// lib/api/auth.ts
import { apiClient } from './client';

export const authServices = {
  login: (data: { username: string; password: string }) =>
    apiClient.post('/auth/login', data).then((r) => r.data),

  logout: () => apiClient.post('/auth/logout').then((r) => r.data),

  getMe: () => apiClient.get('/auth/me').then((r) => r.data),

  refresh: () => apiClient.post('/auth/refresh').then((r) => r.data),
};
```

---

## FE-007: Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/api'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session_token');
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## FE-008: Session Guard

```tsx
// components/auth/session-guard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { authServices } from '@/lib/api/auth';
import { Loader2 } from 'lucide-react';

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth, clearAuth, isLoading, setLoading } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setChecked(true);
      return;
    }

    authServices.getMe()
      .then((data) => {
        setAuth(data.user, data.token);
      })
      .catch(() => {
        clearAuth();
      })
      .finally(() => {
        setLoading(false);
        setChecked(true);
      });
  }, []);

  if (!checked || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## FE-004: Root Layout + Providers

```tsx
// components/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

```tsx
// components/providers/socket-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth-store';

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) return;

    const s = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
```

```tsx
// components/providers/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { QueryProvider } from './query-provider';
import { SocketProvider } from './socket-provider';
import { SessionGuard } from '@/components/auth/session-guard';
import { ActiveTheme } from '@/components/active-theme';

export function Providers({ children, activeTheme }: { children: React.ReactNode; activeTheme?: string }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ActiveTheme initialTheme={activeTheme} />
      <QueryProvider>
        <SessionGuard>
          <SocketProvider>
            {children}
          </SocketProvider>
        </SessionGuard>
      </QueryProvider>
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
```

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './theme.css';
import { Providers } from '@/components/providers/providers';
import { cookies } from 'next/headers';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'IoT Vehicle Tracking System',
  description: 'Hệ thống giám sát phương tiện IoT',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const activeTheme = cookieStore.get('active_theme')?.value;

  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers activeTheme={activeTheme}>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## FE-009: Dashboard Layout Shell

```tsx
// app/dashboard/layout.tsx
import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ThemeSelector } from '@/components/theme-selector';
import { ModeToggle } from '@/components/mode-toggle';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: 'Dashboard | IoT Vehicle Tracking',
  description: 'Bảng điều khiển hệ thống giám sát phương tiện',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-2 px-4">
              <ThemeSelector />
              <ModeToggle />
            </div>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}
```

> ⚠️ Layout PHẢI match CHÍNH XÁC pattern trên. Không thêm, không bớt elements.

---

## FE-010: AppSidebar + Nav Config

```typescript
// config/nav-config.ts
import {
  LayoutDashboard, Cpu, Car, Users, Map, Shield, Route,
  Wrench, Bell, Download, Settings, HardDrive, UserCog,
  Activity, BarChart3, Play, AlertTriangle,
} from 'lucide-react';

export interface NavItem {
  title: string;
  url: string;
  icon: any;
  items?: NavItem[];
}

export const navConfig: { main: NavItem[]; secondary: NavItem[] } = {
  main: [
    { title: 'Tổng quan', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Bản đồ', url: '/dashboard/map', icon: Map },
    {
      title: 'Quản lý',
      url: '#',
      icon: Cpu,
      items: [
        { title: 'Thiết bị', url: '/dashboard/devices', icon: Cpu },
        { title: 'Phương tiện', url: '/dashboard/vehicles', icon: Car },
        { title: 'Khách hàng', url: '/dashboard/customers', icon: Users },
      ],
    },
    {
      title: 'Giám sát',
      url: '#',
      icon: Activity,
      items: [
        { title: 'Cảnh báo', url: '/dashboard/alerts', icon: Bell },
        { title: 'Vi phạm', url: '/dashboard/violations', icon: AlertTriangle },
        { title: 'Chuyến đi', url: '/dashboard/trips', icon: Route },
        { title: 'Geofences', url: '/dashboard/geofences', icon: Shield },
      ],
    },
    { title: 'Bảo trì', url: '/dashboard/maintenance', icon: Wrench },
    { title: 'Báo cáo', url: '/dashboard/statistics', icon: BarChart3 },
    { title: 'Firmware', url: '/dashboard/firmware', icon: HardDrive },
    { title: 'Xuất dữ liệu', url: '/dashboard/exports', icon: Download },
    { title: 'Simulator', url: '/dashboard/simulator', icon: Play },
  ],
  secondary: [
    { title: 'Cài đặt', url: '/dashboard/settings', icon: Settings },
    { title: 'Quản lý users', url: '/dashboard/users', icon: UserCog },
    { title: 'System Admin', url: '/dashboard/system-admin', icon: Activity },
  ],
};
```

AppSidebar follows IVM26 pattern with `Sidebar`, `SidebarContent`, `SidebarGroup`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, collapsible sub-items, and `NavUser` at footer. Copy structure from `IVM26/frontend_v2/src/components/layout/AppSidebar.tsx`.

---

## FE-011: PageContainer

```tsx
// components/layout/PageContainer.tsx
import { ScrollArea } from '@/components/ui/scroll-area';

interface PageContainerProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageDescription?: string;
  pageHeaderAction?: React.ReactNode;
  scrollable?: boolean;
}

export function PageContainer({
  children,
  pageTitle,
  pageDescription,
  pageHeaderAction,
  scrollable = true,
}: PageContainerProps) {
  const content = (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {(pageTitle || pageHeaderAction) && (
        <div className="flex items-center justify-between">
          <div>
            {pageTitle && <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>}
            {pageDescription && <p className="text-muted-foreground">{pageDescription}</p>}
          </div>
          {pageHeaderAction}
        </div>
      )}
      {children}
    </div>
  );

  if (scrollable) {
    return <ScrollArea className="h-[calc(100vh-4rem)]">{content}</ScrollArea>;
  }
  return content;
}
```

---

## FE-016: DataTable

Copy pattern CHÍNH XÁC từ `32-frontend-implementation.md` Section 2.1–2.2. File: `components/common/data-table.tsx` và `components/common/data-table-column-header.tsx`.

Key features PHẢI có:
- Search input with icon
- Column visibility dropdown
- Sorting (click header)
- Pagination (prev/next + page info)
- Loading state: Skeleton rows
- Empty state: EmptyState component
- Custom toolbar slot
- Vietnamese labels: "Tìm kiếm...", "Cột hiển thị", "Hiển thị X / Y bản ghi", "Trang X / Y"

---

## FE-017–020: Common Components

### ConfirmDialog
Copy từ `32-frontend-implementation.md` Section 3.1. AlertDialog with destructive variant.

### EmptyState
```tsx
// components/common/empty-state.tsx
import { Button } from '@/components/ui/button';
import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title = 'Không có dữ liệu', description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className="text-muted-foreground">{icon || <InboxIcon className="h-10 w-10" />}</div>
      <h3 className="text-lg font-medium">{title}</h3>
      {description && <p className="text-sm text-muted-foreground max-w-sm">{description}</p>}
      {action && <Button className="mt-2" onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
```

### StatCard
```tsx
// components/common/stat-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  isLoading?: boolean;
}

export function StatCard({ title, value, subtitle, icon, trend, isLoading }: StatCardProps) {
  if (isLoading) {
    return <Card><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {trend && <span className={cn(trend.positive ? 'text-green-500' : 'text-red-500')}>{trend.value}</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### ConnectionBanner
```tsx
// components/common/connection-banner.tsx
'use client';

import { useSocket } from '@/components/providers/socket-provider';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function ConnectionBanner() {
  const socket = useSocket();
  const [disconnected, setDisconnected] = useState(false);

  useEffect(() => {
    if (!socket) return;
    socket.on('disconnect', () => setDisconnected(true));
    socket.on('connect', () => setDisconnected(false));
    return () => { socket.off('disconnect'); socket.off('connect'); };
  }, [socket]);

  if (!disconnected) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm text-destructive-foreground">
      <WifiOff className="h-4 w-4" /> Mất kết nối server. Đang thử kết nối lại...
    </div>
  );
}
```

---

## FE-021: Login Page

```tsx
// app/login/page.tsx
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50">
      <LoginForm />
    </div>
  );
}
```

```typescript
// lib/validations/auth.schema.ts
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập là bắt buộc'),
  password: z.string().min(1, 'Mật khẩu là bắt buộc'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
```

LoginForm component: `features/auth/components/login-form.tsx`
- Card with logo/title
- react-hook-form + zodResolver
- username Input, password Input (with Eye/EyeOff toggle)
- rememberMe Checkbox
- Submit Button with Loader2 spinner when pending
- Error Alert banner for invalid credentials
- Enter key submits
- On success: `useAuthStore.setAuth(user, token)` → `router.push('/dashboard')`

---

## FE-022: Error Pages

```tsx
// app/error.tsx
'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-bold">Đã xảy ra lỗi</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  );
}
```

```tsx
// app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="text-muted-foreground">Trang không tồn tại</p>
      <Button asChild><Link href="/dashboard">Về trang chủ</Link></Button>
    </div>
  );
}
```

---

## FE-023: Root Redirect

```tsx
// app/page.tsx
import { redirect } from 'next/navigation';
export default function RootPage() { redirect('/dashboard'); }
```

---

## FSD Directory Structure (after 4A completion)

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx (redirect)
│   ├── error.tsx
│   ├── not-found.tsx
│   ├── global-error.tsx
│   ├── globals.css
│   ├── theme.css
│   ├── login/
│   │   └── page.tsx
│   └── dashboard/
│       ├── layout.tsx
│       └── page.tsx (dashboard — Phase 4C)
├── components/
│   ├── auth/session-guard.tsx
│   ├── breadcrumbs.tsx
│   ├── mode-toggle.tsx
│   ├── theme-selector.tsx
│   ├── nav-user.tsx
│   ├── active-theme.tsx
│   ├── common/
│   │   ├── data-table.tsx
│   │   ├── data-table-column-header.tsx
│   │   ├── confirm-dialog.tsx
│   │   ├── empty-state.tsx
│   │   ├── stat-card.tsx
│   │   └── connection-banner.tsx
│   ├── kbar/
│   │   ├── index.tsx
│   │   └── kbar-content.tsx
│   ├── layout/
│   │   ├── AppSidebar.tsx
│   │   ├── PageContainer.tsx
│   │   └── providers.tsx
│   ├── providers/
│   │   ├── query-provider.tsx
│   │   ├── socket-provider.tsx
│   │   └── providers.tsx
│   └── ui/ (shadcn components)
├── config/
│   └── nav-config.ts
├── features/
│   └── auth/
│       └── components/
│           └── login-form.tsx
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   └── auth.ts
│   ├── stores/
│   │   └── auth-store.ts
│   ├── validations/
│   │   └── auth.schema.ts
│   └── utils.ts
└── types/
    └── index.ts
```

---

## FE-024: useRoleAccess

```typescript
// hooks/use-role-access.ts
import { useAuthStore } from '@/lib/stores/auth-store';

export function useRoleAccess() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? 'viewer';

  return {
    canViewSystemInfo: role === 'root' || role === 'admin',
    canViewAllDevices: role !== 'viewer',
    canEditDevice: role === 'root' || role === 'admin' || role === 'operator',
    canManageUsers: role === 'root' || role === 'admin',
    canManageFirmware: role === 'root' || role === 'admin',
    canExportData: role !== 'viewer',
    canAccessSystemAdmin: role === 'root' || role === 'admin',
    canDeleteDevice: role === 'root' || role === 'admin',
    role,
    isRoot: role === 'root',
    isAdmin: role === 'admin',
  };
}
```

---

## FE-025: useRealtimeSubscription

```typescript
// hooks/use-realtime-subscription.ts
import { useEffect, useRef } from 'react';
import { useSocket } from '@/components/providers/socket-provider';

interface UseRealtimeSubscriptionOptions<T> {
  event: string;
  enabled?: boolean;
  handler: (payload: T) => void;
}

export function useRealtimeSubscription<T>({
  event,
  enabled = true,
  handler,
}: UseRealtimeSubscriptionOptions<T>) {
  const socket = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket || !enabled) return;
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => { socket.off(event, listener); };
  }, [socket, event, enabled]);
}
```

---

## FE-027: Shared Utilities

### query-invalidation.ts

```typescript
// lib/utils/query-invalidation.ts
import type { QueryClient } from '@tanstack/react-query';

export const queryInvalidation = {
  device: {
    all: (qc: QueryClient, deviceId?: number) => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      if (deviceId) qc.invalidateQueries({ queryKey: ['device', deviceId] });
    },
    detail: (qc: QueryClient, deviceId: number) => {
      qc.invalidateQueries({ queryKey: ['device', deviceId] });
      qc.invalidateQueries({ queryKey: ['device-detail', deviceId] });
    },
    sessions: (qc: QueryClient, deviceId: number) => {
      qc.invalidateQueries({ queryKey: ['device-sessions', deviceId] });
    },
    errorCodes: (qc: QueryClient, deviceId: number) => {
      qc.invalidateQueries({ queryKey: ['device-errors', deviceId] });
    },
  },
  dashboard: {
    all: (qc: QueryClient) => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  },
  notifications: {
    all: (qc: QueryClient) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  },
};
```

### notification-utils.ts

```typescript
// lib/notification.ts
import { toast } from 'sonner';

export const notificationUtils = {
  success: (title: string, description?: string) =>
    toast.success(title, { description }),
  error: (title: string, description?: string) =>
    toast.error(title, { description }),
  warning: (title: string, description?: string) =>
    toast.warning(title, { description }),
  info: (title: string, description?: string) =>
    toast.info(title, { description }),
  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => toast.promise(promise, msgs),
};
```

### date/format.ts

```typescript
// lib/utils/date/format.ts
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatDuration(ms: number): string {
  return formatTime(Math.floor(ms / 1000));
}
```

---

## Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] Login page renders: username + password (with toggle) + remember me + submit button
- [ ] Invalid login shows error Alert
- [ ] Successful login → redirect to `/dashboard` with sidebar visible
- [ ] Dashboard layout: SidebarTrigger + Separator + Breadcrumbs + ThemeSelector + ModeToggle
- [ ] Sidebar: all nav items visible, collapsible groups work, user menu at bottom
- [ ] Sidebar toggle (collapse/expand) works, state persists in cookie
- [ ] Theme toggle: dark/light/system works
- [ ] `Cmd+K` opens KBar command palette
- [ ] Unauthenticated access → redirect to `/login?redirect=...`
- [ ] Page refresh → SessionGuard re-authenticates via cookie
- [ ] `/` redirects to `/dashboard`
- [ ] 404 page renders correctly for invalid routes
- [ ] ConnectionBanner appears when Socket.IO disconnects
