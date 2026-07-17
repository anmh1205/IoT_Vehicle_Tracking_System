'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardEvent } from '@/features/dashboard/hooks/use-dashboard-stats';
import { formatRelative } from '@/lib/utils/date/format';
import { getDashboardEventPresentation } from './dashboard-event-presenters';

export const ActivityFeed = ({
  events,
  isLoading,
}: {
  events: DashboardEvent[];
  isLoading?: boolean;
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Dòng hoạt động thời gian thực</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <ScrollArea className="h-[320px] pr-2 xl:h-[280px]">
            <div className="space-y-3">
              {events.slice(0, 10).map((event) => {
                const presentation = getDashboardEventPresentation(event);

                return (
                  <div key={String(event.id)} className="rounded-xl border p-4 text-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-2">
                        <p className="line-clamp-2 font-semibold leading-5">{presentation.title}</p>
                        <span className="inline-flex w-fit rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                          {presentation.categoryLabel}
                        </span>
                      </div>
                      <Badge variant={presentation.severityVariant} className="mt-0.5">
                        {presentation.severityLabel}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                      {presentation.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span>{presentation.sourceLabel}</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                      <span>{formatRelative(event.serverTimestamp)}</span>
                    </div>
                  </div>
                );
              })}
              {events.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                  Chưa có hoạt động gần đây.
                </p>
              ) : null}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
