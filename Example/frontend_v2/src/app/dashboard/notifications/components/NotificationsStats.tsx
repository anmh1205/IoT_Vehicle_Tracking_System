'use client';

import { StatCard } from '@/app/dashboard/device/components/StatCard';
import { Bell, BellRing, AlertTriangle, Info } from 'lucide-react';

type LocalAlertItem = Dashboard.AlertItemDto & { read?: boolean };

interface NotificationsStatsProps {
  items: LocalAlertItem[];
  unreadCount: number;
}

export function NotificationsStats({ items, unreadCount }: NotificationsStatsProps) {
  const errorCount = items.filter((i) => i.level === 'error').length;
  const warningInfoCount = items.filter((i) => i.level === 'warning' || i.level === 'info').length;

  return (
    <div className='mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
      <StatCard
        title='Tổng thông báo'
        value={items.length}
        icon={<Bell className='h-4 w-4 text-primary' />}
        gradient='primary'
      />
      <StatCard
        title='Chưa đọc'
        value={unreadCount}
        icon={<BellRing className='h-4 w-4 text-amber-600 dark:text-amber-400' />}
        gradient='warning'
      />
      <StatCard
        title='Lỗi'
        value={errorCount}
        icon={<AlertTriangle className='h-4 w-4 text-destructive' />}
        gradient='danger'
      />
      <StatCard
        title='Cảnh báo/Info'
        value={warningInfoCount}
        icon={<Info className='h-4 w-4 text-blue-600 dark:text-blue-400' />}
        gradient='secondary'
      />
    </div>
  );
}

