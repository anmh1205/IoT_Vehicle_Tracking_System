/**
 * Customer Table Component
 */
'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useCustomers } from '@/hooks/queries/use-customers';
import { customerColumns } from './customer-table-columns';

export function CustomerTable() {
    const router = useRouter();
    const { data, isLoading } = useCustomers();

    const handleRowClick = (customer: { id: number }) => {
        router.push(`/dashboard/customers/${customer.id}`);
    };

    return (
        <DataTable
            columns={customerColumns}
            data={data?.data || []}
            isLoading={isLoading}
            onRowClick={handleRowClick}
        />
    );
}
