# Phase 4B — Device Management UI

> Implement Device CRUD, DataTable with filters, Device Detail Sheet (5 tabs), real-time status, telemetry charts.
> FSD structure: `features/devices/{components,hooks,types}/`

---

## CRITICAL RULES

```
1. Directory: features/devices/components/, features/devices/hooks/, features/devices/types/
2. Page: PageContainer + DataTable pattern (from 4A)
3. Detail: Sheet component (NOT Dialog) for device detail — 5 tabs
4. Charts: recharts (KHÔNG ECharts)
5. Icons: lucide-react
6. ALL inline code patterns PHẢI follow CHÍNH XÁC
7. Real-time: Socket.IO via useSocket() hook from providers
```

---

## Task List

| ID     | Description          | Files                                                  |
| ------ | -------------------- | ------------------------------------------------------ |
| FE-030 | Device types         | `features/devices/types/index.ts`                      |
| FE-031 | Device Zod schema    | `lib/validations/device.schema.ts`                     |
| FE-032 | Device API service   | `lib/api/devices.ts`                                   |
| FE-033 | Device hooks (6)     | `features/devices/hooks/*.ts`                          |
| FE-034 | Device page          | `app/dashboard/devices/page.tsx`                       |
| FE-035 | Device columns       | `features/devices/components/device-columns.tsx`       |
| FE-036 | Device form          | `features/devices/components/device-form.tsx`          |
| FE-037 | Device detail sheet  | `features/devices/components/device-detail-sheet.tsx`  |
| FE-038 | Device telemetry tab | `features/devices/components/device-telemetry-tab.tsx` |
| FE-039 | Device sessions tab  | `features/devices/components/device-sessions-tab.tsx`  |
| FE-03A | Device commands tab  | `features/devices/components/device-commands-tab.tsx`  |
| FE-03B | Device errors tab    | `features/devices/components/device-errors-tab.tsx`    |
| FE-03C | Real-time hook       | `features/devices/hooks/use-device-realtime.ts`        |
| FE-03D | Device filters       | `features/devices/components/device-filters.tsx`       |

---

## Backend API Contract

```
GET    /api/v1/devices                    ?page&limit&status&search&customerId
GET    /api/v1/devices/:deviceId          → DeviceDetail
POST   /api/v1/devices                    { deviceId, deviceName, deviceType, imei, ... }
PUT    /api/v1/devices/:id                { deviceName, deviceType, ... }
DELETE /api/v1/devices/:id
GET    /api/v1/devices/:deviceId/sessions ?page&limit
GET    /api/v1/devices/:deviceId/telemetry?metric&from&to
POST   /api/v1/devices/:deviceId/command  { command, params }
GET    /api/v1/devices/:deviceId/commands ?page&limit
GET    /api/v1/devices/:deviceId/errors   ?page&limit
```

---

## FE-030: Device Types

```typescript
// features/devices/types/index.ts
export interface Device {
  id: number;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  imei: string | null;
  currentStatus: 'running' | 'stopped' | 'disconnected';
  lastSeenAt: string | null;
  totalRuntimeSeconds: number;
  latitude: number | null;
  longitude: number | null;
  firmwareVersion: string | null;
  lastErrorCode: number;
  vehicleId: number | null;
  vehiclePlate: string | null;
  customerId: number | null;
  customerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceDetail extends Device {
  sessions: DeviceSession[];
  recentErrors: DeviceError[];
  commandHistory: DeviceCommand[];
}

export interface DeviceSession {
  id: number;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  vibrationAvg: number | null;
  vibrationMax: number | null;
  vibrationRms: number | null;
  status: 'active' | 'completed';
}

export interface DeviceError {
  id: number;
  errorCode: number;
  errorName: string;
  description: string;
  occurredAt: string;
  resolvedAt: string | null;
}

export interface DeviceCommand {
  id: number;
  command: string;
  params: Record<string, any>;
  status: 'pending' | 'sent' | 'acknowledged' | 'failed';
  sentAt: string;
  ackedAt: string | null;
  response: string | null;
}

export interface DeviceFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  customerId?: number;
}

export interface TelemetryPoint {
  timestamp: string;
  value: number;
}

export interface TelemetryData {
  metric: string;
  data: TelemetryPoint[];
}
```

