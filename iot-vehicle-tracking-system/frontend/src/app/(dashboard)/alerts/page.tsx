/**
 * Alerts List Page
 */
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { AlertTable } from '@/features/alerts/components/alert-table';

export default function AlertsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Alerts"
        description="View and manage system alerts"
      />
      <AlertTable />
    </PageContainer>
  );
}

