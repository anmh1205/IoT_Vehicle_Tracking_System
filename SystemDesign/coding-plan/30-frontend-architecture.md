# Frontend Architecture

> Kiến trúc frontend với Next.js 16 + React 19 + Feature-Based Structure

---

## 1. Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    APP LAYER                          │   │
│  │  Next.js App Router → Pages → Layouts               │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────────┐   │
│  │                  FEATURES LAYER                       │   │
│  │  Components → Hooks → Utils → Types → Constants      │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────────┐   │
│  │                   SHARED LAYER                        │   │
│  │  UI Components → Lib → Hooks → Config                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục

```
frontend/src/
├── app/                            # Next.js App Router
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Home page (redirect)
│   ├── error.tsx                   # Error boundary
│   ├── not-found.tsx               # 404 page
│   ├── login/
│   │   └── page.tsx                # Login page
│   └── dashboard/
│       ├── layout.tsx              # Dashboard layout (sidebar, header)
│       ├── page.tsx                # Dashboard home (redirect to overview)
│       ├── overview/
│       │   └── page.tsx            # Dashboard overview
│       ├── device/
│       │   ├── page.tsx            # Device list
│       │   └── [id]/
│       │       └── page.tsx        # Device detail (dynamic)
│       ├── map/
│       │   └── page.tsx            # Real-time map
│       ├── statistics/
│       │   └── page.tsx            # Statistics & analytics
│       ├── firmware/
│       │   └── page.tsx            # Firmware management
│       ├── notifications/
│       │   └── page.tsx            # Notifications center
│       ├── users/
│       │   └── page.tsx            # User management
│       ├── settings/
│       │   └── page.tsx            # Settings
│       ├── system-admin/
│       │   ├── page.tsx            # Admin dashboard
│       │   ├── metrics/
│       │   │   └── page.tsx        # VictoriaMetrics
│       │   └── logs/
│       │       └── page.tsx        # VictoriaLogs
│       └── system-status/
│           └── page.tsx            # System health
│
├── features/                       # Feature Modules
│   ├── auth/
│   │   └── components/
│   │       ├── login-form.tsx
│   │       └── logout-button.tsx
│   │
│   ├── devices/
│   │   ├── components/
│   │   │   ├── device-list.tsx
│   │   │   ├── device-filters.tsx
│   │   │   ├── device-card.tsx
│   │   │   ├── device-create-modal.tsx
│   │   │   ├── device-edit-modal.tsx
│   │   │   ├── device-detail-modal/
│   │   │   │   ├── index.tsx
│   │   │   │   ├── info-tab.tsx
│   │   │   │   ├── sessions-tab.tsx
│   │   │   │   └── error-codes-tab/
│   │   │   └── device-list-skeleton.tsx
│   │   ├── hooks/
│   │   │   ├── use-device-list.ts
│   │   │   ├── use-device-detail.ts
│   │   │   ├── use-device-filters.ts
│   │   │   └── use-create-device.ts
│   │   ├── utils/
│   │   │   └── device-status.ts
│   │   └── types/
│   │       └── device.types.ts
│   │
│   ├── map/
│   │   ├── components/
│   │   │   ├── device-map.tsx
│   │   │   ├── device-marker.tsx
│   │   │   ├── device-popup.tsx
│   │   │   └── map-controls.tsx
│   │   ├── hooks/
│   │   │   ├── use-device-locations.ts
│   │   │   └── use-map-realtime.ts
│   │   ├── constants/
│   │   │   └── map-config.ts
│   │   └── types/
│   │       └── map.types.ts
│   │
│   ├── overview/
│   │   └── components/
│   │       ├── stats-cards.tsx
│   │       ├── device-status-chart.tsx
│   │       ├── activity-feed.tsx
│   │       └── recent-alerts.tsx
│   │
│   ├── statistics/
│   │   └── components/
│   │       ├── runtime-chart.tsx
│   │       ├── session-chart.tsx
│   │       └── comparison-chart.tsx
│   │
│   ├── firmware/
│   │   └── components/
│   │       ├── firmware-list.tsx
│   │       ├── firmware-upload-modal.tsx
│   │       ├── firmware-assign-modal.tsx
│   │       └── firmware-device-list.tsx
│   │
│   ├── notifications/
│   │   └── components/
│   │       ├── notification-list.tsx
│   │       ├── notification-item.tsx
│   │       └── notification-settings.tsx
│   │
│   ├── users/
│   │   └── components/
│   │       ├── user-list.tsx
│   │       ├── user-create-modal.tsx
│   │       └── user-edit-modal.tsx
│   │
│   ├── settings/
│   │   └── components/
│   │       ├── appearance-tab.tsx
│   │       ├── notifications-tab.tsx
│   │       └── security-tab.tsx
│   │
│   ├── system-admin/
│   │   ├── components/
│   │   │   ├── metrics-dashboard.tsx
│   │   │   ├── logs-viewer.tsx
│   │   │   └── system-health.tsx
│   │   ├── hooks/
│   │   │   ├── use-metrics.ts
│   │   │   └── use-logs.ts
│   │   └── types/
│   │       └── system-admin.types.ts
│   │
│   └── simulator/
│       ├── components/
│       │   ├── simulator-panel.tsx
│       │   └── device-simulator.tsx
│       └── hooks/
│           └── use-simulator.ts
│
├── components/                     # Shared Components
│   ├── ui/                         # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── ... (40+ components)
│   ├── layout/
│   │   ├── dashboard-layout.tsx
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── nav-item.tsx
│   │   └── user-menu.tsx
│   ├── common/
│   │   ├── data-table.tsx
│   │   ├── loading-spinner.tsx
│   │   ├── error-boundary.tsx
│   │   ├── confirm-dialog.tsx
│   │   └── page-header.tsx
│   ├── forms/
│   │   ├── form-field.tsx
│   │   └── form-actions.tsx
│   └── providers/
│       ├── query-provider.tsx      # TanStack Query
│       ├── theme-provider.tsx      # next-themes
│       ├── socket-provider.tsx     # Socket.IO
│       └── toast-provider.tsx      # Sonner
│
├── hooks/                          # Global Hooks
│   ├── use-debounce.ts
│   ├── use-mobile.ts
│   ├── use-local-storage.ts
│   ├── queries/
│   │   ├── use-auth.ts
│   │   ├── use-devices.ts
│   │   └── use-dashboard-stats.ts
│   ├── mutations/
│   │   ├── use-login.ts
│   │   ├── use-logout.ts
│   │   └── use-create-device.ts
│   └── realtime/
│       ├── use-realtime-connection.ts
│       ├── use-device-realtime.ts
│       └── use-notifications-realtime.ts
│
├── lib/                            # Core Libraries
│   ├── api/
│   │   ├── http.ts                 # HTTP client (fetch wrapper)
│   │   ├── auth.ts                 # Auth API
│   │   ├── device.ts               # Device API
│   │   ├── dashboard.ts            # Dashboard API
│   │   ├── firmware.ts             # Firmware API
│   │   └── endpoints.ts            # API endpoints constants
│   ├── realtime/
│   │   ├── socket.ts               # Socket.IO client
│   │   └── events.ts               # Event constants
│   ├── store/
│   │   ├── auth-store.ts           # Zustand auth store
│   │   ├── ui-store.ts             # UI state store
│   │   └── notification-store.ts   # Notifications store
│   ├── utils/
│   │   ├── cn.ts                   # Class name utility
│   │   ├── format-date.ts          # Date formatting
│   │   ├── format-number.ts        # Number formatting
│   │   └── device/
│   │       ├── status.ts           # Device status helpers
│   │       └── runtime.ts          # Runtime calculations
│   └── constants/
│       ├── api.ts                  # API constants
│       ├── routes.ts               # Route constants
│       └── device.ts               # Device constants
│
├── config/                         # App Configuration
│   └── site.ts                     # Site metadata
│
└── types/                          # Global Types
    ├── api.d.ts                    # API response types
    ├── auth.d.ts                   # Auth types
    └── device.d.ts                 # Device types
```

