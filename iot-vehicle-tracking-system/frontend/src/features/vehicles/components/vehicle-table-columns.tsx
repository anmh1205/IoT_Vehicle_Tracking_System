/**
 * Vehicle Table Columns Definition
 */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Vehicle, VehicleStatus } from '@/types';

const statusColors: Record<VehicleStatus, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  maintenance: 'bg-yellow-500',
  retired: 'bg-red-500',
};

export const vehicleColumns: ColumnDef<Vehicle>[] = [
  {
    accessorKey: 'vehicleId',
    header: 'Vehicle ID',
  },
  {
    accessorKey: 'plateNumber',
    header: 'Plate Number',
  },
  {
    accessorKey: 'brand',
    header: 'Brand',
  },
  {
    accessorKey: 'model',
    header: 'Model',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as VehicleStatus;
      return (
        <Badge className={statusColors[status] || 'bg-gray-500'}>
          {status}
        </Badge>
      );
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

