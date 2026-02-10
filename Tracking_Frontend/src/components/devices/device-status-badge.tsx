'use client';

import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  running: { label: 'Running', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700 dark:text-emerald-400' },
  stopped: { label: 'Stopped', dotClass: 'bg-amber-500', textClass: 'text-amber-700 dark:text-amber-400' },
  disconnected: { label: 'Disconnected', dotClass: 'bg-zinc-400', textClass: 'text-zinc-500 dark:text-zinc-400' },
} as const;

interface DeviceStatusBadgeProps {
  status: 'running' | 'stopped' | 'disconnected';
  className?: string;
}

export function DeviceStatusBadge({ status, className }: DeviceStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.disconnected;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium dark:bg-zinc-800',
        config.textClass,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} aria-hidden="true" />
      {config.label}
    </span>
  );
}
