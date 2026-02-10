import { cn } from '@/lib/utils';
import type { ActivityEvent } from '@/types/dashboard.types';

interface ActivityFeedProps {
  events: ActivityEvent[];
  isLoading?: boolean;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-600 dark:text-red-400',
  error: 'bg-red-500/15 text-red-600 dark:text-red-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  debug: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="h-5 w-14 rounded bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/3 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeed({ events, isLoading }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-card-foreground">Recent Activity</h2>
        <div className="mt-4">
          <ActivitySkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold text-card-foreground">Recent Activity</h2>
      <div className="mt-4 max-h-[400px] space-y-2 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No recent activity to display.
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-md border border-border/50 px-3 py-2.5 transition-colors hover:bg-accent/50"
            >
              <span
                className={cn(
                  'mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-tight',
                  SEVERITY_STYLES[event.severity] ?? SEVERITY_STYLES.info
                )}
              >
                {event.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-card-foreground truncate">
                  {event.message ?? event.eventType}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{event.deviceId}</span>
                  <span aria-hidden="true">&#183;</span>
                  <time dateTime={event.serverTimestamp}>
                    {formatRelativeTime(event.serverTimestamp)}
                  </time>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
