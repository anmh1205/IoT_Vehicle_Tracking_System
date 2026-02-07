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

## 4. State Management (IVM26 Pattern)

> ⚠️ **Pattern từ IVM26:** Zustand cho client state + TanStack Query cho server state. Persist auth store với localStorage.

### 4.1 Server State (TanStack Query)

```typescript
// hooks/queries/use-devices.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface DeviceListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export function useDevices(params?: DeviceListParams) {
  return useQuery({
    queryKey: ['devices', 'list', params],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/devices', { params });
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useDevice(deviceId: string) {
  return useQuery({
    queryKey: ['device', deviceId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/devices/${deviceId}`);
      return response.data;
    },
    enabled: !!deviceId,
    staleTime: 10 * 1000,
  });
}

export function useDevicePositions() {
  return useQuery({
    queryKey: ['devices', 'positions'],
    queryFn: async () => {
      const response = await apiClient.get('/api/v1/devices/positions');
      return response.data;
    },
    staleTime: 5 * 1000, // 5 seconds for map
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
  });
}
```

```typescript
// hooks/mutations/use-device-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface CreateDeviceInput {
  deviceId: string;
  deviceName: string;
  imei?: string;
  vibrationThreshold?: number;
}

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDeviceInput) => {
      const response = await apiClient.post('/api/v1/devices', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create device');
    },
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deviceId, data }: { deviceId: string; data: Partial<CreateDeviceInput> }) => {
      const response = await apiClient.put(`/api/v1/devices/${deviceId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', variables.deviceId] });
      toast.success('Device updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update device');
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      await apiClient.delete(`/api/v1/devices/${deviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete device');
    },
  });
}
```

### 4.2 Client State (Zustand) - IVM26 Pattern

```typescript
// lib/store/auth-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  deviceAccessMode: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  sessionExpiresAt: string | null;
  isAuthenticated: boolean;

  // Actions
  login: (user: User, token: string, expiresAt: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      sessionExpiresAt: null,
      isAuthenticated: false,

      login: (user, token, expiresAt) =>
        set({
          user,
          token,
          sessionExpiresAt: expiresAt,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          user: null,
          token: null,
          sessionExpiresAt: null,
          isAuthenticated: false,
        }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        sessionExpiresAt: state.sessionExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

```typescript
// lib/store/ui-store.ts
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'system',

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setTheme: (theme) => set({ theme }),
}));
```

```typescript
// lib/store/notification-store.ts
import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };

    set((state) => ({
      notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep max 100
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      if (!notification || notification.read) return state;

      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === id);
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: notification && !notification.read
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      };
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
```

### 4.3 API Client với Interceptors (IVM26 Pattern)

```typescript
// lib/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/store/auth-store';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: { message?: string } }>) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();

      // Redirect to login (client-side only)
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    // Extract error message
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject(new Error(message));
  }
);
```

---

## 5. Real-time Integration (IVM26 Pattern)

> ⚠️ **Pattern từ IVM26:** Kết hợp Socket.IO cho WebSocket events với MQTT.js cho IoT data. Sử dụng WSS (port 8084) trong production.

### 5.1 Socket.IO Setup (IVM26 Pattern)

```typescript
// lib/realtime/socket.ts
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/auth-store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().token;

    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
      path: '/ws',
      transports: ['websocket'],
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('📴 Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Reconnect with new token (after login)
export function reconnectSocket(): void {
  disconnectSocket();
  getSocket();
}
```

### 5.2 MQTT Client với WSS Support (IVM26 Pattern)

```typescript
// lib/mqtt/client.ts
import mqtt, { MqttClient, IClientOptions } from 'mqtt';

let client: MqttClient | null = null;

interface MqttConfig {
  host: string;
  wsPort: number;      // Non-TLS WebSocket (8083)
  wssPort: number;     // TLS WebSocket Secure (8084)
  useTls: boolean;
  username?: string;
  password?: string;
}

const mqttConfig: MqttConfig = {
  host: process.env.NEXT_PUBLIC_MQTT_HOST || 'localhost',
  wsPort: parseInt(process.env.NEXT_PUBLIC_MQTT_WS_PORT || '8083'),
  wssPort: parseInt(process.env.NEXT_PUBLIC_MQTT_WSS_PORT || '8084'),
  useTls: process.env.NODE_ENV === 'production',
  username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
  password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
};

export function connectMQTT(): MqttClient {
  if (client?.connected) {
    return client;
  }

  // Select protocol and port based on environment
  const protocol = mqttConfig.useTls ? 'wss' : 'ws';
  const port = mqttConfig.useTls ? mqttConfig.wssPort : mqttConfig.wsPort;
  const brokerUrl = `${protocol}://${mqttConfig.host}:${port}/mqtt`;

  console.log(`Connecting to MQTT: ${brokerUrl}`);

  const options: IClientOptions = {
    clientId: `web_${Math.random().toString(16).slice(2, 10)}`,
    username: mqttConfig.username,
    password: mqttConfig.password,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 4000,
    // For self-signed certs in development
    rejectUnauthorized: mqttConfig.useTls,
  };

  client = mqtt.connect(brokerUrl, options);

  client.on('connect', () => {
    console.log('✅ MQTT connected');
  });

  client.on('error', (error) => {
    console.error('❌ MQTT error:', error);
  });

  client.on('reconnect', () => {
    console.log('🔄 MQTT reconnecting...');
  });

  client.on('offline', () => {
    console.log('📴 MQTT offline');
  });

  return client;
}

export function disconnectMQTT(): void {
  if (client) {
    client.end();
    client = null;
  }
}

export function subscribeTopic(
  topic: string,
  callback: (message: unknown) => void
): () => void {
  const mqttClient = connectMQTT();

  mqttClient.subscribe(topic, (err) => {
    if (err) {
      console.error('Subscribe error:', err);
    } else {
      console.log(`Subscribed to: ${topic}`);
    }
  });

  const messageHandler = (receivedTopic: string, message: Buffer) => {
    if (receivedTopic === topic || mqttTopicMatch(topic, receivedTopic)) {
      try {
        const data = JSON.parse(message.toString());
        callback(data);
      } catch (error) {
        console.error('Parse error:', error);
      }
    }
  };

  mqttClient.on('message', messageHandler);

  // Return unsubscribe function
  return () => {
    mqttClient.unsubscribe(topic);
    mqttClient.off('message', messageHandler);
  };
}

// Helper: Match MQTT wildcard topics
function mqttTopicMatch(pattern: string, topic: string): boolean {
  const patternParts = pattern.split('/');
  const topicParts = topic.split('/');

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === '#') return true;
    if (patternParts[i] === '+') continue;
    if (patternParts[i] !== topicParts[i]) return false;
  }

  return patternParts.length === topicParts.length;
}
```

### 5.3 Real-time Hook Pattern (IVM26)

```typescript
// hooks/realtime/use-device-realtime.ts
import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/realtime/socket';

