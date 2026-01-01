/**
 * Geofence Table Columns Definition
 */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Geofence, GeofenceType } from '@/types';

export const geofenceColumns: ColumnDef<Geofence>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as GeofenceType;
      return <Badge>{type}</Badge>;
    },
  },
  {
    accessorKey: 'isActive',
    header: 'Active',
    cell: ({ row }) => {
      const isActive = row.getValue('isActive') as boolean;
      return (
        <Badge className={isActive ? 'bg-green-500' : 'bg-gray-500'}>
          {isActive ? 'Yes' : 'No'}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'description',
    header: 'Description',
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

