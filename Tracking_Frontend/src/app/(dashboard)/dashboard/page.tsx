'use client';

import {
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  Timer,
  CalendarClock,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStats, useActivityFeed } from '@/hooks/useDashboard';
import { StatCard } from '@/components/dashboard/stat-card';
import { ActivityFeed } from '@/components/dashboard/activity-feed';

function formatRuntime(seconds: number): string {
  if (seconds <= 0) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function StatsSkeleton() {
  return (
    <div className={cn('grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg border border-border bg-card p-5 border-l-4 border-l-muted">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-5 w-5 rounded bg-muted" />
          </div>
          <div className="mt-3 h-8 w-16 rounded bg-muted" />
          <div className="mt-2 h-3 w-32 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: activityData, isLoading: activityLoading } = useActivityFeed();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your vehicle tracking system.
        </p>
      </div>

      {/* Primary Stats */}
      {statsLoading ? (
        <StatsSkeleton />
      ) : statsError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load dashboard statistics. Please try again later.
        </div>
      ) : stats ? (
        <>
          <div className={cn('grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}>
            <StatCard
              title="Total Devices"
              value={stats.totalDevices}
              icon={<Cpu className="h-5 w-5" />}
              color="blue"
              subtitle="Connected trackers"
            />
            <StatCard
              title="Active Devices"
              value={stats.activeDevices}
              icon={<Wifi className="h-5 w-5" />}
              color="green"
              subtitle="Currently reporting"
            />
            <StatCard
              title="Offline Devices"
              value={stats.offlineDevices}
              icon={<WifiOff className="h-5 w-5" />}
              color="red"
              subtitle="No signal"
            />
            <StatCard
              title="Active Alerts"
              value={stats.alertsCount}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="orange"
              subtitle="Unresolved"
            />
          </div>

          {/* Runtime Stats */}
          <div className={cn('grid gap-4 grid-cols-1 sm:grid-cols-3')}>
            <StatCard
              title="Runtime Today"
              value={formatRuntime(stats.totalRuntimeToday)}
              icon={<Timer className="h-5 w-5" />}
              color="gray"
            />
            <StatCard
              title="Runtime This Week"
              value={formatRuntime(stats.totalRuntimeWeek)}
              icon={<CalendarClock className="h-5 w-5" />}
              color="gray"
            />
            <StatCard
              title="Sessions Today"
              value={stats.sessionsToday}
              icon={<Activity className="h-5 w-5" />}
              color="blue"
            />
          </div>
        </>
      ) : null}

      {/* Activity Feed */}
      <ActivityFeed
        events={activityData?.items ?? []}
        isLoading={activityLoading}
      />
    </div>
  );
}
