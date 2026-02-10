'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { dashboardServices } from '@/lib/api/dashboard';
import { StatCards } from '@/features/dashboard/components/stat-cards';
import { ActivityFeed } from '@/features/dashboard/components/activity-feed';
import { DeviceStatusChart } from '@/features/dashboard/components/device-status-chart';
import { VehicleActivityChart } from '@/features/dashboard/components/vehicle-activity-chart';
import { AlertsSeverityChart } from '@/features/dashboard/components/alerts-severity-chart';
import { QuickActions } from '@/features/dashboard/components/quick-actions';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardServices.getStats(),
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => dashboardServices.getActivity({ limit: 20 }),
  });

  const activityByDay = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const event of activity?.events ?? []) {
      const date = String(event.serverTimestamp ?? '').slice(0, 10);
      bucket.set(date, (bucket.get(date) ?? 0) + 1);
    }
    return Array.from(bucket.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
  }, [activity]);

  const alertSeverityData = useMemo(() => {
    const byDay = new Map<string, { date: string; critical: number; high: number; medium: number; low: number }>();
    for (const event of activity?.events ?? []) {
      const date = String(event.serverTimestamp ?? '').slice(0, 10);
      if (!byDay.has(date)) byDay.set(date, { date, critical: 0, high: 0, medium: 0, low: 0 });
      const current = byDay.get(date)!;
      const severity = String(event.severity ?? 'low');
      if (severity === 'critical') current.critical += 1;
      else if (severity === 'high') current.high += 1;
      else if (severity === 'medium') current.medium += 1;
      else current.low += 1;
    }
    return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [activity]);

  return (
    <PageContainer pageTitle="Tổng quan" pageDescription="Biểu đồ tổng quan hệ thống">
      <StatCards stats={data} isLoading={isLoading} />

      <div className="grid gap-4 lg:grid-cols-3">
        <VehicleActivityChart data={activityByDay} />
        <DeviceStatusChart data={data} />
        <AlertsSeverityChart data={alertSeverityData} />
      </div>

      <QuickActions />
      <ActivityFeed events={activity?.events ?? []} isLoading={activityLoading} />
    </PageContainer>
  );
}

