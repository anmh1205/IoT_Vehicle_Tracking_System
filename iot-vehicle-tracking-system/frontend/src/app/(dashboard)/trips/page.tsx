/**
 * Trips List Page
 */
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { TripTable } from '@/features/trips/components/trip-table';

export default function TripsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Trips"
        description="View and manage vehicle trips"
      />
      <TripTable />
    </PageContainer>
  );
}

