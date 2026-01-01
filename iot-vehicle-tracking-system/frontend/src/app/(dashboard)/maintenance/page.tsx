/**
 * Maintenance List Page
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { MaintenanceTable } from '@/features/maintenance/components/maintenance-table';
import { Plus } from 'lucide-react';

export default function MaintenancePage() {
    return (
        <PageContainer>
            <PageHeader
                title="Maintenance"
                description="Manage vehicle maintenance records"
                action={
                    <Link href="/dashboard/maintenance/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Schedule Maintenance
                        </Button>
                    </Link>
                }
            />
            <MaintenanceTable />
        </PageContainer>
    );
}
