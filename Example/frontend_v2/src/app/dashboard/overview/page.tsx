/* eslint-disable @typescript-eslint/no-non-null-assertion */
'use client';

import { useEffect, useMemo, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useDashboardStats } from '@/hooks/queries/useDashboardStats';
import { useActivityLog } from '@/hooks/queries/useActivityLog';
import { useAlerts } from '@/hooks/queries/useAlerts';
import { useDashboardRuntimeHistory } from '@/hooks/queries/useDashboardRuntimeHistory';
import { notificationUtils } from '@/lib/notification';
import {
  Activity,
  AlertTriangle,
  Clock3,
  Gauge,
  Loader2,
  PauseCircle,
  PlayCircle,
  WifiOff
} from 'lucide-react';
import { StatCard } from '@/app/dashboard/device/components/StatCard';
import { ActivityList } from './components/ActivityList';
import { AlertsList } from './components/AlertsList';
import { RuntimeChart } from './components/RuntimeChart';
import { SystemMap } from './components/SystemMap';

type Range = 7 | 30 | 90;

export default function DashboardOverviewPage() {
  const [range, setRange] = useState<Range>(7);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError
  } = useDashboardStats(true);
  const {
    data: runtimeStats,
    isLoading: runtimeLoading,
    error: runtimeError
  } = useDashboardRuntimeHistory(range);
  const {
    data: activity,
    isLoading: activityLoading,
    error: activityError
  } = useActivityLog(true);
  const {
    data: alerts,
    isLoading: alertsLoading,
    error: alertsError
  } = useAlerts(true);

  const formatHours = (seconds?: number) => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  const runtimeSeries = useMemo(() => {
    const source = runtimeStats ?? stats;
    if (!source) return { labels: [] as string[], series: [] as number[] };

    const history =
      range === 7
        ? source.runtime_history_week
        : range === 30
          ? source.runtime_history_month
          : source.runtime_history_90 ?? source.runtime_history;

    if (!history || !history.series || history.series.length === 0) {
      return { labels: [] as string[], series: [] as number[] };
    }

    const firstSeries = history.series[0];
    const labels = firstSeries.points.map((pt: { x: string }) => {
      const d = new Date(pt.x);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    });
    const series = firstSeries.points.map((pt: { y: number }) => pt.y);
    return { labels, series };
  }, [range, runtimeStats, stats]);

  const anyLoading = statsLoading || runtimeLoading || activityLoading || alertsLoading;
  const error = statsError || runtimeError || activityError || alertsError;

  // Show notification when error occurs
  useEffect(() => {
    if (error) {
      notificationUtils.error('Lỗi tải dữ liệu', (error as Error).message ?? 'Không thể tải dữ liệu dashboard');
    }
  }, [error]);

  return (
    <PageContainer
      pageTitle='Tổng quan'
      pageDescription='Tình trạng thiết bị, hoạt động và cảnh báo theo thời gian thực'
      isloading={false}
    >
      {error ? (
        <Alert variant='destructive' className='mb-4'>
          <AlertTriangle className='h-4 w-4' />
          <AlertTitle>Lỗi tải dữ liệu</AlertTitle>
          <AlertDescription>{(error as Error).message ?? 'Không thể tải dữ liệu'}</AlertDescription>
        </Alert>
      ) : null}

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          title='Thiết bị'
          value={stats?.total_devices ?? 0}
          icon={<Gauge className='h-5 w-5 text-primary' />}
          gradient='primary'
        />
        <StatCard
          title='Đang chạy'
          value={stats?.devices_running ?? 0}
          icon={<PlayCircle className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />}
          gradient='success'
        />
        <StatCard
          title='Mất kết nối'
          value={stats?.devices_disconnected ?? 0}
          icon={<WifiOff className='h-5 w-5 text-amber-600 dark:text-amber-400' />}
          gradient='warning'
        />
        <StatCard
          title='Dừng'
          value={stats?.devices_stopped ?? 0}
          icon={<PauseCircle className='h-5 w-5 text-destructive' />}
          gradient='danger'
        />
        <StatCard
          title='Thời gian hôm nay'
          value={formatHours(stats?.runtime_today_seconds)}
          icon={<Clock3 className='h-5 w-5 text-primary' />}
          gradient='primary'
        />
        <StatCard
          title='Phiên hôm nay'
          value={stats?.sessions_today ?? 0}
          icon={<Activity className='h-5 w-5 text-primary' />}
          gradient='secondary'
        />
        <StatCard
          title='Thời gian quý'
          value={formatHours(stats?.runtime_quarter_seconds)}
          icon={<Clock3 className='h-5 w-5 text-primary' />}
          gradient='primary'
        />
        <StatCard
          title='Phiên quý'
          value={stats?.sessions_quarter ?? 0}
          icon={<Activity className='h-5 w-5 text-primary' />}
          gradient='secondary'
        />
      </div>

      <div className='grid gap-6 lg:grid-cols-2 mt-6'>
        <ActivityList activity={activity} loading={activityLoading} />

        <AlertsList alerts={alerts} loading={alertsLoading} />
      </div>

      <div className='mt-6'>
        <RuntimeChart
          range={range}
          onRangeChange={setRange}
          labels={runtimeSeries.labels}
          series={runtimeSeries.series}
          loading={anyLoading}
          formatHours={formatHours}
        />
      </div>

      <div className='mt-6'>
        <SystemMap />
      </div>
    </PageContainer>
  );
}

function formatHours(seconds?: number) {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

