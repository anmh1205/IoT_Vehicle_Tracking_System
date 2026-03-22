# Phase 4C — Dashboard, Settings & User Management

> Dashboard overview (stats + charts + activity), Settings page (4 tabs), User management (admin CRUD).
> All charts use recharts. All tables use DataTable. All text Vietnamese.

---

## CRITICAL RULES

```
1. Charts: recharts ONLY (ResponsiveContainer, AreaChart, PieChart, BarChart)
2. Dashboard hooks: TanStack Query, real-time via Socket.IO
3. Settings: react-hook-form + Zod per tab
4. User management: admin-only, DataTable + CRUD pattern
5. Skeleton loading for ALL dashboard widgets (StatCard, Charts, ActivityFeed)
6. Vietnamese labels everywhere
```

---

## Task List

| ID     | Description                 | Files                                                         |
| ------ | --------------------------- | ------------------------------------------------------------- |
| FE-040 | Dashboard page              | `app/dashboard/page.tsx`                                      |
| FE-041 | Dashboard hooks (5)         | `features/overview/hooks/*.ts`                                |
| FE-042 | StatCards row (with trends) | `features/overview/components/stat-cards.tsx`                 |
| FE-043 | DeviceActivityBarGraph      | `features/overview/components/device-activity-chart.tsx`      |
| FE-044 | FleetRuntimeAreaGraph       | `features/overview/components/fleet-runtime-chart.tsx`        |
| FE-045 | AlertsSeverityChart         | `features/overview/components/alerts-severity-chart.tsx`      |
| FE-046 | ActivityFeed                | `features/overview/components/activity-feed.tsx`              |
| FE-047 | QuickActions                | `features/overview/components/quick-actions.tsx`              |
| FE-048 | Dashboard API               | `lib/api/dashboard.ts`                                        |
| FE-049 | Dashboard real-time         | `features/overview/hooks/use-dashboard-realtime.ts`           |
| FE-050 | Settings page               | `app/dashboard/settings/page.tsx`                             |
| FE-051 | ProfileTab                  | `features/settings/components/profile-tab.tsx`                |
| FE-052 | PasswordTab                 | `features/settings/components/password-tab.tsx`               |
| FE-053 | NotificationsTab            | `features/settings/components/notifications-tab.tsx`          |
| FE-054 | AppearanceTab               | `features/settings/components/appearance-tab.tsx`             |
| FE-055 | Settings API + schemas      | `lib/api/settings.ts`, `lib/validations/settings.schema.ts`   |
| FE-056 | Users page                  | `app/dashboard/users/page.tsx`                                |
| FE-057 | User columns + form         | `features/users/components/user-columns.tsx`, `user-form.tsx` |
| FE-058 | User hooks + API            | `features/users/hooks/*.ts`, `lib/api/users.ts`               |

---

## Backend API Contract

```
# Dashboard
GET /api/v1/dashboard/stats          → { totalVehicles, activeVehicles, totalDevices, activeDevices, alertsCount, tripsToday, trends: { vehicles: +2, devices: +5%, alerts: -12%, trips: +3 } }
GET /api/v1/dashboard/activity       ?page&limit&eventType&severity → { data: Activity[], meta }
GET /api/v1/dashboard/device-activity ?days=7 → { data: [{ date, running, idle, offline }] }
GET /api/v1/dashboard/fleet-runtime   ?days=30 → { data: [{ date, runtime }] }
GET /api/v1/dashboard/device-status   → { running, stopped, error, offline }

# Settings
GET  /api/v1/auth/me             → User profile
PUT  /api/v1/auth/profile        { fullName, email }
PUT  /api/v1/auth/password       { currentPassword, newPassword }
PUT  /api/v1/auth/notifications  { emailAlerts, pushAlerts, alertTypes }

# Users (admin only)
GET    /api/v1/users              ?page&limit&role&search
POST   /api/v1/users              { username, password, fullName, email, role }
PUT    /api/v1/users/:id          { fullName, email, role, isActive }
DELETE /api/v1/users/:id
```

---

## FE-040: Dashboard Page

```tsx
// app/dashboard/page.tsx
'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { StatCards } from '@/features/overview/components/stat-cards';
import { DeviceStatusChart } from '@/features/overview/components/device-status-chart';
import { DeviceActivityChart } from '@/features/overview/components/device-activity-chart';
import { FleetRuntimeChart } from '@/features/overview/components/fleet-runtime-chart';
import { AlertsSeverityChart } from '@/features/overview/components/alerts-severity-chart';
import { ActivityFeed } from '@/features/overview/components/activity-feed';
import { QuickActions } from '@/features/overview/components/quick-actions';
import { useDashboardStats } from '@/features/overview/hooks/use-dashboard-stats';
import { useDashboardRealtime } from '@/features/overview/hooks/use-dashboard-realtime';

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  useDashboardRealtime();

  return (
    <PageContainer pageTitle="Tổng quan" pageDescription="Dashboard quản lý hệ thống giám sát phương tiện IoT">
      {/* Row 1: Stats */}
      <StatCards stats={stats} isLoading={isLoading} />

      {/* Row 2: Charts (2x2 grid) */}
      <div className="grid gap-4 md:grid-cols-2">
        <DeviceStatusChart />
        <DeviceActivityChart />
        <AlertsSeverityChart />
        <FleetRuntimeChart />
      </div>

      {/* Row 3: Activity + Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <ActivityFeed />
        </div>
        <QuickActions />
      </div>
    </PageContainer>
  );
}
```

