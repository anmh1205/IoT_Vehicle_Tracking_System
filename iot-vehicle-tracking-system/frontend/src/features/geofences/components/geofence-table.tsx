/**
 * Geofence Table Component
 */
'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useGeofences } from '@/hooks/queries/use-geofences';
import { geofenceColumns } from './geofence-table-columns';

export function GeofenceTable() {
  const router = useRouter();
  const { data, isLoading } = useGeofences();

  const handleRowClick = (geofence: { id: number }) => {
    router.push(`/dashboard/geofences/${geofence.id}`);
  };

  return (
    <DataTable
      columns={geofenceColumns}
      data={data?.data || []}
      isLoading={isLoading}
      onRowClick={handleRowClick}
    />
  );
}

