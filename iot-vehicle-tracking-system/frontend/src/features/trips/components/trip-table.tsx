/**
 * Trip Table Component
 */
'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useTrips } from '@/hooks/queries/use-trips';
import { tripColumns } from './trip-table-columns';

export function TripTable() {
  const router = useRouter();
  const { data, isLoading } = useTrips();

  const handleRowClick = (trip: { id: number }) => {
    router.push(`/dashboard/trips/${trip.id}`);
  };

  return (
    <DataTable
      columns={tripColumns}
      data={data?.data || []}
      isLoading={isLoading}
      onRowClick={handleRowClick}
    />
  );
}