---

## FE-031: Zod Schema

```typescript
// lib/validations/device.schema.ts
import { z } from 'zod';

export const deviceSchema = z.object({
  deviceId: z.string().min(1, 'Mã thiết bị là bắt buộc').max(50, 'Tối đa 50 ký tự'),
  deviceName: z.string().min(1, 'Tên thiết bị là bắt buộc').max(100, 'Tối đa 100 ký tự'),
  deviceType: z.string().min(1, 'Loại thiết bị là bắt buộc'),
  imei: z.string().max(20).optional().or(z.literal('')),
  customerId: z.coerce.number().optional(),
  vehicleId: z.coerce.number().optional(),
});

export type DeviceFormValues = z.infer<typeof deviceSchema>;

export const commandSchema = z.object({
  command: z.string().min(1, 'Lệnh là bắt buộc'),
  params: z.record(z.any()).optional(),
});

export type CommandFormValues = z.infer<typeof commandSchema>;
```

---

## FE-032: API Service

```typescript
// lib/api/devices.ts
import { apiClient } from './client';
import type { Device, DeviceDetail, DeviceFilters, DeviceSession, TelemetryData, DeviceCommand, DeviceError } from '@/features/devices/types';

export const deviceServices = {
  getList: (params?: DeviceFilters) =>
    apiClient.get('/devices', { params }).then((r) => r.data),

  getById: (deviceId: string) =>
    apiClient.get(`/devices/${deviceId}`).then((r) => r.data),

  create: (data: any) =>
    apiClient.post('/devices', data).then((r) => r.data),

  update: (data: { id: number } & Record<string, any>) => {
    const { id, ...body } = data;
    return apiClient.put(`/devices/${id}`, body).then((r) => r.data);
  },

  delete: (id: number) =>
    apiClient.delete(`/devices/${id}`).then((r) => r.data),

  getSessions: (deviceId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/devices/${deviceId}/sessions`, { params }).then((r) => r.data),

  getTelemetry: (deviceId: string, params: { metric: string; from: string; to: string }) =>
    apiClient.get(`/devices/${deviceId}/telemetry`, { params }).then((r) => r.data),

  sendCommand: (deviceId: string, data: { command: string; params?: Record<string, any> }) =>
    apiClient.post(`/devices/${deviceId}/command`, data).then((r) => r.data),

  getCommands: (deviceId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/devices/${deviceId}/commands`, { params }).then((r) => r.data),

  getErrors: (deviceId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/devices/${deviceId}/errors`, { params }).then((r) => r.data),
};
```

---

## FE-033: Hooks

```typescript
// features/devices/hooks/use-devices.ts
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import type { DeviceFilters } from '../types';

export function useDevices(filters?: DeviceFilters) {
  return useQuery({
    queryKey: ['devices', filters],
    queryFn: () => deviceServices.getList(filters),
  });
}
```

```typescript
// features/devices/hooks/use-device-detail.ts
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';

export function useDeviceDetail(deviceId: string | null) {
  return useQuery({
    queryKey: ['device', deviceId],
    queryFn: () => deviceServices.getById(deviceId!),
    enabled: !!deviceId,
  });
}
```

```typescript
// features/devices/hooks/use-create-device.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { toast } from 'sonner';

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deviceServices.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Thiết bị đã được tạo');
    },
    onError: (e: any) => toast.error('Không thể tạo thiết bị', { description: e.message }),
  });
}
```

```typescript
// features/devices/hooks/use-update-device.ts
// Same pattern as create, mutationFn: deviceServices.update, toast: 'Thiết bị đã được cập nhật'
```

```typescript
// features/devices/hooks/use-delete-device.ts
// Same pattern, mutationFn: (id: number) => deviceServices.delete(id), toast: 'Thiết bị đã được xóa'
```

```typescript
// features/devices/hooks/use-send-command.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { toast } from 'sonner';

