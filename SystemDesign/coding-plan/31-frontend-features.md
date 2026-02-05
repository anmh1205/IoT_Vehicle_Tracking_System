# Frontend Features

> Chi tiết các feature modules trong frontend

---

## 1. Feature Modules Overview

| Feature | Priority | Components | Hooks | Status |
|---------|----------|------------|-------|--------|
| **auth** | ⭐⭐⭐⭐⭐ | 2 | 2 | Core |
| **devices** | ⭐⭐⭐⭐⭐ | 8 | 5 | Core |
| **overview** | ⭐⭐⭐⭐⭐ | 4 | 2 | Core |
| **map** | ⭐⭐⭐⭐ | 4 | 3 | Core |
| **statistics** | ⭐⭐⭐⭐ | 4 | 2 | Core |
| **firmware** | ⭐⭐⭐⭐ | 5 | 3 | Core |
| **notifications** | ⭐⭐⭐ | 3 | 2 | Medium |
| **users** | ⭐⭐⭐ | 4 | 3 | Medium |
| **settings** | ⭐⭐⭐ | 3 | 1 | Medium |
| **system-admin** | ⭐⭐ | 4 | 3 | Admin |
| **simulator** | ⭐⭐ | 2 | 1 | Dev |

---

## 2. Auth Feature

### Components

```
features/auth/components/
├── login-form.tsx          # Login form với validation
└── logout-button.tsx       # Logout button với confirmation
```

### Login Form

```tsx
// features/auth/components/login-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLogin } from '@/hooks/mutations/use-login';
import { hashPassword } from '@/lib/utils/crypto';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const { mutate: login, isPending } = useLogin();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = (data: LoginForm) => {
    const hashedPassword = hashPassword(data.password);
    login(
      { username: data.username, password: hashedPassword },
      {
        onSuccess: () => router.push('/dashboard'),
      }
    );
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Input
        placeholder="Username"
        {...form.register('username')}
        error={form.formState.errors.username?.message}
      />
      <Input
        type="password"
        placeholder="Password"
        {...form.register('password')}
        error={form.formState.errors.password?.message}
      />
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
```

---

## 3. Devices Feature

### Components

```
features/devices/components/
├── device-list.tsx                 # Main device list với DataTable
├── device-filters.tsx              # Search, filter, sort controls
├── device-card.tsx                 # Card view item
├── device-create-modal.tsx         # Create device dialog
├── device-edit-modal.tsx           # Edit device dialog
├── device-list-skeleton.tsx        # Loading skeleton
└── device-detail-modal/
    ├── index.tsx                   # Modal container với tabs
    ├── info-tab.tsx                # Device info tab
    ├── sessions-tab.tsx            # Sessions history tab
    ├── runtime-tab.tsx             # Runtime analytics tab
    └── error-codes-tab/
        ├── index.tsx               # Error codes list
        └── error-item.tsx          # Single error item
```

### Hooks

```
features/devices/hooks/
├── use-device-list.ts              # Fetch device list
├── use-device-detail.ts            # Fetch single device
├── use-device-filters.ts           # Filter state management
├── use-create-device.ts            # Create mutation
└── use-update-device.ts            # Update mutation
```

### Device List

```tsx
// features/devices/components/device-list.tsx
'use client';

import { useState } from 'react';
import { DataTable } from '@/components/common/data-table';
import { DeviceFilters } from './device-filters';
import { DeviceCreateModal } from './device-create-modal';
import { DeviceDetailModal } from './device-detail-modal';
import { useDeviceList } from '../hooks/use-device-list';
import { useDeviceFilters } from '../hooks/use-device-filters';
import { columns } from './columns';

export function DeviceList() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { filters, setFilter, resetFilters } = useDeviceFilters();
  const { data, isLoading, error } = useDeviceList(filters);

  return (
    <div className="space-y-4">
      <DeviceFilters
        {...filters}
        onSearch={(v) => setFilter('search', v)}
        onStatus={(v) => setFilter('status', v)}
        onSort={(v) => setFilter('sortBy', v)}
        onReset={resetFilters}
        onAdd={() => setShowCreate(true)}
      />

      <DataTable
        columns={columns}
        data={data?.devices ?? []}
        isLoading={isLoading}
        onRowClick={(row) => setSelectedDevice(row.deviceId)}
      />

      <DeviceCreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      <DeviceDetailModal
        deviceId={selectedDevice}
        open={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
      />
    </div>
  );
}
```

