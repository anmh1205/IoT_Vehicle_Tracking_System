/**
 * Dashboard Overview Page
 */
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { StatsCards } from '@/features/dashboard/components/stats-cards';
import { RecentAlerts } from '@/features/dashboard/components/recent-alerts';
import { ActiveVehicles } from '@/features/dashboard/components/active-vehicles';

export default function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader title="Dashboard" description="Overview of your fleet" />
      <div className="space-y-6">
        <StatsCards />
        <div className="grid gap-6 md:grid-cols-2">
          <RecentAlerts />
          <ActiveVehicles />
        </div>
      </div>
    </PageContainer>
  );
}

