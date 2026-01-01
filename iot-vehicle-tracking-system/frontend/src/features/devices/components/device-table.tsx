/**
 * Device Table Component
 */
'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useDevices } from '@/hooks/queries/use-devices';
import { deviceColumns } from './device-table-columns';

export function DeviceTable() {
  const router = useRouter();
  const { data, isLoading } = useDevices();

  const handleRowClick = (device: { id: number }) => {
    router.push(`/dashboard/devices/${device.id}`);
  };

  return (
    <DataTable
      columns={deviceColumns}
      data={data?.data || []}
      isLoading={isLoading}
      onRowClick={handleRowClick}
    />
  );
}

