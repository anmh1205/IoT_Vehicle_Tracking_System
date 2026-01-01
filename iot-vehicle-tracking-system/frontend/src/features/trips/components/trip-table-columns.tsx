/**
 * Trip Table Columns Definition
 */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Trip, TripStatus } from '@/types';

const statusColors: Record<TripStatus, string> = {
  active: 'bg-blue-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
};

export const tripColumns: ColumnDef<Trip>[] = [
  {
    accessorKey: 'id',
    header: 'Trip ID',
  },
  {
    accessorKey: 'vehicleId',
    header: 'Vehicle ID',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as TripStatus;
      return (
        <Badge className={statusColors[status] || 'bg-gray-500'}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'startTime',
    header: 'Start Time',
    cell: ({ row }) => {
      const date = new Date(row.getValue('startTime'));
      return date.toLocaleString();
    },
  },
  {
    accessorKey: 'endTime',
    header: 'End Time',
    cell: ({ row }) => {
      const endTime = row.getValue('endTime') as string | undefined;
      return endTime ? new Date(endTime).toLocaleString() : '-';
    },
  },
  {
    accessorKey: 'distance',
    header: 'Distance (km)',
    cell: ({ row }) => {
      const distance = row.getValue('distance') as number | undefined;
      return distance ? `${distance.toFixed(2)} km` : '-';
    },
  },
];

