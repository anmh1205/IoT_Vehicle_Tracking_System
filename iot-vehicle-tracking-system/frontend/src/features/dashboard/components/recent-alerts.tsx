/**
 * Recent Alerts Component
 */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlerts } from '@/hooks/queries/use-alerts';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import type { Alert, AlertSeverity } from '@/types';

const severityColors: Record<AlertSeverity, string> = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-600',
};

export function RecentAlerts() {
  const { data, isLoading } = useAlerts({ limit: 10 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const alerts = data?.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Alerts</CardTitle>
        <CardDescription>Latest system alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No alerts found
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert: Alert) => (
              <div key={alert.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.message}</span>
                    <Badge className={severityColors[alert.severity] || 'bg-gray-500'}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Vehicle ID: {alert.vehicleId} • {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