### Device Filters Hook

```tsx
// features/devices/hooks/use-device-filters.ts
import { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/use-debounce';

interface DeviceFilters {
  search: string;
  status: string;
  sortBy: 'name' | 'status' | 'runtime' | 'lastSeen';
  page: number;
  limit: number;
}

export function useDeviceFilters() {
  const [filters, setFilters] = useState<DeviceFilters>({
    search: '',
    status: '',
    sortBy: 'name',
    page: 1,
    limit: 20,
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  const setFilter = useCallback(<K extends keyof DeviceFilters>(
    key: K,
    value: DeviceFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      status: '',
      sortBy: 'name',
      page: 1,
      limit: 20,
    });
  }, []);

  return {
    filters: { ...filters, search: debouncedSearch },
    rawSearch: filters.search,
    setFilter,
    resetFilters,
  };
}
```

---

## 4. Map Feature

### Components

```
features/map/components/
├── device-map.tsx                  # Leaflet map container
├── device-marker.tsx               # Device marker với status color
├── device-popup.tsx                # Popup content
└── map-controls.tsx                # Zoom, layer, filter controls
```

### Device Map

```tsx
// features/map/components/device-map.tsx
'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { DeviceMarker } from './device-marker';
import { MapControls } from './map-controls';
import { useDeviceLocations } from '../hooks/use-device-locations';
import { useMapRealtime } from '../hooks/use-map-realtime';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants/map-config';
import 'leaflet/dist/leaflet.css';

export function DeviceMap() {
  const { data: devices, isLoading } = useDeviceLocations();

  // Subscribe to real-time location updates
  useMapRealtime();

  if (isLoading) {
    return <div className="h-full animate-pulse bg-muted" />;
  }

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {devices?.map((device) => (
        <DeviceMarker
          key={device.deviceId}
          device={device}
        />
      ))}

      <MapControls />
    </MapContainer>
  );
}
```

### Map Real-time Hook

```tsx
// features/map/hooks/use-map-realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/realtime/socket';

export function useMapRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    socket.on('device.location.updated', (data) => {
      queryClient.setQueryData(['devices', 'locations'], (old: any) => {
        if (!old) return old;
        return old.map((device: any) =>
          device.deviceId === data.deviceId
            ? { ...device, latitude: data.latitude, longitude: data.longitude }
            : device
        );
      });
    });

    socket.on('device.status.changed', () => {
      queryClient.invalidateQueries({ queryKey: ['devices', 'locations'] });
    });

    return () => {
      socket.off('device.location.updated');
      socket.off('device.status.changed');
    };
  }, [queryClient]);
}
```

---

## 5. Overview Feature

### Components

```
features/overview/components/
├── stats-cards.tsx                 # Summary statistics
├── device-status-chart.tsx         # Pie/donut chart
├── activity-feed.tsx               # Recent activity list
└── recent-alerts.tsx               # Alert notifications
```

### Stats Cards

```tsx
// features/overview/components/stats-cards.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats } from '@/hooks/queries/use-dashboard-stats';
import { IconDevices, IconRun, IconClock, IconAlertTriangle } from '@tabler/icons-react';
import { formatDuration } from '@/lib/utils/format-date';

export function StatsCards() {
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return <StatsCardsSkeleton />;
  }

  const stats = [
    {
      title: 'Total Devices',
      value: data?.devices.total ?? 0,
      icon: IconDevices,
      description: `${data?.devices.running ?? 0} running`,
    },
    {
      title: 'Active Sessions',
      value: data?.sessions.today ?? 0,
      icon: IconRun,
      description: 'Today',
    },
    {
      title: 'Total Runtime',
      value: formatDuration(data?.runtime.today ?? 0),
      icon: IconClock,
      description: 'Today',
    },
    {
      title: 'Active Alerts',
      value: data?.alerts.active ?? 0,
      icon: IconAlertTriangle,
      description: `${data?.alerts.resolved ?? 0} resolved`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## 6. Firmware Feature

### Components

```
features/firmware/components/
├── firmware-list.tsx               # Firmware versions list
├── firmware-upload-modal.tsx       # Upload new firmware
├── firmware-assign-modal.tsx       # Assign to devices
├── firmware-device-list.tsx        # Devices per firmware
└── firmware-card.tsx               # Firmware version card
```

### Firmware Upload

```tsx
// features/firmware/components/firmware-upload-modal.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUploadFirmware } from '../hooks/use-upload-firmware';
import { FileUpload } from '@/components/common/file-upload';

const uploadSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid version format (e.g., 1.0.0)'),
  description: z.string().optional(),
  file: z.instanceof(File).refine((f) => f.size <= 10 * 1024 * 1024, 'Max 10MB'),
});

type UploadForm = z.infer<typeof uploadSchema>;

interface FirmwareUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function FirmwareUploadModal({ open, onClose }: FirmwareUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const { mutate: upload, isPending } = useUploadFirmware();

  const form = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
  });

  const onSubmit = (data: UploadForm) => {
    const formData = new FormData();
    formData.append('version', data.version);
    formData.append('description', data.description ?? '');
    formData.append('file', file!);

    upload(formData, {
      onSuccess: () => {
        onClose();
        form.reset();
        setFile(null);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Firmware</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            placeholder="Version (e.g., 1.0.0)"
            {...form.register('version')}
            error={form.formState.errors.version?.message}
          />

          <Textarea
            placeholder="Description (optional)"
            {...form.register('description')}
          />

          <FileUpload
            accept=".bin,.hex"
            onChange={(f) => {
              setFile(f);
              form.setValue('file', f);
            }}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending || !file}>
              {isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 7. Notifications Feature

### Components

```
features/notifications/components/
├── notification-list.tsx           # Notification center
├── notification-item.tsx           # Single notification
└── notification-settings.tsx       # Notification preferences
```

### Real-time Notifications Hook

```tsx
// hooks/realtime/use-notifications-realtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/realtime/socket';
import { useNotificationStore } from '@/lib/store/notification-store';
import { toast } from 'sonner';

export function useNotificationsRealtime() {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    const socket = getSocket();

    socket.on('notification.received', (data) => {
      // Add to store
      addNotification(data);

      // Show toast
      toast(data.title, {
        description: data.message,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.off('notification.received');
    };
  }, [queryClient, addNotification]);
}
```

---

## 8. System Admin Feature

### Components

```
features/system-admin/components/
├── metrics-dashboard.tsx           # VictoriaMetrics queries
├── logs-viewer.tsx                 # VictoriaLogs viewer
├── system-health.tsx               # System health status
└── database-table-manager.tsx      # Dynamic table CRUD
```

### Metrics Dashboard

```tsx
// features/system-admin/components/metrics-dashboard.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMetrics } from '../hooks/use-metrics';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function MetricsDashboard() {
  const [query, setQuery] = useState('device_vibration{device_id="TRACKER_001"}[1h]');
  const { data, isLoading, refetch } = useMetrics(query);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>PromQL Query</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter PromQL query..."
            />
            <Button onClick={() => refetch()}>Execute</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 animate-pulse bg-muted" />
          ) : data?.data?.result ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formatMetricsData(data.data.result)}>
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground">No data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 9. Page Structure

### Dashboard Overview Page

```tsx
// app/dashboard/overview/page.tsx
import { StatsCards } from '@/features/overview/components/stats-cards';
import { DeviceStatusChart } from '@/features/overview/components/device-status-chart';
import { ActivityFeed } from '@/features/overview/components/activity-feed';
import { RecentAlerts } from '@/features/overview/components/recent-alerts';

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <StatsCards />

      <div className="grid gap-6 md:grid-cols-2">
        <DeviceStatusChart />
        <RecentAlerts />
      </div>

      <ActivityFeed />
    </div>
  );
}
```

### Device List Page

```tsx
// app/dashboard/device/page.tsx
import { DeviceList } from '@/features/devices/components/device-list';

export default function DevicePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Devices</h1>
      <DeviceList />
    </div>
  );
}
```

### Map Page

```tsx
// app/dashboard/map/page.tsx
import dynamic from 'next/dynamic';

const DeviceMap = dynamic(
  () => import('@/features/map/components/device-map').then((m) => m.DeviceMap),
  { ssr: false, loading: () => <div className="h-full animate-pulse bg-muted" /> }
);

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <DeviceMap />
    </div>
  );
}
```
