'use client';

import { cn } from '@/lib/utils';
import type { DeviceSession } from '@/types/device.types';

interface DeviceSessionTableProps {
  sessions: DeviceSession[];
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString();
}

const SESSION_STATUS_STYLES = {
  running: 'text-emerald-700 dark:text-emerald-400',
  completed: 'text-blue-700 dark:text-blue-400',
  disconnected: 'text-zinc-500 dark:text-zinc-400',
} as const;

export function DeviceSessionTable({ sessions }: DeviceSessionTableProps) {
  if (sessions.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No session history available.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Status</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Start Time</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">End Time</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Uptime</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Avg Vibration</th>
            <th className="whitespace-nowrap px-3 py-2 font-medium text-muted-foreground">Data Points</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr
              key={session.id}
              className="border-b border-border/50 last:border-0"
            >
              <td className="whitespace-nowrap px-3 py-2">
                <span
                  className={cn(
                    'text-xs font-medium capitalize',
                    SESSION_STATUS_STYLES[session.status] ?? 'text-foreground'
                  )}
                >
                  {session.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">
                {formatDate(session.serverSessionStart)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">
                {formatDate(session.serverSessionEnd)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">
                {formatDuration(session.uptime)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">
                {session.avgVibration !== null ? session.avgVibration.toFixed(2) : '--'}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-foreground">
                {session.dataPointsCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
