'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowUpRight, CheckCircle2, CircleCheckBig, Clock3 } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDetailModal } from '@/features/alerts/components/alert-detail-modal';
import { alertServices, getAlertSeverityLabel, getAlertStatusLabel, getAlertTypeLabel } from '@/lib/api/alerts';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { queryInvalidation } from '@/lib/utils/query-invalidation';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';
import { useDeviceDetailModal } from './modal-context';

const severityVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'secondary',
  critical: 'destructive',
};

export const WorkspaceAlertsSection = ({ alertsPath }: { alertsPath: string | null }) => {
  const [detailAlertId, setDetailAlertId] = useState<number | null>(null);
  const { device, deviceScopedAlerts, deviceScopedAlertsLoading } = useDeviceDetailModal();
  const queryClient = useQueryClient();
  const detailAlert = useMemo(
    () => deviceScopedAlerts.find((alert) => alert.id === detailAlertId) ?? null,
    [detailAlertId, deviceScopedAlerts],
  );

  const ackMutation = useMutation({
    mutationFn: (id: number) => alertServices.acknowledge(id),
    onSuccess: () => {
      queryInvalidation.alerts.all(queryClient);
      if (device?.deviceId) queryInvalidation.alerts.deviceScoped(queryClient, device.deviceId);
      notificationUtils.success('Đã xác nhận cảnh báo');
    },
    onError: (error: unknown) => {
      notificationUtils.error('Xác nhận thất bại', getApiErrorMessage(error, 'Không thể xác nhận cảnh báo.'));
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => alertServices.resolve(id),
    onSuccess: () => {
      queryInvalidation.alerts.all(queryClient);
      if (device?.deviceId) queryInvalidation.alerts.deviceScoped(queryClient, device.deviceId);
      notificationUtils.success('Đã giải quyết cảnh báo');
    },
    onError: (error: unknown) => {
      notificationUtils.error('Giải quyết thất bại', getApiErrorMessage(error, 'Không thể giải quyết cảnh báo.'));
    },
  });

  const actionPending = ackMutation.isPending || resolveMutation.isPending;

  if (deviceScopedAlertsLoading) {
    return <div className="rounded-3xl border border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground">Đang tải cảnh báo đang mở của thiết bị...</div>;
  }

  if (deviceScopedAlerts.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState title="Không có cảnh báo đang mở" description="Thiết bị hiện không có cảnh báo đang mở nào cần xử lý trong không gian làm việc này." />
        {alertsPath ? (
          <Button asChild variant="outline">
            <Link href={alertsPath}>
              Mở hàng đợi cảnh báo đầy đủ
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 xl:auto-rows-fr xl:grid-cols-2">
        {deviceScopedAlerts.map((alert) => (
          <Card key={alert.id} className="flex h-full flex-col overflow-hidden border-border/70 bg-background/80">
            <CardHeader className="flex min-h-[11.5rem] flex-1 flex-col space-y-3 border-b bg-muted/20">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={severityVariants[alert.severity ?? ''] ?? 'outline'}>
                  {getAlertSeverityLabel(alert.severity)}
                </Badge>
                <Badge variant={alert.status === 'active' ? 'default' : 'outline'}>
                  {getAlertStatusLabel(alert.status)}
                </Badge>
                <Badge variant="outline">{getAlertTypeLabel(alert.alertType, 'Khác')}</Badge>
              </div>
              <div className="flex-1 space-y-1">
                <CardTitle className="text-base">{alert.displayTitle ?? alert.title ?? `Cảnh báo #${alert.id}`}</CardTitle>
                <p className="text-sm leading-6 text-muted-foreground">{alert.displayMessage ?? alert.message ?? 'Chưa có mô tả chi tiết.'}</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border bg-muted/15 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Nguồn</p>
                  <p className="mt-1 text-sm font-medium">{alert.vehiclePlate ?? alert.vehicleId ?? 'Chưa gắn xe'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{alert.deviceName ?? alert.deviceId ?? 'Chưa gắn thiết bị'}</p>
                </div>
                <div className="rounded-2xl border bg-muted/15 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Thời điểm</p>
                  <p className="mt-1 text-sm font-medium">{formatDateTime(alert.createdAt)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatRelative(alert.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2">
                {alert.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionPending}
                    onClick={() => ackMutation.mutate(alert.id)}
                  >
                    <CircleCheckBig className="mr-2 h-4 w-4" />
                    Xác nhận
                  </Button>
                ) : null}
                {alert.status !== 'resolved' && alert.status !== 'dismissed' ? (
                  <Button
                    size="sm"
                    disabled={actionPending}
                    onClick={() => resolveMutation.mutate(alert.id)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Giải quyết
                  </Button>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => setDetailAlertId(alert.id)}>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Chi tiết
                </Button>
                {alertsPath ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={alertsPath}>
                      Queue đầy đủ
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDetailModal
        open={Boolean(detailAlert)}
        onOpenChange={(open) => !open && setDetailAlertId(null)}
        alert={detailAlert}
        onActionComplete={() => {
          setDetailAlertId(null);
          queryInvalidation.alerts.all(queryClient);
          if (device?.deviceId) queryInvalidation.alerts.deviceScoped(queryClient, device.deviceId);
        }}
      />
    </>
  );
};
