'use client';

import { useMemo } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { ActivityFeed } from '@/features/dashboard/components/activity-feed';
import { AreaGraph } from '@/features/dashboard/components/area-graph';
import { BarGraph } from '@/features/dashboard/components/bar-graph';
import { OverviewStats } from '@/features/dashboard/components/overview-stats';
import { PieGraph } from '@/features/dashboard/components/pie-graph';
import { QuickActions } from '@/features/dashboard/components/quick-actions';
import { RecentAlerts } from '@/features/dashboard/components/recent-alerts';
import { useDashboardRealtime } from '@/features/dashboard/hooks/use-dashboard-realtime';
import {
  useDashboardActivity,
  useDashboardStats,
  useDeviceActivity,
  useDeviceStatusDistribution,
  useFleetRuntime,
} from '@/features/dashboard/hooks/use-dashboard-stats';

const DashboardPage = () => {
  useDashboardRealtime();

  const statsQuery = useDashboardStats();
  const activityQuery = useDashboardActivity(50);
  const deviceActivityQuery = useDeviceActivity(7);
  const distributionQuery = useDeviceStatusDistribution();
  const fleetRuntimeQuery = useFleetRuntime(30);

  const alerts = useMemo(
    () =>
      (activityQuery.data ?? []).filter((event) =>
        ['critical', 'high', 'medium'].includes(String(event.severity ?? '').toLowerCase()),
      ),
    [activityQuery.data],
  );

  return (
    <PageContainer
      pageTitle="Tổng quan"
      pageDescription="Bảng điều khiển theo dõi đội xe, hoạt động thiết bị và cảnh báo quan trọng."
    >
      <OverviewStats stats={statsQuery.data} isLoading={statsQuery.isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BarGraph data={deviceActivityQuery.data ?? []} isLoading={deviceActivityQuery.isLoading} />
        <PieGraph data={distributionQuery.data ?? []} isLoading={distributionQuery.isLoading} />
      </div>

      <AreaGraph data={fleetRuntimeQuery.data ?? []} isLoading={fleetRuntimeQuery.isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentAlerts alerts={alerts} isLoading={activityQuery.isLoading} />
        <ActivityFeed events={activityQuery.data ?? []} isLoading={activityQuery.isLoading} />
      </div>

      <QuickActions />
    </PageContainer>
  );
};

export default DashboardPage;
