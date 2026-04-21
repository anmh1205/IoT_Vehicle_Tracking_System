'use client';

import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelative } from '@/lib/utils/date/format';
import { getDashboardSeverityMeta } from './dashboard-event-presenters';

export interface RecentAlertItem {
  id: string | number;
  title: string;
  message?: string | null;
  severity?: string;
  createdAt?: string | null;
  vehiclePlate?: string | null;
  vehicleId?: string | null;
  deviceName?: string | null;
  deviceId?: string | null;
}

const getSeverityVariant = (
  severity?: string,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  return getDashboardSeverityMeta(severity).variant;
};

const getSourceLabel = (alert: RecentAlertItem) => {
  const vehicle = alert.vehiclePlate ?? alert.vehicleId;
  const device = alert.deviceName ?? alert.deviceId;
  if (vehicle && device) {
    return `${vehicle} • ${device}`;
  }
  return vehicle ?? device ?? 'Chưa rõ nguồn cảnh báo';
};

export const RecentAlerts = ({
  alerts,
  isLoading,
}: {
  alerts: RecentAlertItem[];
  isLoading?: boolean;
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-4 w-4" />
          Cảnh báo gần đây
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={String(alert.id)} className="rounded-xl border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="line-clamp-2 text-sm font-semibold leading-5">{alert.title}</p>
                    <p className="line-clamp-1 text-xs leading-5 text-muted-foreground">
                      {getSourceLabel(alert)}
                    </p>
                  </div>
                  <Badge variant={getSeverityVariant(alert.severity)} className="mt-0.5">
                    {getDashboardSeverityMeta(alert.severity).label}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {alert.message || 'Không có nội dung chi tiết'}
                </p>
                <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                  {formatRelative(alert.createdAt)}
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
