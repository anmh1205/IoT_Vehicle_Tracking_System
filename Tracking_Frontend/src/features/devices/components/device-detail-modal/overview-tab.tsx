import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceStatCard } from '@/features/devices/components/stat-card';
import { formatDuration, formatRelative } from '@/lib/utils/date/format';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import { useDeviceDetailModal } from './modal-context';
export const OverviewTab = () => {
  const { device, runtime, vibrationChart } = useDeviceDetailModal();
  const latestVibration = vibrationChart[vibrationChart.length - 1];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <DeviceStatCard title="Tổng runtime" value={formatDuration(runtime?.totalRuntime ?? 0)} />
        <DeviceStatCard title="Tổng phiên" value={runtime?.totalSessions ?? 0} />
        <DeviceStatCard title="Avg vibration" value={(runtime?.avgVibration ?? 0).toFixed(2)} />
        <DeviceStatCard title="Data points" value={runtime?.totalDataPoints ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin thiết bị</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Device ID</p>
            <p className="font-medium">{device?.deviceId ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tên thiết bị</p>
            <p className="font-medium">{device?.deviceName ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trạng thái</p>
            <p className="font-medium">
              {DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cập nhật gần nhất</p>
            <p className="font-medium">{formatRelative(device?.lastSeenAt ?? null)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IMEI</p>
            <p className="font-medium">{device?.imei ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Firmware</p>
            <p className="font-medium">{device?.firmwareVersion ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Request interval</p>
            <p className="font-medium">{device?.requestInterval ?? 60}s</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vibration threshold</p>
            <p className="font-medium">{device?.vibrationThreshold ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Realtime snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Vibration hiện tại</p>
            <p className="font-semibold">
              {latestVibration ? latestVibration.value.toFixed(2) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mốc dữ liệu</p>
            <p className="font-semibold">
              {latestVibration?.timestamp ? formatRelative(latestVibration.timestamp) : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tọa độ</p>
            <p className="font-semibold">
              {device?.latitude ?? '-'}, {device?.longitude ?? '-'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
