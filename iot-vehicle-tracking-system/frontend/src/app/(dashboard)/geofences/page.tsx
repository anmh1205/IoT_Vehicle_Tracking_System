/**
 * Geofences List Page
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { GeofenceTable } from '@/features/geofences/components/geofence-table';
import { Plus } from 'lucide-react';

export default function GeofencesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Geofences"
        description="Manage geofence zones"
        action={
          <Link href="/dashboard/geofences/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Geofence
            </Button>
          </Link>
        }
      />
      <GeofenceTable />
    </PageContainer>
  );
}

