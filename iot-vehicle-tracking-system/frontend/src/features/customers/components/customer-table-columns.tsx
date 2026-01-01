/**
 * Customer Table Columns Definition
 */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Customer, CustomerStatus, VerificationStatus } from '@/types';

const statusColors: Record<CustomerStatus, string> = {
    active: 'bg-green-500',
    suspended: 'bg-yellow-500',
    blacklisted: 'bg-red-500',
};

const verificationColors: Record<VerificationStatus, string> = {
    pending: 'bg-yellow-500',
    verified: 'bg-green-500',
    rejected: 'bg-red-500',
};

export const customerColumns: ColumnDef<Customer>[] = [
    {
        accessorKey: 'fullName',
        header: 'Full Name',
    },
    {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.getValue('email') || '-',
    },
    {
        accessorKey: 'phone',
        header: 'Phone',
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.getValue('status') as CustomerStatus;
            return (
                <Badge className={statusColors[status] || 'bg-gray-500'}>
                    {status}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'verificationStatus',
        header: 'Verification',
        cell: ({ row }) => {
            const status = row.getValue('verificationStatus') as VerificationStatus;
            return (
                <Badge className={verificationColors[status] || 'bg-gray-500'}>
                    {status}
                </Badge>
            );
        },
    },
    {
        accessorKey: 'totalRentals',
        header: 'Total Rentals',
        cell: ({ row }) => row.getValue('totalRentals') ?? 0,
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