---

## 3. Feature Modules

### 3.1 Devices Feature

| Component | Description |
|-----------|-------------|
| `device-list.tsx` | Device list với DataTable |
| `device-filters.tsx` | Search, filter, sort controls |
| `device-card.tsx` | Device card view |
| `device-create-modal.tsx` | Create device dialog |
| `device-edit-modal.tsx` | Edit device dialog |
| `device-detail-modal/` | Detail modal với tabs |

| Hook | Description |
|------|-------------|
| `use-device-list` | Fetch device list với filtering |
| `use-device-detail` | Fetch single device |
| `use-device-filters` | Filter state management |
| `use-create-device` | Create mutation |

### 3.2 Map Feature

| Component | Description |
|-----------|-------------|
| `device-map.tsx` | Leaflet map container |
| `device-marker.tsx` | Device marker với status color |
| `device-popup.tsx` | Marker popup content |
| `map-controls.tsx` | Zoom, layer controls |

| Hook | Description |
|------|-------------|
| `use-device-locations` | Fetch device locations |
| `use-map-realtime` | Real-time location updates |

### 3.3 Dashboard Overview

| Component | Description |
|-----------|-------------|
| `stats-cards.tsx` | Summary statistics cards |
| `device-status-chart.tsx` | Pie/donut chart |
| `activity-feed.tsx` | Recent activity list |
| `recent-alerts.tsx` | Alert notifications |

