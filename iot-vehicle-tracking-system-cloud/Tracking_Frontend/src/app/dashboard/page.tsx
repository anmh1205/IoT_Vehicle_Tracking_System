'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ActivityFeed } from '@/features/dashboard/components/activity-feed';
import { AreaGraph } from '@/features/dashboard/components/area-graph';
import { BarGraph } from '@/features/dashboard/components/bar-graph';
import type { RecentAlertItem } from '@/features/dashboard/components/recent-alerts';
import { RecentAlerts } from '@/features/dashboard/components/recent-alerts';
import { OverviewStats } from '@/features/dashboard/components/overview-stats';
import { PieGraph } from '@/features/dashboard/components/pie-graph';
import { QuickActions } from '@/features/dashboard/components/quick-actions';
import { useDashboardRealtime } from '@/features/dashboard/hooks/use-dashboard-realtime';
import {
  useDashboardActivity,
  useDashboardStats,
  useDeviceActivity,
  useDeviceStatusDistribution,
  useFleetRuntime,
} from '@/features/dashboard/hooks/use-dashboard-stats';
import { alertServices, localizeAlertForDisplay } from '@/lib/api/alerts';
import { getApiErrorMessage } from '@/lib/utils/api-error';

const DashboardPage = () => {
  useDashboardRealtime();

  const statsQuery = useDashboardStats();
  const activityQuery = useDashboardActivity(50);
  const recentAlertsQuery = useQuery({
    queryKey: ['dashboard-recent-alerts'],
    queryFn: () => alertServices.getList({ page: 1, limit: 5, status: 'active' }),
  });
  const deviceActivityQuery = useDeviceActivity(7);
  const distributionQuery = useDeviceStatusDistribution();
  const fleetRuntimeQuery = useFleetRuntime(30);

  const dashboardQueries = [
    statsQuery,
    activityQuery,
    recentAlertsQuery,
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

  const alerts = useMemo<RecentAlertItem[]>(
    () =>
      ((recentAlertsQuery.data?.items ?? recentAlertsQuery.data?.data?.items ?? []) as any[]).map(
        (alert) => {
          const localized = localizeAlertForDisplay(alert);

          return {
            id: alert.id,
            title: String(localized.displayTitle ?? localized.title ?? 'Cảnh báo'),
            message: localized.displayMessage ?? localized.message ?? null,
            severity: alert.severity ?? 'low',
            createdAt: alert.createdAt ?? null,
            vehiclePlate: alert.vehiclePlate ?? null,
            vehicleId: alert.vehicleId ?? null,
            deviceName: alert.deviceName ?? null,
            deviceId: alert.deviceId ?? null,
          };
        },
      ),
    [recentAlertsQuery.data],
  );

  return (
    <PageContainer
      pageTitle="Tổng quan"
      pageDescription="Theo dõi nhanh đội xe, thiết bị và cảnh báo."
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
        <RecentAlerts alerts={alerts} isLoading={recentAlertsQuery.isLoading} />
        <ActivityFeed events={activityQuery.data ?? []} isLoading={activityQuery.isLoading} />
      </div>

      <QuickActions />
    </PageContainer>
  );
};

export default DashboardPage;
