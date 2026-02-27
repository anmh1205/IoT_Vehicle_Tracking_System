'use client';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelative } from '@/lib/utils/date/format';
import type { DashboardEvent } from '@/features/dashboard/hooks/use-dashboard-stats';
const getSeverityVariant = (
  severity?: string,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (severity === 'critical' || severity === 'high') {
    return 'destructive';
  }
  if (severity === 'medium') {
    return 'secondary';
  }
  return 'outline';
};
export const RecentAlerts = ({
  alerts,
  isLoading,
}: {
  alerts: DashboardEvent[];
  isLoading?: boolean;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
Cảnh báo gần đây
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div key={String(alert.id)} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{alert.eventType}</p>
                  <Badge variant={getSeverityVariant(alert.severity)}>
                    {alert.severity ?? 'thông tin'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.message || alert.deviceId || 'Không có nội dung'}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatRelative(alert.serverTimestamp)}
                </p>
              </div>
            ))}
            {alerts.length === 0 ? (
              <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
Chưa có cảnh báo gần đây.
              </p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
