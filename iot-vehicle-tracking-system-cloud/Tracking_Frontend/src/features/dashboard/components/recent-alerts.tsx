'use client';

import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelative } from '@/lib/utils/date/format';

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
  if (severity === 'critical' || severity === 'high') {
    return 'destructive';
  }
  if (severity === 'medium') {
    return 'secondary';
  }
  return 'outline';
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
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{alert.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {getSourceLabel(alert)}
                    </p>
                  </div>
                  <Badge variant={getSeverityVariant(alert.severity)}>
                    {alert.severity ?? 'thông tin'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.message || 'Không có nội dung chi tiết'}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
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