---

## 4. State Management

### 4.1 Server State (TanStack Query)

```typescript
// hooks/queries/use-devices.ts
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/device';

export function useDevices(params?: DeviceListParams) {
  return useQuery({
    queryKey: ['devices', 'list', params],
    queryFn: () => deviceServices.getList(params),
    staleTime: 30 * 1000,
  });
}
```

### 4.2 Client State (Zustand)

```typescript
// lib/store/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: User | null;
  token: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

---

## 5. Real-time Integration

### 5.1 Socket.IO Setup

```typescript
// lib/realtime/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      path: '/ws',
      transports: ['websocket'],
      auth: {
        token: getAuthToken(),
      },
    });
  }
  return socket;
}
```

### 5.2 Real-time Hook

```typescript
// hooks/realtime/use-device-realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/realtime/socket';

export function useDeviceRealtime(deviceId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    socket.emit('device:join', deviceId);

    socket.on('device.status.changed', (data) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    });

    return () => {
      socket.emit('device:leave', deviceId);
      socket.off('device.status.changed');
    };
  }, [deviceId, queryClient]);
}
```

---

## 6. Dependencies

```json
{
  "dependencies": {
    "next": "^16.0.7",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "typescript": "5.7.2",

    "@radix-ui/react-*": "^1.x.x",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.2",

    "zustand": "^5.0.2",
    "@tanstack/react-query": "^5.90.5",
    "@tanstack/react-query-devtools": "^5.90.2",

    "react-hook-form": "^7.54.1",
    "@hookform/resolvers": "^5.2.1",
    "zod": "^4.1.8",

    "socket.io-client": "^4.8.1",

    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0",

    "recharts": "^2.15.1",

    "lucide-react": "^0.476.0",
    "@tabler/icons-react": "^3.31.0",

    "date-fns": "^4.1.0",
    "sonner": "^1.7.1",
    "next-themes": "^0.4.6"
  }
}
```

---

## 7. Scripts

```json
{
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002",
    "lint": "next lint",
    "lint:fix": "eslint src --fix && bun format",
    "format": "prettier --write .",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```
