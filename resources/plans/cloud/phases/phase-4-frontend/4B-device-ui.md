# Phase 4B — Device Management UI

> Implement Device CRUD, DataTable with filters, Device Detail Sheet (5 tabs), real-time status, telemetry charts.
> FSD structure: `features/devices/{components,hooks,types}/`

---

## CRITICAL RULES

```
1. Directory: features/devices/components/, features/devices/hooks/, features/devices/types/
2. Page: PageContainer + DataTable pattern (from 4A)
3. Detail: Dialog component (KHÔNG Sheet) — 90vw × 90vh — 6 tabs
4. Charts: recharts (KHÔNG ECharts)
5. Icons: lucide-react
6. ALL inline code patterns PHẢI follow CHÍNH XÁC
7. Real-time: Socket.IO via useSocket() hook from providers
8. RBAC: Tab visibility controlled by useRoleAccess()
9. Context: DeviceDetailModal uses React Context provider pattern
```

---

## Task List

| ID      | Description            | Files                                                                                |
| ------- | ---------------------- | ------------------------------------------------------------------------------------ |
| FE-030  | Device types           | `features/devices/types/index.ts`                                                    |
| FE-031  | Device Zod schema      | `lib/validations/device.schema.ts`                                                   |
| FE-032  | Device API service     | `lib/api/devices.ts`                                                                 |
| FE-033  | Device hooks (10+)     | `features/devices/hooks/*.ts`                                                        |
| FE-034  | Device page            | `app/dashboard/devices/page.tsx`                                                     |
| FE-035  | Device columns         | `features/devices/components/device-columns.tsx`                                     |
| FE-036  | Device form            | `features/devices/components/device-form.tsx`                                        |
| FE-037  | Device detail modal    | `features/devices/components/device-detail-modal/index.tsx`                          |
| FE-037B | Modal context provider | `features/devices/components/device-detail-modal/modal-context.tsx`                  |
| FE-037C | Modal container        | `features/devices/components/device-detail-modal/modal-container.tsx`                |
| FE-038  | Overview tab           | `features/devices/components/device-detail-modal/overview-tab.tsx`                   |
| FE-038B | Sessions tab           | `features/devices/components/device-detail-modal/sessions-tab.tsx`                   |
| FE-038C | Error codes tab        | `features/devices/components/device-detail-modal/error-codes-tab.tsx`                |
| FE-038D | Runtime chart tab      | `features/devices/components/device-detail-modal/runtime-tab.tsx`                    |
| FE-038E | Vibration chart tab    | `features/devices/components/device-detail-modal/vibration-tab.tsx`                  |
| FE-038F | Settings tab           | `features/devices/components/device-detail-modal/settings-tab.tsx`                   |
| FE-039  | Session chart dialog   | `features/devices/components/device-detail-modal/session-vibration-chart-dialog.tsx` |
| FE-03A  | Export modal           | `features/devices/components/export-modal.tsx`                                       |
| FE-03B  | Device card            | `features/devices/components/device-card.tsx`                                        |
| FE-03C  | Device grid            | `features/devices/components/device-grid.tsx`                                        |
| FE-03D  | Device stats bar       | `features/devices/components/device-stats-bar.tsx`                                   |
| FE-03E  | Real-time hook         | `features/devices/hooks/use-device-realtime.ts`                                      |
| FE-03F  | Device filters         | `features/devices/components/device-filters.tsx`                                     |

---

## Backend API Contract

