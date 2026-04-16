import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceStatCard } from '@/features/devices/components/stat-card';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import type { DeviceRawFeedRow } from '@/features/devices/types';
import { formatDateTime, formatDuration, formatNumber, formatRelative } from '@/lib/utils/date/format';
import Link from 'next/link';
import { useDeviceDetailModal } from './modal-context';

const OBD_STALE_SAMPLE_MS = 30_000;
const OBD_COOLANT_WARNING_C = 105;

interface DiagnosticsSnapshot {
  bleConnected?: boolean;
  elmReady?: boolean;
  sampleAgeMs?: number;
  connectFailCount5m?: number;
  rpm?: number;
  obdSpeedKph?: number;
  coolantC?: number;
  engineLoadPct?: number;
  fuelLevelPct?: number;
}

type ObdHealthState = 'good' | 'warning' | 'offline' | 'unknown';

const toCoordinateText = (latitude: number | null | undefined, longitude: number | null | undefined) =>
  latitude !== null &&
  latitude !== undefined &&
  longitude !== null &&
  longitude !== undefined &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude)
    ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    : '-';

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const extractLatestDiagnostics = (rawFeed: DeviceRawFeedRow[]): DiagnosticsSnapshot | null => {
  for (const row of rawFeed) {
    const payload = toRecord(row.payload);
    if (!payload) {
      continue;
    }

    const rootDiagnostics = toRecord(payload.diagnostics);
    const contextDiagnostics = toRecord(toRecord(payload.context)?.diagnostics);
    const diagnostics = rootDiagnostics ?? contextDiagnostics;
    if (!diagnostics) {
      continue;
    }

    const channel = toRecord(diagnostics.channel);
    const signals = toRecord(diagnostics.signals);
    const quality = toRecord(diagnostics.quality);

    return {
      bleConnected:
        channel?.ble_obd_connected === undefined ? undefined : Boolean(channel.ble_obd_connected),
      elmReady: channel?.elm_ready === undefined ? undefined : Boolean(channel.elm_ready),
      sampleAgeMs: toFiniteNumber(quality?.sample_age_ms),
      connectFailCount5m: toFiniteNumber(channel?.connect_fail_count_5m),
      rpm: toFiniteNumber(signals?.rpm),
      obdSpeedKph: toFiniteNumber(signals?.obd_speed_kph),
      coolantC: toFiniteNumber(signals?.coolant_c),
      engineLoadPct: toFiniteNumber(signals?.engine_load_pct),
      fuelLevelPct: toFiniteNumber(signals?.fuel_level_pct),
    };
  }

  return null;
};

const resolveObdHealthState = (snapshot: DiagnosticsSnapshot | null): ObdHealthState => {
  if (!snapshot) {
    return 'unknown';
  }

  if (snapshot.bleConnected === false || snapshot.elmReady === false) {
    return 'offline';
  }

  if (
    (snapshot.connectFailCount5m !== undefined && snapshot.connectFailCount5m >= 3) ||
    (snapshot.sampleAgeMs !== undefined && snapshot.sampleAgeMs > OBD_STALE_SAMPLE_MS) ||
    (snapshot.coolantC !== undefined && snapshot.coolantC >= OBD_COOLANT_WARNING_C)
  ) {
    return 'warning';
  }

  if (snapshot.bleConnected === true && snapshot.elmReady === true) {
    return 'good';
  }

  return 'unknown';
};

const healthLabel: Record<ObdHealthState, string> = {
  good: 'Ổn định',
  warning: 'Cảnh báo',
  offline: 'Mất kết nối',
  unknown: 'Chưa có dữ liệu',
};

const healthBadgeVariant: Record<
  ObdHealthState,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  good: 'default',
  warning: 'secondary',
  offline: 'destructive',
  unknown: 'outline',
};

const alertSeverityBadgeVariant: Record<
  'low' | 'medium' | 'high' | 'critical',
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  critical: 'destructive',
};

const alertSeverityLabel: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nghiêm trọng',
};

