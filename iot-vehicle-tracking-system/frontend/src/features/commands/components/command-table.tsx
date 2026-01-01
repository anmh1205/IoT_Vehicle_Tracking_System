/**
 * Command Table Component
 */
'use client';

import { DataTable } from '@/components/ui/table/data-table';
import { useCommands } from '@/hooks/queries/use-commands';
import { commandColumns } from './command-table-columns';

export function CommandTable() {
    const { data, isLoading } = useCommands();

    return (
        <DataTable
            columns={commandColumns}
            data={data?.data || []}
            isLoading={isLoading}
        />
    );
}
