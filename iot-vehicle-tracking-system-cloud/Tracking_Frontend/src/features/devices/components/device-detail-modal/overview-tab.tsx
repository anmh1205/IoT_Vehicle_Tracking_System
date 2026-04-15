import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceStatCard } from '@/features/devices/components/stat-card';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import { formatDateTime, formatDuration, formatNumber, formatRelative } from '@/lib/utils/date/format';
import { useDeviceDetailModal } from './modal-context';

const toCoordinateText = (latitude: number | null | undefined, longitude: number | null | undefined) =>
  latitude !== null &&
  latitude !== undefined &&
  longitude !== null &&
  longitude !== undefined &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude)
    ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    : '-';

export const OverviewTab = () => {
  const {
    device,
    runtime,
    sessions,
    errorCodes,
    commands,
    distanceKm,
    averageSpeed,
    maxSpeed,
    latestTrackingRow,
    positionSnapshot,
    trackingRowsAscending,
  } = useDeviceDetailModal();

  const latestPosition = {
    latitude: latestTrackingRow?.latitude ?? positionSnapshot?.latitude ?? device?.latitude ?? null,
    longitude:
      latestTrackingRow?.longitude ?? positionSnapshot?.longitude ?? device?.longitude ?? null,
  };

  const latestSpeed = latestTrackingRow?.speed ?? positionSnapshot?.speed ?? null;
  const latestBattery = latestTrackingRow?.battery ?? positionSnapshot?.battery ?? null;
  const latestTemperature = latestTrackingRow?.temperature ?? positionSnapshot?.temperature ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-4">
        <DeviceStatCard title="Quãng đường ước tính" value={`${distanceKm.toFixed(2)} km`} />
        <DeviceStatCard title="Tốc độ TB / tối đa" value={`${averageSpeed.toFixed(1)} / ${maxSpeed.toFixed(1)} km/h`} />
        <DeviceStatCard
          title="Runtime"
          value={runtime ? formatDuration(runtime.totalRuntime) : formatDuration(0)}
        />
        <DeviceStatCard
          title="Số mẫu telemetry"
          value={formatNumber(trackingRowsAscending.length)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin vận hành</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Thiết bị</p>
              <p className="font-medium">{device?.deviceName ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mã thiết bị</p>
              <p className="font-medium">{device?.deviceId ?? '-'}</p>
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
              <p className="text-xs text-muted-foreground">Tọa độ gần nhất</p>
              <p className="font-medium">
                {toCoordinateText(latestPosition.latitude, latestPosition.longitude)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tốc độ hiện tại</p>
              <p className="font-medium">{latestSpeed !== null ? `${latestSpeed.toFixed(1)} km/h` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pin / nhiệt độ</p>
              <p className="font-medium">
                {latestBattery !== null ? `${latestBattery.toFixed(1)}%` : '-'} ·{' '}
                {latestTemperature !== null ? `${latestTemperature.toFixed(1)}°C` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Firmware</p>
              <p className="font-medium">{device?.firmwareVersion ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">IMEI</p>
              <p className="font-medium">{device?.imei ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chu kỳ gửi</p>
              <p className="font-medium">{device?.requestInterval ?? 60}s</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Biển số</p>
              <p className="font-medium">{device?.vehiclePlate ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Khách hàng</p>
              <p className="font-medium">{device?.customerName ?? '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tình trạng dữ liệu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Phiên chạy</p>
              <p className="mt-1 text-base font-semibold">{formatNumber(runtime?.totalSessions ?? sessions.length)}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Lệnh điều khiển</p>
              <p className="mt-1 text-base font-semibold">{formatNumber(commands.length)}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Mã lỗi</p>
              <p className="mt-1 text-base font-semibold">{formatNumber(errorCodes.length)}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Mốc telemetry mới nhất</p>
              <p className="mt-1 font-medium">
                {latestTrackingRow?.timestamp
                  ? `${formatDateTime(latestTrackingRow.timestamp)} (${formatRelative(latestTrackingRow.timestamp)})`
                  : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