interface DeviceTelemetry {
  deviceId: string;
  latitude: number;
  longitude: number;
  speed: number;
  status: string;
  timestamp: number;
}

export function useDeviceRealtime(deviceId?: string) {
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Subscribe to device-specific events
    if (deviceId) {
      socket.emit('subscribe:device', deviceId);

      socket.on(`telemetry:${deviceId}`, (data: DeviceTelemetry) => {
        setTelemetry(data);

        // Update query cache for immediate UI update
        queryClient.setQueryData(['device', deviceId, 'telemetry'], data);
      });

      socket.on(`status:${deviceId}`, (data) => {
        // Invalidate device queries to refresh
        queryClient.invalidateQueries({ queryKey: ['devices'] });
        queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      });
    }

    // Subscribe to global events
    socket.on('device.status.changed', (data) => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    });

    socket.on('alert.created', (data) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);

      if (deviceId) {
        socket.emit('unsubscribe:device', deviceId);
        socket.off(`telemetry:${deviceId}`);
        socket.off(`status:${deviceId}`);
      }

      socket.off('device.status.changed');
      socket.off('alert.created');
    };
  }, [deviceId, queryClient]);

  return { telemetry, isConnected };
}

// Hook for map real-time updates (multiple devices)
export function useMapRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    // Subscribe to all device location updates
    socket.emit('subscribe:locations');

    socket.on('device:location', (data: DeviceTelemetry) => {
      // Update device location in cache (without full refetch)
      queryClient.setQueryData(['devices', 'positions'], (old: DeviceTelemetry[] | undefined) => {
        if (!old) return [data];

        const index = old.findIndex((d) => d.deviceId === data.deviceId);
        if (index === -1) {
          return [...old, data];
        }

        const updated = [...old];
        updated[index] = { ...updated[index], ...data };
        return updated;
      });
    });

    return () => {
      socket.emit('unsubscribe:locations');
      socket.off('device:location');
    };
  }, [queryClient]);
}
```

### 5.4 Socket Provider (IVM26)

```typescript
// components/providers/socket-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket, reconnectSocket } from '@/lib/realtime/socket';
import { useAuthStore } from '@/lib/store/auth-store';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  reconnect: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketInstance = getSocket();
    setSocket(socketInstance);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    // Set initial state
    setIsConnected(socketInstance.connected);

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
    };
  }, [token]);

  const reconnect = () => {
    reconnectSocket();
    setSocket(getSocket());
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
```

---

## 6. Map Strategy (Leaflet & Performance)

### 6.1 Core Technology
-   **Library:** `react-leaflet` v5 (Leaflet 1.9 core).
-   **Tiles:** OpenStreetMap (Dev) / Google Maps or Mapbox (Prod - abstraction layer required).

### 6.2 Performance Optimization (Cluster & Throttling)
-   **Clustering:** Use `react-leaflet-cluster` to group markers when zoom level < 14.
    -   *Logic:* If > 500 markers, clustering is mandatory to maintain 60FPS.
    -   *Custom Icon:* Cluster icon shows count + color status (Red if any critical inside).
-   **Canvas Rendering:** For high-density non-clustered views (e.g., history trails with 10k points), use `L.canvas()` renderer instead of SVG.
-   **Throttling Updates:**
    -   Incoming Socket data (10 events/sec) is buffered.
    -   `useMapRealtime` hook updates the internal React state at max 2Hz (every 500ms) to prevent UI thread blocking.

### 6.3 Interaction Patterns
-   **FlyTo Animation:** Smooth transition when selecting a vehicle from the sidebar.
-   **Boundaries:** `map.fitBounds(featureGroup)` used on initial load to show all vehicles.
-   **Popup Management:** Only one popup open at a time. Clicking map background closes all.

---

## 7. Dependencies

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

## 8. Scripts

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
