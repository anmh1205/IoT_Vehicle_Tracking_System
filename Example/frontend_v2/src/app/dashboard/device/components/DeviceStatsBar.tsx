'use client';

import { Activity, PauseCircle, Signal, WifiOff } from 'lucide-react';
import { StatCard } from './StatCard';
import { DEVICE_SPACING } from './device-design-constants';

export function DeviceStatsBar({
  stats
}: {
  stats: { total: number; running: number; disconnected: number; stopped: number };
}) {
  return (
    <div className={`${DEVICE_SPACING.section.md} grid ${DEVICE_SPACING.gap.md} sm:grid-cols-2 lg:grid-cols-4`}>
      <StatCard
        title='Tổng thiết bị'
        value={stats.total}
        icon={<Activity className='h-5 w-5 text-primary' />}
        gradient='primary'
      />
      <StatCard
        title='Đang chạy'
        value={stats.running}
        icon={<Signal className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />}
        gradient='success'
      />
      <StatCard
        title='Mất kết nối'
        value={stats.disconnected}
        icon={<WifiOff className='h-5 w-5 text-amber-600 dark:text-amber-400' />}
        gradient='warning'
      />
      <StatCard
        title='Dừng'
        value={stats.stopped}
        icon={<PauseCircle className='h-5 w-5 text-destructive' />}
        gradient='danger'
      />
    </div>
  );
}

