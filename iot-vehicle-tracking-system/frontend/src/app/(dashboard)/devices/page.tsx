/**
 * Devices List Page
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { DeviceTable } from '@/features/devices/components/device-table';
import { Plus } from 'lucide-react';

export default function DevicesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Devices"
        description="Manage tracking devices"
        action={
          <Link href="/dashboard/devices/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </Link>
        }
      />
      <DeviceTable />
    </PageContainer>
  );
}

