/**
 * Vehicles List Page
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { VehicleTable } from '@/features/vehicles/components/vehicle-table';
import { Plus } from 'lucide-react';

export default function VehiclesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Vehicles"
        description="Manage your vehicle fleet"
        action={
          <Link href="/dashboard/vehicles/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </Link>
        }
      />
      <VehicleTable />
    </PageContainer>
  );
}