const buildObdRecommendations = (snapshot: DiagnosticsSnapshot | null): string[] => {
  if (!snapshot) {
    return ['Chưa có snapshot OBD. Hãy mở kết nối và gửi telemetry để hiển thị phân tích.'];
  }

  const recommendations: string[] = [];

  if (snapshot.bleConnected === false || snapshot.elmReady === false) {
    recommendations.push('Kiểm tra adapter OBD BLE, nguồn cổng OBD và vị trí thiết bị.');
  }

  if (snapshot.connectFailCount5m !== undefined && snapshot.connectFailCount5m >= 3) {
    recommendations.push('Tần suất lỗi kết nối OBD cao, nên kiểm tra nhiễu BLE hoặc retry policy.');
  }

  if (snapshot.coolantC !== undefined && snapshot.coolantC >= OBD_COOLANT_WARNING_C) {
    recommendations.push(
      'Nhiệt độ nước làm mát cao, kiểm tra hệ thống làm mát trước chuyến tiếp theo.',
    );
  }

  if (
    snapshot.rpm !== undefined &&
    snapshot.obdSpeedKph !== undefined &&
    snapshot.rpm > 900 &&
    snapshot.obdSpeedKph <= 3
  ) {
    recommendations.push('RPM cao khi xe gần như đứng yên, nên kiểm tra chế độ không tải.');
  }

  if (recommendations.length === 0) {
    recommendations.push('OBD hiện ổn định, tiếp tục theo dõi định kỳ trong modal này.');
  }

  return recommendations.slice(0, 3);
};

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
    rawFeed,
    obdActiveAlerts,
    obdAlertsLoading,
  } = useDeviceDetailModal();

  const latestPosition = {
    latitude: latestTrackingRow?.latitude ?? positionSnapshot?.latitude ?? device?.latitude ?? null,
    longitude:
      latestTrackingRow?.longitude ?? positionSnapshot?.longitude ?? device?.longitude ?? null,
  };

  const latestSpeed = latestTrackingRow?.speed ?? positionSnapshot?.speed ?? null;
  const latestBattery = latestTrackingRow?.battery ?? positionSnapshot?.battery ?? null;
  const latestTemperature = latestTrackingRow?.temperature ?? positionSnapshot?.temperature ?? null;

  const diagnosticsSnapshot = extractLatestDiagnostics(rawFeed);
  const obdHealthState = resolveObdHealthState(diagnosticsSnapshot);
  const obdRecommendations = buildObdRecommendations(diagnosticsSnapshot);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

        <div className="space-y-4">
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

          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Sức khỏe OBD</CardTitle>
                <Badge variant={healthBadgeVariant[obdHealthState]}>{healthLabel[obdHealthState]}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Theo dõi kết nối OBD và tín hiệu bảo trì trực tiếp trong modal thiết bị.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Độ trễ mẫu</p>
                  <p className="mt-1 font-semibold">
                    {diagnosticsSnapshot?.sampleAgeMs !== undefined
                      ? `${diagnosticsSnapshot.sampleAgeMs.toFixed(0)} ms`
                      : '-'}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Lỗi kết nối / 5 phút</p>
                  <p className="mt-1 font-semibold">
                    {diagnosticsSnapshot?.connectFailCount5m !== undefined
                      ? diagnosticsSnapshot.connectFailCount5m.toFixed(0)
                      : '-'}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">RPM / tốc độ OBD</p>
                  <p className="mt-1 font-semibold">
                    {diagnosticsSnapshot?.rpm !== undefined ? diagnosticsSnapshot.rpm.toFixed(0) : '-'} /{' '}
                    {diagnosticsSnapshot?.obdSpeedKph !== undefined
                      ? `${diagnosticsSnapshot.obdSpeedKph.toFixed(1)} km/h`
                      : '-'}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
                  <p className="text-xs text-muted-foreground">Nhiệt độ nước / tải động cơ</p>
                  <p className="mt-1 font-semibold">
                    {diagnosticsSnapshot?.coolantC !== undefined
                      ? `${diagnosticsSnapshot.coolantC.toFixed(1)}°C`
                      : '-'} /{' '}
                    {diagnosticsSnapshot?.engineLoadPct !== undefined
                      ? `${diagnosticsSnapshot.engineLoadPct.toFixed(1)}%`
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
                <p className="text-xs font-medium text-primary">Khuyến nghị nhanh</p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {obdRecommendations.map((item, index) => (
                    <li key={`${item}-${index}`}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-200">
                    Cảnh báo bảo trì OBD đang hoạt động
                  </p>
                  <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                    <Link href="/dashboard/maintenance">Mở trang bảo trì</Link>
                  </Button>
                </div>

                {obdAlertsLoading ? (
                  <p className="mt-2 text-xs text-muted-foreground">Đang tải cảnh báo OBD...</p>
                ) : obdActiveAlerts.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {obdActiveAlerts.map((alert) => (
                      <div key={alert.id} className="rounded-md border bg-background/80 px-2 py-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium">{alert.title}</p>
                          <Badge
                            variant={alertSeverityBadgeVariant[alert.severity]}
                            className="text-[10px]"
                          >
                            {alertSeverityLabel[alert.severity]}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          {alert.message ?? 'Không có mô tả bổ sung từ nguồn cảnh báo.'}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Phát sinh: {alert.createdAt ? formatDateTime(alert.createdAt, 'dd/MM HH:mm') : '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Chưa có cảnh báo bảo trì OBD nào đang hoạt động cho thiết bị này.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