```
GET    /api/v1/devices                    ?page&limit&status&search&customerId
GET    /api/v1/devices/:deviceId          → DeviceDetail
POST   /api/v1/devices                    { deviceId, deviceName, deviceType, imei, ... }
PUT    /api/v1/devices/:id                { deviceName, deviceType, ... }
DELETE /api/v1/devices/:id
GET    /api/v1/devices/:deviceId/sessions ?page&limit
GET    /api/v1/devices/:deviceId/error-codes ?status&type&page&limit
GET    /api/v1/devices/:deviceId/runtime-chart ?range=7d|30d|90d|1y
GET    /api/v1/devices/:deviceId/vibration-chart ?period=1h|6h|24h|7d
PUT    /api/v1/devices/:deviceId/settings { requestInterval, vibrationThreshold }
POST   /api/v1/devices/:deviceId/command  { command, params }
GET    /api/v1/devices/:deviceId/commands ?page&limit
GET    /api/v1/devices/:deviceId/errors   ?page&limit
POST   /api/v1/exports                   { entityType, deviceId, from, to, format }
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

export interface RuntimeChartData {
  data: { date: string; hours: number }[];
}

export interface VibrationChartData {
  data: { timestamp: string; rms: number; peak: number }[];
}

export interface ErrorCode {
  code: string;
  name: string;
  description: string;
  count: number;
  lastOccurred: string;
  type: 'critical' | 'warning' | 'info';
}

export interface DeviceSettings {
  requestInterval: number;
  alertThresholds: Record<string, number>;
  firmwareVersion: string;
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

  getErrorCodes: (deviceId: string, params?: { page?: number; limit?: number; type?: string }) =>
    apiClient.get(`/devices/${deviceId}/error-codes`, { params }).then((r) => r.data),

  getRuntimeChart: (deviceId: string, params: { range: '7d' | '30d' | '90d' }) =>
    apiClient.get(`/devices/${deviceId}/runtime-chart`, { params }).then((r) => r.data),

  getVibrationChart: (deviceId: string, params: { period: '1h' | '6h' | '24h' | '7d' }) =>
    apiClient.get(`/devices/${deviceId}/vibration-chart`, { params }).then((r) => r.data),

  sendCommand: (deviceId: string, data: { command: string; params?: Record<string, any> }) =>
    apiClient.post(`/devices/${deviceId}/command`, data).then((r) => r.data),

  getCommands: (deviceId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/devices/${deviceId}/commands`, { params }).then((r) => r.data),

  getErrors: (deviceId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/devices/${deviceId}/errors`, { params }).then((r) => r.data),

  getSettings: (deviceId: string) =>
    apiClient.get(`/devices/${deviceId}/settings`).then((r) => r.data),

  updateSettings: (deviceId: string, data: any) =>
    apiClient.put(`/devices/${deviceId}/settings`, data).then((r) => r.data),

  createExport: (data: { deviceId: string; format: string; dateRange: { from: string; to: string } }) =>
    apiClient.post('/export', data).then((r) => r.data),
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

```typescript
// features/devices/hooks/use-device-sessions.ts
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';

export function useDeviceSessions(deviceId: string | null, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['device-sessions', deviceId, params],
    queryFn: () => deviceServices.getSessions(deviceId!, params),
    enabled: !!deviceId,
  });
}
```

```typescript
// features/devices/hooks/use-device-error-codes.ts
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';

export function useDeviceErrorCodes(deviceId: string | null, params?: { page?: number; limit?: number; type?: string }) {
  return useQuery({
    queryKey: ['device-errors', deviceId, params],
    queryFn: () => deviceServices.getErrorCodes(deviceId!, params),
    enabled: !!deviceId,
  });
}
```

```typescript
// features/devices/hooks/use-device-runtime-chart.ts
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';

export function useDeviceRuntimeChart(deviceId: string | null, range: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: ['device-runtime-chart', deviceId, range],
    queryFn: () => deviceServices.getRuntimeChart(deviceId!, { range }),
    enabled: !!deviceId,
  });
}
```

```typescript
// features/devices/hooks/use-device-vibration-chart.ts
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';

export function useDeviceVibrationChart(deviceId: string | null, period: '1h' | '6h' | '24h' | '7d' = '24h') {
  return useQuery({
    queryKey: ['device-vibration-chart', deviceId, period],
    queryFn: () => deviceServices.getVibrationChart(deviceId!, { period }),
    enabled: !!deviceId,
  });
}
```

```typescript
// features/devices/hooks/use-update-device-settings.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { toast } from 'sonner';

export function useUpdateDeviceSettings(deviceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => deviceServices.updateSettings(deviceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device', deviceId] });
      toast.success('Cài đặt đã được cập nhật');
    },
    onError: (e: any) => toast.error('Không thể cập nhật cài đặt', { description: e.message }),
  });
}
```

```typescript
// features/devices/hooks/use-create-export.ts
import { useMutation } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { toast } from 'sonner';

