/**
 * Maintenance Table Component
 */
'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useMaintenance } from '@/hooks/queries/use-maintenance';
import { maintenanceColumns } from './maintenance-table-columns';

export function MaintenanceTable() {
  const router = useRouter();
  const { data, isLoading } = useMaintenance();

  const handleRowClick = (maintenance: { id: number }) => {
    router.push(`/dashboard/maintenance/${maintenance.id}`);
  };

  return (
    <DataTable
      columns={maintenanceColumns}
      data={data?.data || []}
      isLoading={isLoading}
      onRowClick={handleRowClick}
    />
  );
}
