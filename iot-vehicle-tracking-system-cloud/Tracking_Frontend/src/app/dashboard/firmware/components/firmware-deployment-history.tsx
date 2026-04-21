'use client';

import { AlertTriangle, Clock3, Layers3, LucideIcon, RadioTower, Smartphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Device } from '@/features/devices/types';
import type { FirmwareDeployment } from '@/lib/api/firmware';
import {
  formatDateTime,
  getDeploymentBadgeVariant,
  getDeploymentStatusLabel,
  getFirmwareDisplayVersion,
} from './firmware-utils';

type FirmwareDeploymentHistoryProps = {
  deployments: FirmwareDeployment[];
  devices: Device[];
  isLoading?: boolean;
};

const MetaItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <span className="inline-flex items-center gap-1.5">
    <Icon className="h-3.5 w-3.5" />
    {label}: {value}
  </span>
);

export const FirmwareDeploymentHistory = ({
  deployments,
  devices,
  isLoading,
}: FirmwareDeploymentHistoryProps) => {
  const deviceById = new Map(devices.map((device) => [device.deviceId, device]));
  const successCount = deployments.filter((item) => {
    const status = item.summaryStatus ?? item.status;
    return status === 'completed' || status === 'success';
  }).length;
  const failedCount = deployments.filter((item) => {
    const status = item.summaryStatus ?? item.status;
    return status === 'failed' || status === 'stuck_timeout';
  }).length;
  const activeCount = deployments.filter((item) => {
    const status = item.summaryStatus ?? item.status;
    return [
      'assigned',
      'pending',
      'processing',
      'downloading',
      'verifying',
      'installing',
      'rebooting',
      'confirming',
      'in_progress',
    ].includes(status);
  }).length;

  return (
    <Card className="border-muted/70">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="text-base">Dòng triển khai OTA</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Theo dõi theo thiết bị, version đích, job OTA và trạng thái xử lý gần nhất.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Tổng {deployments.length}</Badge>
            <Badge variant="outline">Thành công {successCount}</Badge>
            <Badge variant="outline">Đang chạy {activeCount}</Badge>
            <Badge variant={failedCount > 0 ? 'destructive' : 'outline'}>Lỗi {failedCount}</Badge>
          </div>
        </div>
        {!isLoading && deployments.length > 0 ? (
          <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <MetaItem
              icon={Layers3}
              label="Thiết bị"
              value={`${new Set(deployments.map((item) => item.deviceId)).size}`}
            />
            <MetaItem
              icon={Clock3}
              label="Cập nhật"
              value={formatDateTime(deployments[0]?.lastSeenAt ?? deployments[0]?.updatedAt)}
            />
            <MetaItem
              icon={AlertTriangle}
              label="Bản gần nhất"
              value={getFirmwareDisplayVersion(deployments[0]?.targetVersion)}
            />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải trạng thái triển khai...</p>
        ) : deployments.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Chưa có đợt triển khai firmware nào.
          </div>
        ) : (
          <div className="max-h-[56rem] space-y-3 overflow-y-auto pr-1">
            {deployments.slice(0, 20).map((item) => {
              const displayStatus = item.summaryStatus ?? item.status;
              const badgeVariant = getDeploymentBadgeVariant(displayStatus);
              const device = deviceById.get(item.deviceId);
              const deviceLabel = device?.deviceName ?? item.deviceId;
              const sourceLabel = [device?.vehiclePlate, item.deviceId].filter(Boolean).join(' • ');
              const statusTone =
                displayStatus === 'failed' || displayStatus === 'stuck_timeout'
                  ? 'text-rose-600'
                  : item.isStuck
                    ? 'text-amber-600'
                    : 'text-muted-foreground';

              return (
                <div key={`${item.id}-${item.jobId ?? item.deviceId}`} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">{deviceLabel}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {sourceLabel || 'Chưa có thông tin phương tiện'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{item.progress ?? 0}%</Badge>
                      <Badge variant={badgeVariant}>{getDeploymentStatusLabel(displayStatus)}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 xl:grid-cols-[1.25fr_0.95fr]">
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                          <p className="text-muted-foreground">Luồng version</p>
                          <p className="mt-1 font-medium">
                            {getFirmwareDisplayVersion(item.currentVersion)} →{' '}
                            {getFirmwareDisplayVersion(item.targetVersion)}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                          <p className="text-muted-foreground">Job / boot</p>
                          <p className="mt-1 font-medium">
                            {item.jobId ?? 'Chưa có job'} • {item.lastBootId ?? '--'}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                          <p className="text-muted-foreground">Thời gian</p>
                          <p className="mt-1">
                            Bắt đầu {formatDateTime(item.startedAt)} • Cập nhật{' '}
                            {formatDateTime(item.lastSeenAt ?? item.updatedAt)}
                          </p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-3 text-xs">
                          <p className="text-muted-foreground">Partition / seq</p>
                          <p className="mt-1">
                            {item.partition ? `Partition ${item.partition}` : 'Chưa có partition'} • Seq{' '}
                            {item.lastSeqNo ?? '--'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-lg border bg-muted/10 p-3 text-xs">
                      <p className="font-medium">Thông tin triển khai</p>
                      <div className="space-y-1 text-muted-foreground">
                        <p className="inline-flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5" />
                          Thiết bị: {device?.currentStatus ?? 'Chưa rõ'}
                        </p>
                        <p className="inline-flex items-center gap-1.5">
                          <RadioTower className="h-3.5 w-3.5" />
                          Command:{' '}
                          {item.commandDispatchedAt
                            ? `đã gửi ${formatDateTime(item.commandDispatchedAt)}`
                            : 'chưa gửi'}
                        </p>
                        <p className={statusTone}>
                          {item.stuckReason
                            ? `Lý do kẹt: ${item.stuckReason}`
                            : item.errorMessage
                              ? `${item.errorCode ? `${item.errorCode}: ` : ''}${item.errorMessage}`
                              : 'Không ghi nhận lỗi trong bản tin gần nhất'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