---

## FE-042: StatCards

```tsx
// features/overview/components/stat-cards.tsx
import { StatCard } from '@/components/common/stat-card';
import { Car, Cpu, Bell, Route } from 'lucide-react';

interface Props {
  stats: any;
  isLoading: boolean;
}

export function StatCards({ stats, isLoading }: Props) {
  const cards = [
    { title: 'Phương tiện', value: stats?.totalVehicles ?? 0, subtitle: `${stats?.activeVehicles ?? 0} đang hoạt động`, icon: <Car className="h-5 w-5 text-muted-foreground" />, trend: stats?.trends?.vehicles },
    { title: 'Thiết bị', value: stats?.totalDevices ?? 0, subtitle: `${stats?.activeDevices ?? 0} online`, icon: <Cpu className="h-5 w-5 text-muted-foreground" />, trend: stats?.trends?.devices },
    { title: 'Cảnh báo', value: stats?.alertsCount ?? 0, subtitle: 'Chưa xử lý', icon: <Bell className="h-5 w-5 text-muted-foreground" />, trend: stats?.trends?.alerts },
    { title: 'Chuyến đi hôm nay', value: stats?.tripsToday ?? 0, subtitle: 'Đang cập nhật', icon: <Route className="h-5 w-5 text-muted-foreground" />, trend: stats?.trends?.trips },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => <StatCard key={c.title} {...c} isLoading={isLoading} />)}
    </div>
  );
}
```

---

## FE-043–045: Charts

### DeviceStatusChart (PieChart/Donut)
- recharts PieChart trong Card: Running/Stopped/Error/Offline
- Donut style: `innerRadius={60} outerRadius={80}`
- Colors: running=#22c55e, stopped=#6b7280, error=#ef4444, offline=#eab308
- Legend below with counts
- useQuery `['dashboard-device-status']`
- Skeleton khi loading

### DeviceActivityChart (BarChart — Stacked)
- recharts BarChart trong Card: 7-day stacked device activity
- Data format: `[{ date: 'T2', running: 45, idle: 12, offline: 3 }]`
- Stacked bars: running (green), idle (gray), offline (red)
- XAxis: ngày trong tuần, YAxis: số thiết bị
- useQuery `['dashboard-device-activity', 7]` → `GET /dashboard/device-activity?days=7`
- Skeleton khi loading

### FleetRuntimeChart (AreaChart — 30 ngày)
- recharts AreaChart trong Card: fleet runtime trend
- Data format: `[{ date: '01/01', runtime: 12.5 }]`
- Gradient fill, XAxis: dates, YAxis: hours
- useQuery `['dashboard-fleet-runtime', 30]` → `GET /dashboard/fleet-runtime?days=30`
- Skeleton khi loading

### AlertsSeverityChart (BarChart — Stacked)
- recharts BarChart trong Card: low/medium/high/critical stacked
- Colors: blue-400, amber-400, orange-500, red-500
- useQuery `['dashboard-alerts-summary']`
- Skeleton khi loading

### Dashboard Hooks

```typescript
// features/overview/hooks/use-dashboard-stats.ts
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60_000,
  });
}

export function useDeviceActivity(days = 7) {
  return useQuery({
    queryKey: ['dashboard-device-activity', days],
    queryFn: () => apiClient.get(`/dashboard/device-activity?days=${days}`).then(r => r.data),
  });
}

export function useDeviceStatusDistribution() {
  return useQuery({
    queryKey: ['dashboard-device-status'],
    queryFn: () => apiClient.get('/dashboard/device-status').then(r => r.data),
  });
}

export function useFleetRuntime(days = 30) {
  return useQuery({
    queryKey: ['dashboard-fleet-runtime', days],
    queryFn: () => apiClient.get(`/dashboard/fleet-runtime?days=${days}`).then(r => r.data),
  });
}
```

---

## FE-046: ActivityFeed

