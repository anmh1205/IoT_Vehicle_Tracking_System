'use client';

import { Activity, Archive, Layers3, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/stat-card';
import type { FirmwareDeployment, FirmwareRecord } from '@/lib/api/firmware';
import {
  formatBytes,
  formatDateTime,
  getFirmwareDisplayVersion,
  getDeploymentStatusLabel,
} from './firmware-utils';

type FirmwareSummaryCardsProps = {
  firmwares: FirmwareRecord[];
  deployments: FirmwareDeployment[];
  isLoading?: boolean;
};

export const FirmwareSummaryCards = ({
  firmwares,
  deployments,
  isLoading,
}: FirmwareSummaryCardsProps) => {
  const activeFirmwares = firmwares.filter((item) => item.isActive);
  const activeFirmware = activeFirmwares[0] ?? null;
  const latestFirmware = firmwares[0] ?? null;
  const latestDeployment = deployments[0] ?? null;
  const hasCompletedDelivery = deployments.some((item) => {
    const status = item.summaryStatus ?? item.status;
    return status === 'success' || status === 'completed';
  });
  const failedDeployments = deployments.filter((item) => {
    const status = item.summaryStatus ?? item.status;
    return status === 'failed' || status === 'stuck_timeout';
  }).length;
  const deploymentDevices = new Set(deployments.map((item) => item.deviceId)).size;
  const averageProgress = deployments.length
    ? Math.round(
        deployments.reduce((sum, item) => sum + (Number(item.progress ?? 0) || 0), 0) /
          deployments.length,
      )
    : 0;
  const totalSize = firmwares.reduce((sum, item) => sum + (Number(item.size) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng bản firmware"
          value={firmwares.length}
          icon={<Archive className="h-4 w-4" />}
          subtitle={latestFirmware ? `Mới nhất ${getFirmwareDisplayVersion(latestFirmware.version)}` : 'Chưa có bản phát hành'}
          isLoading={isLoading}
        />
        <StatCard
          title="Bản đang kích hoạt trong kho"
          value={activeFirmwares.length}
          icon={<ShieldCheck className="h-4 w-4" />}
          subtitle={
            activeFirmware
              ? getFirmwareDisplayVersion(activeFirmware.version)
              : hasCompletedDelivery
                ? 'Kho firmware chưa gắn cờ kích hoạt'
                : 'Chưa có bản đang kích hoạt'
          }
          isLoading={isLoading}
        />
        <StatCard
          title="Đợt triển khai"
          value={deployments.length}
          icon={<Layers3 className="h-4 w-4" />}
          subtitle={`${deploymentDevices} thiết bị đã nhận OTA`}
          trend={{ value: `${averageProgress}% tiến độ trung bình`, positive: averageProgress >= 50 }}
          isLoading={isLoading}
        />
        <StatCard
          title="Đợt lỗi / kẹt"
          value={failedDeployments}
          icon={<Activity className="h-4 w-4" />}
          subtitle={latestDeployment ? `Cập nhật ${formatDateTime(latestDeployment.updatedAt)}` : 'Chưa có lịch sử'}
          trend={{ value: `${deployments.length ? deployments.length - failedDeployments : 0} đợt ổn định`, positive: failedDeployments === 0 }}
          isLoading={isLoading}
        />
      </div>

      <Card className="border-dashed bg-gradient-to-r from-background via-muted/30 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tình trạng phát hành hiện hành</CardTitle>
          <CardDescription>
            Tổng dung lượng lưu trữ: {formatBytes(totalSize)} · Cờ kích hoạt phản ánh kho firmware, còn OTA phản ánh lịch sử triển khai trên thiết bị.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">Bản đang kích hoạt trong kho</p>
            <p className="mt-1 font-semibold">{activeFirmware ? getFirmwareDisplayVersion(activeFirmware.version) : '--'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeFirmware
                ? `Tạo lúc ${formatDateTime(activeFirmware.createdAt)}`
                : hasCompletedDelivery
                  ? 'Thiết bị có OTA nhưng kho chưa gắn cờ kích hoạt'
                  : 'Chưa có bản đang kích hoạt'}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">Bản gần nhất</p>
            <p className="mt-1 font-semibold">{latestFirmware ? getFirmwareDisplayVersion(latestFirmware.version) : '--'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestFirmware ? latestFirmware.filename : 'Chưa có file nào được tải lên'}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">Đợt gần nhất</p>
            <p className="mt-1 font-semibold">
              {latestDeployment ? getDeploymentStatusLabel(latestDeployment.summaryStatus ?? latestDeployment.status) : '--'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestDeployment ? `Thiết bị ${latestDeployment.deviceId}` : 'Chưa có đợt OTA nào'}
            </p>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <p className="text-xs text-muted-foreground">Phạm vi OTA</p>
            <p className="mt-1 font-semibold">{deploymentDevices} thiết bị</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {failedDeployments > 0 ? `${failedDeployments} thiết bị/bản ghi lỗi` : 'Không ghi nhận lỗi trong đợt gần nhất'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
