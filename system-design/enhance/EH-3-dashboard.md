# EH-3 — Dashboard / Overview Rewrite

> Dashboard hiện chỉ có skeleton components. Cần viết lại hoàn toàn với biểu đồ thật, stat cards, activity feed.
> **Deps**: EH-0 (shared hooks/utils)

---

## CRITICAL RULES

```
1. recharts ONLY — KHÔNG ECharts, KHÔNG Chart.js
2. Stat cards PHẢI có trend indicators (↑ / ↓ + phần trăm)  
3. Charts PHẢI responsive
4. Realtime: Socket.IO subscribe stats:update + alert:new
5. Ref IVM26: E:\anmh1205\ivm26\IVM26_Frontend\frontend_v2\src\features\overview\
```

---

## Task List

| ID      | Description                                                        | Files (trong src/features/dashboard/) | Ref IVM26                  |
| ------- | ------------------------------------------------------------------ | ------------------------------------- | -------------------------- |
| EH-3-01 | Rewrite `overview-stats.tsx` — 4 stat cards với real data + trends | `components/overview-stats.tsx`       | `overview.tsx`             |
| EH-3-02 | Bar graph — device activity theo ngày                              | `components/bar-graph.tsx`            | `bar-graph.tsx` (4,078)    |
| EH-3-03 | Area graph — fleet runtime trend                                   | `components/area-graph.tsx`           | `area-graph.tsx` (5,204)   |
| EH-3-04 | Pie graph — device status distribution                             | `components/pie-graph.tsx`            | `pie-graph.tsx` (3,802)    |
| EH-3-05 | Recent alerts — danh sách cảnh báo mới nhất                        | `components/recent-alerts.tsx`        | `recent-sales.tsx` (1,969) |
| EH-3-06 | Activity feed — realtime event list                                | `components/activity-feed.tsx`        | —                          |
| EH-3-07 | Quick actions — truy cập nhanh các tính năng                       | `components/quick-actions.tsx`        | —                          |
| EH-3-08 | Dashboard page rewrite                                             | `../../app/dashboard/page.tsx`        | `overview.tsx` (5,776)     |
| EH-3-09 | Dashboard hooks — stats, charts, activity                          | `hooks/use-dashboard-stats.ts`        | —                          |
| EH-3-10 | Dashboard realtime hook                                            | `hooks/use-dashboard-realtime.ts`     | —                          |

---

## Architecture

```
DashboardPage
├── PageContainer (pageTitle="Tổng quan")
├── StatCards Row (4 cards, grid-cols-1 sm:2 lg:4)
│   ├── Tổng phương tiện (icon: Car, trend: +2)
│   ├── Thiết bị đang chạy (icon: Cpu, trend: +5%)
│   ├── Cảnh báo đang hoạt động (icon: Bell, trend: -12%)
│   └── Chuyến đi hôm nay (icon: Route, trend: +3)
├── Charts Row (2 cols on lg)
│   ├── BarGraph — Hoạt động thiết bị 7 ngày
│   └── PieGraph — Phân bố trạng thái thiết bị  
├── Full Width Row
│   └── AreaGraph — Thời gian chạy fleet (30 ngày)
├── Bottom Row (2 cols on lg)
│   ├── RecentAlerts — 5 cảnh báo mới nhất
│   └── ActivityFeed — 10 sự kiện gần đây
└── QuickActions (floating or bottom)
```

### Chart Configurations

**BarGraph — recharts BarChart:**
```tsx
// components/bar-graph.tsx
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Data format: [{ date: 'T2', running: 45, idle: 12, offline: 3 }]
// Stacked bars: running (green), idle (gray), offline (red)
// X-axis: ngày trong tuần (T2, T3, ..., CN)
// Y-axis: số thiết bị
```

**PieGraph — recharts PieChart:**
```tsx
// components/pie-graph.tsx
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Data: [{ name: 'Đang chạy', value: 45, color: '#22c55e' }, ...]
// Donut style: innerRadius={60} outerRadius={80}
// Legend below with counts
```

**AreaGraph — recharts AreaChart:**
```tsx
// components/area-graph.tsx
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Data: [{ date: '01/01', runtime: 12.5 }]
// Gradient fill
// 30 ngày gần nhất
```

### Hooks

```typescript
// hooks/use-dashboard-stats.ts
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => apiClient.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60_000,
  });
}

export function useDeviceActivity(days = 7) {
  return useQuery({
    queryKey: ['dashboard', 'device-activity', days],
    queryFn: () => apiClient.get(`/dashboard/device-activity?days=${days}`).then(r => r.data),
  });
}

export function useDeviceStatusDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'device-status'],
    queryFn: () => apiClient.get('/dashboard/device-status').then(r => r.data),
  });
}

export function useFleetRuntime(days = 30) {
  return useQuery({
    queryKey: ['dashboard', 'fleet-runtime', days],
    queryFn: () => apiClient.get(`/dashboard/fleet-runtime?days=${days}`).then(r => r.data),
  });
}
```

---

## Backend API Requirements

| Endpoint                                | Purpose                  | Cần tạo mới?   |
| --------------------------------------- | ------------------------ | -------------- |
| `GET /api/v1/dashboard/stats`           | Stat cards data + trends | Kiểm tra       |
| `GET /api/v1/dashboard/device-activity` | Bar chart data (7d)      | Có thể cần tạo |
| `GET /api/v1/dashboard/device-status`   | Pie chart data           | Có thể cần tạo |
| `GET /api/v1/dashboard/fleet-runtime`   | Area chart data (30d)    | Có thể cần tạo |
| `GET /api/v1/dashboard/activity-feed`   | Recent events            | Có thể cần tạo |
| Socket `stats:update`                   | Realtime stat updates    | Kiểm tra       |
| Socket `alert:new`                      | New alert notifications  | Đã có          |

---

## Verification Checklist

- [ ] 4 stat cards hiển thị dữ liệu thật
- [ ] Stat cards có trend indicators
- [ ] Bar chart hiển thị 7 ngày
- [ ] Pie chart phân bố trạng thái
- [ ] Area chart runtime 30 ngày
- [ ] Recent alerts list hiển thị
- [ ] Activity feed hiển thị
- [ ] Charts responsive trên mobile
- [ ] Loading states: skeletons cho tất cả sections
- [ ] Error states: retry buttons