export function useSendCommand(deviceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { command: string; params?: Record<string, any> }) =>
      deviceServices.sendCommand(deviceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-commands', deviceId] });
      toast.success('Lệnh đã được gửi');
    },
    onError: (e: any) => toast.error('Không thể gửi lệnh', { description: e.message }),
  });
}
```

---

## FE-03C: Real-time Hook

```typescript
// features/devices/hooks/use-device-realtime.ts
'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/components/providers/socket-provider';
import type { Device } from '../types';

export function useDeviceRealtime() {
  const socket = useSocket();
  const qc = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    socket.on('device:status', (data: { deviceId: string; status: string; lastSeenAt: string }) => {
      qc.setQueryData(['devices'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((d: Device) =>
            d.deviceId === data.deviceId
              ? { ...d, currentStatus: data.status, lastSeenAt: data.lastSeenAt }
              : d
          ),
        };
      });
    });

    socket.on('device:position', (data: { deviceId: string; lat: number; lon: number }) => {
      qc.setQueryData(['devices'], (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((d: Device) =>
            d.deviceId === data.deviceId
              ? { ...d, latitude: data.lat, longitude: data.lon }
              : d
          ),
        };
      });
    });

    return () => {
      socket.off('device:status');
      socket.off('device:position');
    };
  }, [socket, qc]);
}
```

---

## FE-034: Device Page

```tsx
// app/dashboard/devices/page.tsx
'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Cpu } from 'lucide-react';
import { getDeviceColumns } from '@/features/devices/components/device-columns';
import { DeviceForm } from '@/features/devices/components/device-form';
import { DeviceDetailSheet } from '@/features/devices/components/device-detail-sheet';
import { DeviceFilters } from '@/features/devices/components/device-filters';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { useDeleteDevice } from '@/features/devices/hooks/use-delete-device';
import { useDeviceRealtime } from '@/features/devices/hooks/use-device-realtime';
import type { Device, DeviceFilters as Filters } from '@/features/devices/types';

export default function DevicesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Device | null>(null);
  const [viewItem, setViewItem] = useState<Device | null>(null);
  const [deleteItem, setDeleteItem] = useState<Device | null>(null);
  const [filters, setFilters] = useState<Filters>({});

  const { data, isLoading } = useDevices(filters);
  const deleteMutation = useDeleteDevice();
  useDeviceRealtime();

  const columns = getDeviceColumns({
    onView: (item) => setViewItem(item),
    onEdit: (item) => setEditItem(item),
    onDelete: (item) => setDeleteItem(item),
  });

  return (
    <PageContainer
      pageTitle="Thiết bị"
      pageDescription="Quản lý các thiết bị IoT trong hệ thống"
      pageHeaderAction={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Thêm thiết bị
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        searchKey="deviceName"
        searchPlaceholder="Tìm thiết bị..."
        isLoading={isLoading}
        emptyIcon={<Cpu className="h-10 w-10" />}
        emptyTitle="Chưa có thiết bị"
        emptyDescription="Thêm thiết bị đầu tiên để bắt đầu giám sát"
        emptyAction={{ label: 'Thêm thiết bị', onClick: () => setCreateOpen(true) }}
        toolbar={<DeviceFilters filters={filters} onChange={setFilters} />}
      />

      <DeviceForm
        open={createOpen || !!editItem}
        onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditItem(null); } }}
        defaultValues={editItem}
      />

      <DeviceDetailSheet
        device={viewItem}
        open={!!viewItem}
        onOpenChange={(v) => { if (!v) setViewItem(null); }}
      />

      <ConfirmDialog
        open={!!deleteItem}
        title="Xóa thiết bị"
        description={`Bạn có chắc muốn xóa thiết bị ${deleteItem?.deviceName}?`}
        variant="destructive"
        confirmLabel="Xóa"
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => deleteMutation.mutate(deleteItem!.id, { onSuccess: () => setDeleteItem(null) })}
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
```

---

## FE-035: Device Columns

```tsx
// features/devices/components/device-columns.tsx
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { Device } from '../types';

const statusMap: Record<string, { label: string; variant: string }> = {
  running: { label: 'Đang chạy', variant: 'default' },
  stopped: { label: 'Dừng', variant: 'secondary' },
  disconnected: { label: 'Mất kết nối', variant: 'destructive' },
};

