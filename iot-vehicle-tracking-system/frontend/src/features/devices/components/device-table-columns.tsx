/**
 * Device Table Columns Definition
 */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Device, DeviceStatus } from '@/types';

const statusColors: Record<DeviceStatus, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  offline: 'bg-red-500',
  error: 'bg-red-600',
};

export const deviceColumns: ColumnDef<Device>[] = [
  {
    accessorKey: 'deviceId',
    header: 'Device ID',
  },
  {
    accessorKey: 'imei',
    header: 'IMEI',
  },
  {
    accessorKey: 'deviceType',
    header: 'Type',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as DeviceStatus;
      return (
        <Badge className={statusColors[status] || 'bg-gray-500'}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'lastSeen',
    header: 'Last Seen',
    cell: ({ row }) => {
      const lastSeen = row.getValue('lastSeen') as string | undefined;
      return lastSeen ? new Date(lastSeen).toLocaleString() : '-';
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return date.toLocaleDateString();
    },
  },
];

