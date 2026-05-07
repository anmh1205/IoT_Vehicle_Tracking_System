'use client';

import type { Dispatch, SetStateAction } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Device } from '@/features/devices/types';
import type { FirmwareRecord } from '@/lib/api/firmware';
import { DEVICE_STATUS_LABELS, formatDateTime, getFirmwareDisplayVersion } from './firmware-utils';

export const normalizeFirmwareAssignmentVersion = (value: string | null | undefined) =>
  String(value ?? '')
    .trim()
    .replace(/^v/i, '')
    .toLowerCase();

export type FirmwareAssignmentAction = {
  device: Device;
  mode: 'stable' | 'fixed';
  firmware: FirmwareRecord | null;
};

const getDeviceAssignmentLabel = (device: Device, activeFirmware: FirmwareRecord | null) => {
  if (!device.targetFirmwareVersion) {
    return activeFirmware
      ? `${getFirmwareDisplayVersion(activeFirmware.version)} • theo stable`
      : 'Theo stable • chưa có bản stable';
  }

  return `${getFirmwareDisplayVersion(device.targetFirmwareVersion)} • bản cố định`;
};

export const getFirmwareAssignmentColumns = ({
  activeFirmware,
  assigningDeviceId,
  firmwares,
  fixedSelectionByDevice,
  setFixedSelectionByDevice,
  onAssign,
}: {
  activeFirmware: FirmwareRecord | null;
  assigningDeviceId?: string | null;
  firmwares: FirmwareRecord[];
  fixedSelectionByDevice: Record<string, string>;
  setFixedSelectionByDevice: Dispatch<SetStateAction<Record<string, string>>>;
  onAssign: (action: FirmwareAssignmentAction) => void;
}): ColumnDef<Device>[] => [
  {
    accessorKey: 'deviceName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Thiết bị" />,
    meta: { label: 'Thiết bị' },
    cell: ({ row }) => (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{row.original.deviceName || row.original.deviceId}</p>
          <Badge variant="outline">
            {DEVICE_STATUS_LABELS[row.original.currentStatus] ?? row.original.currentStatus}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{row.original.deviceId}</p>
        <p className="text-xs text-muted-foreground">
          {[row.original.vehiclePlate, row.original.customerName].filter(Boolean).join(' • ') ||
            'Chưa gắn xe hoặc khách hàng'}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'firmwareVersion',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Firmware hiện tại" />,
    meta: { label: 'Firmware hiện tại' },
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium">{getFirmwareDisplayVersion(row.original.firmwareVersion)}</p>
        <p className="text-xs text-muted-foreground">
          Cập nhật {row.original.lastSeenAt ? formatDateTime(row.original.lastSeenAt) : 'chưa có timestamp'}
        </p>
      </div>
    ),
  },
  {
    id: 'policy',
    header: 'Chính sách đích',
    meta: { label: 'Chính sách đích' },
    cell: ({ row }) => {
      const desiredVersion = row.original.targetFirmwareVersion ?? activeFirmware?.version ?? null;
      const drifted =
        desiredVersion !== null &&
        normalizeFirmwareAssignmentVersion(row.original.firmwareVersion) !==
          normalizeFirmwareAssignmentVersion(desiredVersion);

      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={row.original.targetFirmwareVersion ? 'outline' : 'secondary'}>
              {row.original.targetFirmwareVersion ? 'Bản cố định' : 'Theo stable'}
            </Badge>
            {drifted ? <Badge variant="destructive">Chưa đúng bản mục tiêu</Badge> : null}
          </div>
          <p className="text-sm">{getDeviceAssignmentLabel(row.original, activeFirmware)}</p>
        </div>
      );
    },
  },
  {
    id: 'actions',
    enableSorting: false,
    meta: { label: 'Thao tác' },
    cell: ({ row }) => {
      const selectedFixedId = fixedSelectionByDevice[row.original.deviceId] ?? '';
      const selectedFixedFirmware = firmwares.find(
        (firmware) => String(firmware.id) === selectedFixedId,
      );
      const isStableMode = !row.original.targetFirmwareVersion;
      const isAssigning = assigningDeviceId === row.original.deviceId;

      return (
        <div className="grid min-w-[18rem] gap-2">
          <Button
            type="button"
            variant={isStableMode ? 'default' : 'outline'}
            disabled={isAssigning || !activeFirmware}
            onClick={() =>
              onAssign({
                device: row.original,
                mode: 'stable',
                firmware: activeFirmware,
              })
            }
          >
            {isAssigning && isStableMode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Theo bản stable chung
          </Button>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Select
              value={selectedFixedId || undefined}
              onValueChange={(value) =>
                setFixedSelectionByDevice((current) => ({
                  ...current,
                  [row.original.deviceId]: value,
                }))
              }
              disabled={isAssigning}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn bản firmware cố định" />
              </SelectTrigger>
              <SelectContent>
                {firmwares.map((firmware) => (
                  <SelectItem key={firmware.id} value={String(firmware.id)}>
                    {getFirmwareDisplayVersion(firmware.version)}
                    {firmware.isActive ? ' • stable' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              disabled={isAssigning || !selectedFixedFirmware}
              onClick={() =>
                onAssign({
                  device: row.original,
                  mode: 'fixed',
                  firmware: selectedFixedFirmware ?? null,
                })
              }
            >
              {isAssigning && !isStableMode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Gán bản này
            </Button>
          </div>
        </div>
      );
    },
  },
];
