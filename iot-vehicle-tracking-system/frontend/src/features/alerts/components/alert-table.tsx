/**
 * Alert Table Component
 */
'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useAlerts } from '@/hooks/queries/use-alerts';
import { alertColumns } from './alert-table-columns';

export function AlertTable() {
  const router = useRouter();
  const { data, isLoading } = useAlerts();

  const handleRowClick = (alert: { id: number }) => {
    router.push(`/dashboard/alerts/${alert.id}`);
  };

  return (
    <DataTable
      columns={alertColumns}
      data={data?.data || []}
      isLoading={isLoading}
      onRowClick={handleRowClick}
    />
  );
}

