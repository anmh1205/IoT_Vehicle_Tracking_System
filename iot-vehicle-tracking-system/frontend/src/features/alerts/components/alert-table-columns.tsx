/**
 * Alert Table Columns Definition
 */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Alert, AlertType, AlertSeverity, AlertStatus } from '@/types';

const severityColors: Record<AlertSeverity, string> = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-600',
};

const statusColors: Record<AlertStatus, string> = {
  new: 'bg-blue-500',
  acknowledged: 'bg-yellow-500',
  resolved: 'bg-green-500',
};

export const alertColumns: ColumnDef<Alert>[] = [
  {
    accessorKey: 'id',
    header: 'Alert ID',
  },
  {
    accessorKey: 'vehicleId',
    header: 'Vehicle ID',
  },
  {
    accessorKey: 'type',
    header: 'Type',
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.getValue('severity') as AlertSeverity;
      return (
        <Badge className={severityColors[severity] || 'bg-gray-500'}>
          {severity}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as AlertStatus;
      return (
        <Badge className={statusColors[status] || 'bg-gray-500'}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'message',
    header: 'Message',
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return date.toLocaleString();
    },
  },
];