export function getDeviceColumns(actions: {
  onView: (d: Device) => void;
  onEdit: (d: Device) => void;
  onDelete: (d: Device) => void;
}): ColumnDef<Device>[] {
  return [
    {
      accessorKey: 'deviceId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Mã thiết bị" />,
    },
    {
      accessorKey: 'deviceName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tên" />,
    },
    {
      accessorKey: 'deviceType',
      header: 'Loại',
    },
    {
      accessorKey: 'currentStatus',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status = row.getValue('currentStatus') as string;
        const s = statusMap[status] || { label: status, variant: 'outline' };
        return <Badge variant={s.variant as any}>{s.label}</Badge>;
      },
    },
    {
      accessorKey: 'vehiclePlate',
      header: 'Phương tiện',
      cell: ({ row }) => row.getValue('vehiclePlate') || <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'firmwareVersion',
      header: 'Firmware',
      cell: ({ row }) => row.getValue('firmwareVersion') || '—',
    },
    {
      accessorKey: 'lastSeenAt',
      header: 'Lần cuối online',
      cell: ({ row }) => {
        const v = row.getValue('lastSeenAt') as string | null;
        return v ? formatDistanceToNow(new Date(v), { addSuffix: true, locale: vi }) : '—';
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => actions.onView(row.original)}>
              <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => actions.onDelete(row.original)}>
              <Trash2 className="mr-2 h-4 w-4" /> Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
```

---

## FE-036: Device Form

Follow pattern from `32-frontend-implementation.md` Section 1.3:
- Dialog (max-w-lg)
- react-hook-form + zodResolver(deviceSchema)
- Fields: deviceId (Input, disabled on edit), deviceName (Input), deviceType (Select), imei (Input), customerId (Select — fetch customer list), vehicleId (Select — fetch vehicle list)
- useEffect populate on edit
- useCreateDevice / useUpdateDevice mutations
- Loader2 spinner on submit
- Vietnamese labels: "Mã thiết bị", "Tên thiết bị", "Loại", "IMEI", "Khách hàng", "Phương tiện"

---

## FE-037: Device Detail Sheet

```tsx
// features/devices/components/device-detail-sheet.tsx
'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useDeviceDetail } from '../hooks/use-device-detail';
import { Skeleton } from '@/components/ui/skeleton';
import { DeviceTelemetryTab } from './device-telemetry-tab';
import { DeviceSessionsTab } from './device-sessions-tab';
import { DeviceCommandsTab } from './device-commands-tab';
import { DeviceErrorsTab } from './device-errors-tab';
import type { Device } from '../types';

interface Props {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceDetailSheet({ device, open, onOpenChange }: Props) {
  const { data: detail, isLoading } = useDeviceDetail(device?.deviceId ?? null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {device?.deviceName}
            {device && <Badge>{device.currentStatus}</Badge>}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : (
          <Tabs defaultValue="info" className="mt-4">
            <TabsList className="w-full">
              <TabsTrigger value="info">Thông tin</TabsTrigger>
              <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
              <TabsTrigger value="sessions">Phiên</TabsTrigger>
              <TabsTrigger value="commands">Lệnh</TabsTrigger>
              <TabsTrigger value="errors">Lỗi</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              {/* Info grid: deviceId, type, IMEI, firmware, vehicle, customer, runtime, last seen, coordinates */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <InfoRow label="Mã thiết bị" value={detail?.deviceId} />
                <InfoRow label="Loại" value={detail?.deviceType} />
                <InfoRow label="IMEI" value={detail?.imei} />
                <InfoRow label="Firmware" value={detail?.firmwareVersion} />
                <InfoRow label="Phương tiện" value={detail?.vehiclePlate} />
                <InfoRow label="Khách hàng" value={detail?.customerName} />
                <InfoRow label="Tổng runtime" value={formatRuntime(detail?.totalRuntimeSeconds)} />
                <InfoRow label="Lỗi cuối" value={detail?.lastErrorCode ? `Code ${detail.lastErrorCode}` : 'Không'} />
              </div>
            </TabsContent>

            <TabsContent value="telemetry">
              <DeviceTelemetryTab deviceId={device?.deviceId ?? ''} />
            </TabsContent>

            <TabsContent value="sessions">
              <DeviceSessionsTab deviceId={device?.deviceId ?? ''} />
            </TabsContent>

            <TabsContent value="commands">
              <DeviceCommandsTab deviceId={device?.deviceId ?? ''} />
            </TabsContent>

            <TabsContent value="errors">
              <DeviceErrorsTab deviceId={device?.deviceId ?? ''} />
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? '—'}</dd>
    </div>
  );
}

function formatRuntime(seconds?: number): string {
  if (!seconds) return '0 giờ';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} giờ ${m} phút`;
}
```

---

## FE-038: Telemetry Tab

- DateRangePicker (from/to) with presets: 1h, 6h, 24h, 7d
- Metric selector: vibration_rms, vibration_peak, temperature, battery_voltage
- recharts LineChart (ResponsiveContainer, XAxis time, YAxis value, Tooltip, Legend)
- useQuery + deviceServices.getTelemetry
- Loading: Skeleton chart placeholder
- Empty: "Không có dữ liệu telemetry trong khoảng thời gian này"

---

## FE-039: Sessions Tab

- DataTable (mini): startTime, endTime, duration (formatted), vibrationAvg, vibrationMax, status Badge
- useQuery + deviceServices.getSessions
- Pagination (server-side)

---

## FE-03A: Commands Tab

- Form (top): command Select (restart, configure, factory_reset, update_firmware, diagnostics) + params textarea (JSON) + Send Button
- useSendCommand mutation
- Command history DataTable: command, status Badge, sentAt, ackedAt, response

---

## FE-03B: Errors Tab

- DataTable (mini): errorCode, errorName, description, occurredAt, resolvedAt
- Status: Badge (active / resolved)
- useQuery + deviceServices.getErrors

---

## FE-03D: Device Filters

```tsx
// features/devices/components/device-filters.tsx
'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { DeviceFilters as Filters } from '../types';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function DeviceFilters({ filters, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Select
        value={filters.status ?? 'all'}
        onValueChange={(v) => onChange({ ...filters, status: v === 'all' ? undefined : v })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="running">Đang chạy</SelectItem>
          <SelectItem value="stopped">Dừng</SelectItem>
          <SelectItem value="disconnected">Mất kết nối</SelectItem>
        </SelectContent>
      </Select>

      {(filters.status) && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <X className="mr-1 h-3 w-3" /> Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
```

---

## FSD Structure After 4B

```
features/devices/
├── components/
│   ├── device-columns.tsx
│   ├── device-commands-tab.tsx
│   ├── device-detail-sheet.tsx
│   ├── device-errors-tab.tsx
│   ├── device-filters.tsx
│   ├── device-form.tsx
│   ├── device-sessions-tab.tsx
│   └── device-telemetry-tab.tsx
├── hooks/
│   ├── use-create-device.ts
│   ├── use-delete-device.ts
│   ├── use-device-detail.ts
│   ├── use-device-realtime.ts
│   ├── use-devices.ts
│   ├── use-send-command.ts
│   └── use-update-device.ts
└── types/
    └── index.ts
```

---

## Verification Checklist

- [ ] Device list page loads with DataTable, search, column visibility, pagination
- [ ] Status filter works (Đang chạy / Dừng / Mất kết nối)
- [ ] Create device: Dialog opens, form validates (Zod), success toast, table refreshes
- [ ] Edit device: Dialog pre-fills, update works, success toast
- [ ] Delete device: ConfirmDialog, destructive variant, success toast
- [ ] Device detail sheet: 5 tabs render correctly
- [ ] Telemetry tab: recharts chart with date range picker and metric selector
- [ ] Sessions tab: DataTable with session history
- [ ] Commands tab: send command form + history table
- [ ] Errors tab: DataTable with error codes
- [ ] Real-time: device status badge updates without page refresh
- [ ] Empty state: shows when no devices exist with "Thêm thiết bị" action button
- [ ] All text in Vietnamese
