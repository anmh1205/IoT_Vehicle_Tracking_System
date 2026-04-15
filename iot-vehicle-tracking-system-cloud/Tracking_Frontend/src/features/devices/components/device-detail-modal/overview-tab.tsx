import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceStatCard } from '@/features/devices/components/stat-card';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import { formatDuration, formatRelative } from '@/lib/utils/date/format';
import { useDeviceDetailModal } from './modal-context';

const formatCoordinate = (value: number | null | undefined) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(6);
};

export const OverviewTab = () => {
  const { device, runtime, vibrationChart } = useDeviceDetailModal();
  const latestVibration = vibrationChart[vibrationChart.length - 1];
  const statusLabel =
    DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? 'Không xác định';
  const hasCoordinate =
    typeof device?.latitude === 'number' &&
    typeof device?.longitude === 'number' &&
    Number.isFinite(device.latitude) &&
    Number.isFinite(device.longitude);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <DeviceStatCard title="Tổng runtime" value={formatDuration(runtime?.totalRuntime ?? 0)} />
        <DeviceStatCard title="Tổng phiên" value={runtime?.totalSessions ?? 0} />
        <DeviceStatCard title="Rung động trung bình" value={(runtime?.avgVibration ?? 0).toFixed(2)} />
        <DeviceStatCard title="Số điểm dữ liệu" value={runtime?.totalDataPoints ?? 0} />
      </div>

      <Card className="border-primary/15 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{statusLabel}</Badge>
            <Badge variant={device?.vehiclePlate ? 'secondary' : 'outline'}>
              {device?.vehiclePlate ? `Xe: ${device.vehiclePlate}` : 'Chưa gán phương tiện'}
            </Badge>
            <Badge variant={device?.customerName ? 'secondary' : 'outline'}>
              {device?.customerName ? `Khách hàng: ${device.customerName}` : 'Chưa gán khách hàng'}
            </Badge>
          </div>

          <div>
            <p className="text-2xl font-semibold tracking-tight">{device?.deviceName ?? 'Thiết bị IoT'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {device?.deviceId ?? '-'} - cập nhật {formatRelative(device?.lastSeenAt ?? null)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">IMEI</p>
              <p className="mt-1 text-sm font-medium">{device?.imei ?? '-'}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Firmware</p>
              <p className="mt-1 text-sm font-medium">{device?.firmwareVersion ?? '-'}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Chu kỳ gửi</p>
              <p className="mt-1 text-sm font-medium">{device?.requestInterval ?? 60}s</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Ngưỡng rung</p>
              <p className="mt-1 text-sm font-medium">{device?.vibrationThreshold ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bối cảnh vận hành</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Trạng thái hiện tại</p>
              <p className="font-medium">{statusLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phiên hiện tại</p>
              <p className="font-medium">
                {device?.currentSession?.id ? `#${device.currentSession.id}` : 'Không có'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bắt đầu phiên</p>
              <p className="font-medium">{formatRelative(device?.currentSession?.serverSessionStart ?? null)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kết thúc phiên</p>
              <p className="font-medium">{formatRelative(device?.currentSession?.serverSessionEnd ?? null)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tổng runtime trên thiết bị</p>
              <p className="font-medium">{formatDuration(device?.totalRuntimeSeconds ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mã lỗi gần nhất</p>
              <p className="font-medium">{device?.lastErrorCode ?? '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Snapshot telemetry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Vibration hiện tại</p>
                <p className="font-semibold">{latestVibration ? latestVibration.value.toFixed(2) : '-'}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Mốc dữ liệu</p>
                <p className="font-semibold">
                  {latestVibration?.timestamp ? formatRelative(latestVibration.timestamp) : '-'}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Số điểm rung (bộ lọc)</p>
                <p className="font-semibold">{vibrationChart.length}</p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 px-3 py-2">
              <p className="text-xs text-muted-foreground">Tọa độ</p>
              <p className="mt-1 font-medium">
                {formatCoordinate(device?.latitude)}, {formatCoordinate(device?.longitude)}
              </p>
            </div>

            {hasCoordinate ? (
              <Button asChild variant="outline" size="sm">
                <a href="/dashboard/map">Mở vị trí thiết bị trên bản đồ</a>
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Thiết bị chưa có tọa độ hợp lệ để hiển thị trên bản đồ.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
