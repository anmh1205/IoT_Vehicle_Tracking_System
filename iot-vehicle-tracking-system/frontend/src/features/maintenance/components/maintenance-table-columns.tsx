/**
 * Maintenance Table Columns Definition
 */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Maintenance, MaintenanceStatus, MaintenanceType } from '@/types';

const statusColors: Record<MaintenanceStatus, string> = {
    scheduled: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    completed: 'bg-green-500',
    cancelled: 'bg-gray-500',
};

const typeLabels: Record<MaintenanceType, string> = {
    oil_change: 'Oil Change',
    tire_rotation: 'Tire Rotation',
    brake_service: 'Brake Service',
    inspection: 'Inspection',
    repair: 'Repair',
    other: 'Other',
};

export const maintenanceColumns: ColumnDef<Maintenance>[] = [
    {
        accessorKey: 'id',
        header: 'ID',
    },
    {
        accessorKey: 'vehicleId',
        header: 'Vehicle ID',
    },
    {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
            const type = row.getValue('type') as MaintenanceType;
            return typeLabels[type] || type;
        },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as MaintenanceStatus;
            return (
                <Badge className={statusColors[status] || 'bg-gray-500'}>
                    {status.replace('_', ' ')}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'scheduledDate',
        header: 'Scheduled',
        cell: ({ row }) => {
            const date = row.getValue('scheduledDate') as string;
            return date ? new Date(date).toLocaleDateString() : '-';
        },
    },
    {
        accessorKey: 'cost',
        header: 'Cost',
        cell: ({ row }) => {
            const cost = row.getValue('cost') as number | undefined;
            return cost ? `$${cost.toFixed(2)}` : '-';
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
