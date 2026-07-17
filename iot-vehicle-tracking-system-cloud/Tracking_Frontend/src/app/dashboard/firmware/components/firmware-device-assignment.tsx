'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import { DataTable } from '@/components/common/data-table';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Device } from '@/features/devices/types';
import type { FirmwareRecord } from '@/lib/api/firmware';
import {
  getFirmwareAssignmentColumns,
  normalizeFirmwareAssignmentVersion,
  type FirmwareAssignmentAction,
} from './firmware-device-assignment-columns';
import {
  DEVICE_STATUS_FILTER_OPTIONS,
  getFirmwareDisplayVersion,
  type FirmwareDeviceStatusFilter,
} from './firmware-utils';

export type { FirmwareAssignmentAction };

export const FirmwareDeviceAssignment = ({
  devices,
  firmwares,
  activeFirmware,
  isLoading = false,
  isLoadingMore = false,
  assigningDeviceId,
  totalDevices,
  loadedDevices,
  hasMore,
  search,
  statusFilter,
  onLoadMore,
  onSearchChange,
  onStatusChange,
  onAssign,
}: {
  devices: Device[];
  firmwares: FirmwareRecord[];
  activeFirmware: FirmwareRecord | null;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  assigningDeviceId?: string | null;
  totalDevices: number;
  loadedDevices: number;
  hasMore: boolean;
  search: string;
  statusFilter: FirmwareDeviceStatusFilter;
  onLoadMore: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: FirmwareDeviceStatusFilter) => void;
  onAssign: (action: FirmwareAssignmentAction) => void;
}) => {
  const [fixedSelectionByDevice, setFixedSelectionByDevice] = useState<Record<string, string>>({});

  useEffect(() => {
    const nextSelections = Object.fromEntries(
      devices.map((device) => {
        const matchedFirmware = firmwares.find(
          (firmware) =>
            normalizeFirmwareAssignmentVersion(firmware.version) ===
            normalizeFirmwareAssignmentVersion(device.targetFirmwareVersion),
        );
        return [device.deviceId, matchedFirmware ? String(matchedFirmware.id) : ''];
      }),
    );

    setFixedSelectionByDevice((current) => ({ ...current, ...nextSelections }));
  }, [devices, firmwares]);

  const stableCount = devices.filter((device) => !device.targetFirmwareVersion).length;
  const fixedCount = Math.max(devices.length - stableCount, 0);
  const driftCount = devices.filter((device) => {
    const desiredVersion = device.targetFirmwareVersion ?? activeFirmware?.version ?? null;
    if (!desiredVersion) {
      return false;
    }

    return (
      normalizeFirmwareAssignmentVersion(device.firmwareVersion) !==
      normalizeFirmwareAssignmentVersion(desiredVersion)
    );
  }).length;

  const columns = useMemo(
    () =>
      getFirmwareAssignmentColumns({
        activeFirmware,
        assigningDeviceId,
        firmwares,
        fixedSelectionByDevice,
        setFixedSelectionByDevice,
        onAssign,
      }),
    [activeFirmware, assigningDeviceId, firmwares, fixedSelectionByDevice, onAssign],
  );

  return (
    <Card className="border-muted/70">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="text-base">Chính sách firmware theo thiết bị</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Mỗi thiết bị có thể theo bản stable chung hoặc bị pin vào một bản cố định. Lưu chính
              sách sẽ đồng thời cập nhật firmware mục tiêu và gửi OTA nếu thiết bị chưa chạy đúng
              bản.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              Trang này theo stable: {stableCount}
            </Badge>
            <Badge variant="outline">
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Trang này bản cố định: {fixedCount}
            </Badge>
            <Badge variant={driftCount > 0 ? 'destructive' : 'outline'}>
              <TriangleAlert className="mr-1.5 h-3.5 w-3.5" />
              Trang này lệch mục tiêu: {driftCount}
            </Badge>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px] xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Tìm theo mã thiết bị, tên, biển số hoặc khách hàng..."
              className="pl-9"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => onStatusChange(value as FirmwareDeviceStatusFilter)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Kết nối thiết bị" />
            </SelectTrigger>
            <SelectContent>
              {DEVICE_STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Stable hiện tại:{' '}
            <span className="font-semibold text-foreground">
              {activeFirmware ? getFirmwareDisplayVersion(activeFirmware.version) : 'Chưa có'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <DataTable
          columns={columns}
          data={devices}
          pagination={false}
          isLoading={isLoading}
          emptyTitle="Chưa có thiết bị phù hợp"
          emptyDescription="Thử đổi từ khóa, bộ lọc kết nối hoặc kiểm tra lại nguồn dữ liệu thiết bị."
        />

        <InfiniteScrollTrigger
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          loadedCount={loadedDevices}
          totalCount={totalDevices}
          itemLabel="thiết bị"
        />
      </CardContent>
    </Card>
  );
};
