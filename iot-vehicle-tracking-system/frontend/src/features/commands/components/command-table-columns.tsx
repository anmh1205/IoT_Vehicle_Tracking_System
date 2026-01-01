/**
 * Command Table Columns Definition
 */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Command, CommandStatus, CommandType } from '@/types';

const statusColors: Record<CommandStatus, string> = {
    pending: 'bg-yellow-500',
    sent: 'bg-blue-500',
    delivered: 'bg-indigo-500',
    executed: 'bg-green-500',
    failed: 'bg-red-500',
};

const typeLabels: Record<CommandType, string> = {
    engine_on: 'Engine On',
    engine_off: 'Engine Off',
    lock: 'Lock',
    unlock: 'Unlock',
    locate: 'Locate',
    reboot: 'Reboot',
    update_config: 'Update Config',
};

export const commandColumns: ColumnDef<Command>[] = [
    {
        accessorKey: 'id',
        header: 'ID',
    },
    {
        accessorKey: 'deviceId',
        header: 'Device ID',
    },
    {
        accessorKey: 'vehicleId',
        header: 'Vehicle ID',
    },
    {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => {
            const type = row.getValue('type') as CommandType;
            return (
                <Badge variant="outline">
                    {typeLabels[type] || type}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as CommandStatus;
            return (
                <Badge className={statusColors[status] || 'bg-gray-500'}>
                    {status}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'sentAt',
        header: 'Sent At',
        cell: ({ row }) => {
            const date = row.getValue('sentAt') as string | undefined;
            return date ? new Date(date).toLocaleString() : '-';
        },
    },
    {
        accessorKey: 'executedAt',
        header: 'Executed At',
        cell: ({ row }) => {
            const date = row.getValue('executedAt') as string | undefined;
            return date ? new Date(date).toLocaleString() : '-';
        },
    },
];