```tsx
// features/overview/components/activity-feed.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useActivityFeed } from '../hooks/use-activity-feed';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function ActivityFeed() {
  const { data, isLoading } = useActivityFeed();

  return (
    <Card>
      <CardHeader><CardTitle>Hoạt động gần đây</CardTitle></CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mb-3 h-12 w-full" />)
          ) : (
            <div className="space-y-3">
              {data?.data?.map((event: any) => (
                <div key={event.id} className="flex items-start gap-3 rounded-md border p-3">
                  <Badge variant={event.severity === 'critical' ? 'destructive' : 'secondary'} className="shrink-0">
                    {event.eventType}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{event.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

---

## FE-047: QuickActions

Card with grid of action buttons: Thêm thiết bị, Thêm phương tiện, Xem bản đồ, Xuất dữ liệu, Quản lý firmware, Xem cảnh báo. Each button navigates using `router.push()`.

---

## FE-049: Dashboard Real-time

```typescript
// features/overview/hooks/use-dashboard-realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/components/providers/socket-provider';

export function useDashboardRealtime() {
  const socket = useSocket();
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    socket.on('stats:update', () => {
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    socket.on('activity:new', () => {
      qc.invalidateQueries({ queryKey: ['activity-feed'] });
    });

    return () => { socket.off('stats:update'); socket.off('activity:new'); };
  }, [socket, qc]);
}
```

---

## FE-050: Settings Page

```tsx
// app/dashboard/settings/page.tsx
'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileTab } from '@/features/settings/components/profile-tab';
import { PasswordTab } from '@/features/settings/components/password-tab';
import { NotificationsTab } from '@/features/settings/components/notifications-tab';
import { AppearanceTab } from '@/features/settings/components/appearance-tab';

export default function SettingsPage() {
  return (
    <PageContainer pageTitle="Cài đặt" pageDescription="Quản lý tài khoản và tùy chọn cá nhân">
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Hồ sơ</TabsTrigger>
          <TabsTrigger value="password">Mật khẩu</TabsTrigger>
          <TabsTrigger value="notifications">Thông báo</TabsTrigger>
          <TabsTrigger value="appearance">Giao diện</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="password"><PasswordTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="appearance"><AppearanceTab /></TabsContent>
      </Tabs>
    </PageContainer>
  );
}
```

### Tab Details:

**ProfileTab:** Card with react-hook-form. Fields: fullName (Input), email (Input). Zod validation. useMutation `PUT /auth/profile`. Toast on success.

**PasswordTab:** Card with react-hook-form. Fields: currentPassword, newPassword, confirmPassword. Zod: `.min(8)` + confirm match. useMutation `PUT /auth/password`. Toast on success.

**NotificationsTab:** Card with Switch toggles: emailAlerts, pushAlerts. Checkbox group: alertTypes (speeding, geofence, offline, maintenance). useMutation `PUT /auth/notifications`.

**AppearanceTab:** Card. ThemeSelector (existing component). Font size select. Language select (future: currently Vietnamese only).

---

## FE-056–058: User Management (Admin)

User page follows EXACT same pattern as Device page: PageContainer + DataTable + UserForm (Dialog) + ConfirmDialog.

### User Columns:
username, fullName, email, role (Badge: admin=blue, operator=green, viewer=gray), isActive (Switch — inline toggle), createdAt, actions (Edit/Delete)

### User Form:
Dialog + react-hook-form + Zod. Fields: username (disabled on edit), password (only on create), fullName, email, role (Select: admin/operator/viewer), isActive (Switch).

### User Schema:
```typescript
// lib/validations/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3, 'Tối thiểu 3 ký tự').max(50),
  password: z.string().min(8, 'Tối thiểu 8 ký tự'),
  fullName: z.string().min(1, 'Họ tên là bắt buộc'),
  email: z.string().email('Email không hợp lệ'),
  role: z.enum(['admin', 'operator', 'viewer'], { required_error: 'Chọn vai trò' }),
});

export const updateUserSchema = createUserSchema.omit({ password: true, username: true }).extend({
  isActive: z.boolean(),
});
```

---

## Verification Checklist

- [ ] Dashboard: 4 StatCards render with real API data
- [ ] Dashboard: PieChart, AreaChart, BarChart render with recharts (NO ECharts)
- [ ] Dashboard: ActivityFeed shows recent events with Vietnamese time
- [ ] Dashboard: QuickActions navigate correctly
- [ ] Dashboard: Skeleton loading states for all widgets
- [ ] Settings/Profile: form pre-fills, update works
- [ ] Settings/Password: validates min 8 chars + confirm match
- [ ] Settings/Notifications: Switch toggles persist
- [ ] Settings/Appearance: Theme toggle works
- [ ] Users page: DataTable with search, role filter
- [ ] Users: Create user with all fields + validation
- [ ] Users: Edit user (username disabled)
- [ ] Users: Delete user with ConfirmDialog
- [ ] Users: Inline isActive Switch toggle
- [ ] All text in Vietnamese
