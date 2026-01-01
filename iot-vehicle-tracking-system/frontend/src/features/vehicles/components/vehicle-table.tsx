/**
 * Vehicle Table Component
 */
'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useVehicles } from '@/hooks/queries/use-vehicles';
import { vehicleColumns } from './vehicle-table-columns';

export function VehicleTable() {
  const router = useRouter();
  const { data, isLoading } = useVehicles();

  const handleRowClick = (vehicle: { id: number }) => {
    router.push(`/dashboard/vehicles/${vehicle.id}`);
  };

  return (
    <DataTable
      columns={vehicleColumns}
      data={data?.data || []}
      isLoading={isLoading}
      onRowClick={handleRowClick}
    />
  );
}