export function useCreateExport() {
  return useMutation({
    mutationFn: deviceServices.createExport,
    onSuccess: () => toast.success('Yêu cầu xuất dữ liệu đã được tạo'),
    onError: (e: any) => toast.error('Không thể tạo yêu cầu xuất', { description: e.message }),
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
import { DeviceDetailModal } from '@/features/devices/components/device-detail-modal';
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

      <DeviceDetailModal
        deviceId={viewItem?.deviceId ?? null}
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

## FE-037: Device Detail Modal (Dialog, NOT Sheet)

> **CRITICAL**: Dùng `Dialog` (KHÔNG `Sheet`), kích thước 90vw × 90vh.
> Structure follows `device-detail-modal/` directory pattern from IVM26.

### File Structure

```
features/devices/components/device-detail-modal/
├── index.tsx              ← Main Dialog component
├── modal-context.tsx      ← React Context provider for all data/handlers
├── modal-container.tsx    ← Data fetching wrapper + context provider
├── overview-tab.tsx       ← Tab "Tổng quan"
├── sessions-tab.tsx       ← Tab "Phiên chạy"
├── error-codes-tab.tsx    ← Tab "Mã lỗi"
├── runtime-tab.tsx        ← Tab "Biểu đồ thời gian"
├── vibration-tab.tsx      ← Tab "Biểu đồ rung" — RBAC: canViewSystemInfo
├── settings-tab.tsx       ← Tab "Cài đặt" — RBAC: canEditDevice
├── session-vibration-chart-dialog.tsx ← Nested dialog for session vibration detail
└── empty-state.tsx        ← Empty state component
```

### FE-037B: Modal Context (`modal-context.tsx`)

```typescript
interface DeviceDetailModalContextValue {
  // Data
  detail: DeviceDetail | null;
  loading: boolean;
  error: Error | null;

  // Sessions (paginated, infinite scroll)
  sessions: DeviceSession[];
  sessionsLoading: boolean;
  sessionsHasMore: boolean;
  onSessionsLoadMore: () => void;

  // Error codes (paginated, filtered)
  errorCodes: ErrorCode[];
  errorCodesPagination: Pagination;
  errorCodesStatus: string;
  errorCodesType: string;
  onErrorCodesPageChange: (page: number) => void;
  onErrorCodesStatusChange: (status: string) => void;
  onErrorCodesTypeChange: (type: string) => void;

  // Charts
  runtimeChart: RuntimeChartData | null;
  runtimeRange: '7d' | '30d' | '90d' | '1y';
  onRuntimeRangeChange: (range: string) => void;
  vibrationChart: VibrationChartData | null;
  vibrationPeriod: '1h' | '6h' | '24h' | '7d';
  onVibrationPeriodChange: (period: string) => void;

  // Actions
  onUpdateSettings: (data: any) => Promise<void>;
  onDeleteDevice: () => Promise<void>;

  // Tab state
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ModalContext = createContext<DeviceDetailModalContextValue | null>(null);
export const useModalContext = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModalContext must be used inside ModalProvider');
  return ctx;
};
```

### FE-037C: Modal Container (`modal-container.tsx`)

```tsx
// Fetches all data, subscribes to realtime, wraps children in ModalContext.Provider
export function ModalContainer({ deviceId, children }: Props) {
  const detail = useDeviceDetail(deviceId);
  const sessions = useDeviceSessions(deviceId);
  const errorCodes = useDeviceErrorCodes(deviceId, filters);
  const runtimeChart = useDeviceRuntimeChart(deviceId, runtimeRange);
  const vibrationChart = useDeviceVibrationChart(deviceId, vibrationPeriod);
  const updateSettings = useUpdateDeviceSettings(deviceId);

  // Realtime subscriptions
  useRealtimeSubscription({
    event: 'device.status.changed',
    handler: (e) => { /* merge into local state; invalidate queries */ },
  });
  useRealtimeSubscription({
    event: 'device.sessions.updated',
    handler: () => { queryClient.invalidateQueries({ queryKey: ['device-sessions'] }); },
  });

  return <ModalContext.Provider value={contextValue}>{children}</ModalContext.Provider>;
}
```

### FE-037: Main Dialog (`index.tsx`)

```tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useRoleAccess } from '@/hooks/use-role-access';
import { ModalContainer } from './modal-container';
import { useModalContext } from './modal-context';
import { OverviewTab } from './overview-tab';
import { SessionsTab } from './sessions-tab';
import { ErrorCodesTab } from './error-codes-tab';
import { RuntimeTab } from './runtime-tab';
import { VibrationTab } from './vibration-tab';
import { SettingsTab } from './settings-tab';

interface Props {
  deviceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceDetailModal({ deviceId, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-y-auto">
        {deviceId && (
          <ModalContainer deviceId={deviceId}>
            <ModalContent />
          </ModalContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModalContent() {
  const { detail, loading, activeTab, onTabChange } = useModalContext();
  const { canViewSystemInfo, canEditDevice } = useRoleAccess();

  if (loading) return <SkeletonGrid />;

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            {/* Status icon with gradient bg */}
            <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${statusGradient}`} />
            {detail?.deviceName}
            <Badge>{statusLabel}</Badge>
          </DialogTitle>
          <ExportDropdown deviceId={detail?.deviceId} />
        </div>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={onTabChange} className="mt-4">
        <TabsList className="w-full">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="sessions">Phiên chạy</TabsTrigger>
          <TabsTrigger value="errors">Mã lỗi</TabsTrigger>
          <TabsTrigger value="runtime">Biểu đồ thời gian</TabsTrigger>
          {canViewSystemInfo && <TabsTrigger value="vibration">Biểu đồ rung</TabsTrigger>}
          {canEditDevice && <TabsTrigger value="settings">Cài đặt</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="sessions"><SessionsTab /></TabsContent>
        <TabsContent value="errors"><ErrorCodesTab /></TabsContent>
        <TabsContent value="runtime"><RuntimeTab /></TabsContent>
        {canViewSystemInfo && <TabsContent value="vibration"><VibrationTab /></TabsContent>}
        {canEditDevice && <TabsContent value="settings"><SettingsTab /></TabsContent>}
      </Tabs>
    </>
  );
}
```

---

## FE-038: Overview Tab

- Device info grid (2 columns): IMEI, firmware, customer, vehicle, created date, last seen
- Runtime stats cards: today / week / month / quarter / year / total (runtime hours)
- Realtime data section: current vibration, battery voltage, temperature
- All data consumed from `useModalContext()`

---

## FE-038B: Sessions Tab

- Session cards list with "Tải thêm" (load more) button pattern
- Each card: start time, end time, duration, vibration stats (avg/max/rms)
- Click card → opens `SessionVibrationChartDialog` (FE-039)
- Empty: Clock icon + "Chưa có phiên chạy nào"
- Data from `useModalContext().sessions`

---

## FE-038C: Error Codes Tab

- Filter bar: status Select (active/resolved), type Select (all/critical/warning)
- DataTable with server-side pagination: error code, name, description, count, last occurred, status Badge
- Data from `useModalContext().errorCodes`

---

## FE-038D: Runtime Chart Tab

- Range selector buttons: 7d / 30d / 90d / 1y
- recharts BarChart: X-axis = date, Y-axis = runtime hours
- ResponsiveContainer, XAxis, YAxis, Tooltip, Bar
- Data from `useModalContext().runtimeChart`

---

## FE-038E: Vibration Chart Tab (RBAC: canViewSystemInfo)

- Period selector buttons: 1h / 6h / 24h / 7d
- recharts LineChart: X-axis = timestamp, Y-axis = vibration value
- Dashed reference line at threshold value
- Data from `useModalContext().vibrationChart`

---

## FE-038F: Settings Tab (RBAC: canEditDevice)

- Name/ID form section (React Hook Form + Zod `deviceSettingsSchema`)
- Settings form: requestInterval (number), vibrationThreshold (number)
- Save button with `useUpdateDeviceSettings` mutation
- Danger zone: delete device with ConfirmDialog

---

## FE-039: Session Vibration Chart Dialog

- Nested Dialog triggered from Sessions Tab card click
- Shows recharts LineChart: vibration values over session duration
- Session info header: duration, avg/max/rms stats
- Close button returns to Sessions Tab

---

## FE-03A: Export Modal

- Nested Dialog triggered from header export dropdown
- Fields: date range (DateRangePicker), export type (sessions/errors/telemetry), format (CSV/Excel)
- Submit triggers `POST /exports` job
- Toast: "Đang tạo báo cáo..."




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
