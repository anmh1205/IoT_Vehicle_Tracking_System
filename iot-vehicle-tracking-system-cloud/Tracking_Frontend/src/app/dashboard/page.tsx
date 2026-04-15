'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { getApiErrorMessage } from '@/lib/utils/api-error';

const DashboardPage = () => {
  useDashboardRealtime();

  const statsQuery = useDashboardStats();
  const activityQuery = useDashboardActivity(50);
  const deviceActivityQuery = useDeviceActivity(7);
  const distributionQuery = useDeviceStatusDistribution();
  const fleetRuntimeQuery = useFleetRuntime(30);

  const dashboardQueries = [
    statsQuery,
    activityQuery,
    deviceActivityQuery,
    distributionQuery,
    fleetRuntimeQuery,
  ];
  const dashboardErrorQuery = dashboardQueries.find((query) => query.isError);
  const dashboardErrorMessage = dashboardErrorQuery
    ? getApiErrorMessage(
        dashboardErrorQuery.error,
        'Không thể đồng bộ một phần dữ liệu tổng quan. Vui lòng thử lại.',
      )
    : null;

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
      {dashboardErrorMessage ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Không thể đồng bộ đầy đủ dữ liệu tổng quan</AlertTitle>
          <AlertDescription>
            <p>{dashboardErrorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                for (const query of dashboardQueries) {
                  void query.refetch();
                }
              }}
            >
              Thử lại tất cả
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

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
