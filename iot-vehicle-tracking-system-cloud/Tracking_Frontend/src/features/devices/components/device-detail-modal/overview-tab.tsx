import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeviceStatCard } from '@/features/devices/components/stat-card';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import type { DeviceRawFeedRow } from '@/features/devices/types';
import { formatDateTime, formatDuration, formatNumber, formatRelative } from '@/lib/utils/date/format';
import Link from 'next/link';
import { RuntimeTab } from './runtime-tab';
import { useDeviceDetailModal } from './modal-context';
import {
  formatCoordinateLabel,
  formatSecondsLabel,
  getFreshnessSeconds,
  getObservedCadenceSeconds,
  getTelemetryFreshnessState,
} from './telemetry-insights';

const OBD_STALE_SAMPLE_MS = 30_000;
const OBD_COOLANT_WARNING_C = 105;

interface DiagnosticsSnapshot {
  bleConnected?: boolean;
  elmReady?: boolean;
  ecuState?: string;
  sampleAgeMs?: number;
  connectFailCount5m?: number;
  milOn?: boolean;
  reportedDtcCount?: number;
  rpm?: number;
  obdSpeedKph?: number;
  coolantC?: number;
  engineLoadPct?: number;
  dtcStored?: string[];
  dtcPending?: string[];
  dtcPermanent?: string[];
  readinessIncomplete?: string[];
}

type ObdHealthState = 'good' | 'warning' | 'inactive' | 'offline' | 'unknown';

const TELEMETRY_STATE_META = {
  healthy: { label: 'Đúng nhịp', variant: 'default' as const },
  warning: { label: 'Bắt đầu trễ', variant: 'secondary' as const },
  stale: { label: 'Trễ rõ rệt', variant: 'outline' as const },
  offline: { label: 'Mất tín hiệu', variant: 'destructive' as const },
  unknown: { label: 'Chưa đủ dữ liệu', variant: 'outline' as const },
};

const healthLabel: Record<ObdHealthState, string> = {
  good: 'Ổn định',
  warning: 'Cảnh báo',
  inactive: 'ECU dừng',
  offline: 'Mất kết nối',
  unknown: 'Chưa có dữ liệu',
};

const healthBadgeVariant: Record<
  ObdHealthState,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  good: 'default',
  warning: 'secondary',
  inactive: 'outline',
  offline: 'destructive',
  unknown: 'outline',
};

const obdEcuStateLabel: Record<string, string> = {
  live: 'Đang trả PID',
  stopped: 'ECU đang dừng',
  no_data: 'Không có dữ liệu PID',
  searching: 'Đang dò giao thức',
  error: 'Lỗi phản hồi OBD',
  unknown: 'Chưa rõ',
  disconnected: 'Ngắt kết nối',
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

const formatBatteryMetric = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }
  const unit = value > 24 ? '%' : 'V';
  return `${value.toFixed(1)}${unit}`;
};

const alertSeverityLabel: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nghiêm trọng',
};

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

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const toStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : undefined;
};

const readinessLabel: Record<string, string> = {
  misfire: 'misfire',
  fuel_system: 'fuel system',
  comprehensive_components: 'components',
  catalyst: 'catalyst',
  heated_catalyst: 'heated catalyst',
  evaporative_system: 'EVAP',
  secondary_air_system: 'secondary air',
  oxygen_sensor: 'O2 sensor',
  oxygen_sensor_heater: 'O2 heater',
  egr_vvt_system: 'EGR/VVT',
  boost_pressure: 'boost pressure',
  exhaust_gas_sensor: 'exhaust gas sensor',
  pm_filter: 'PM filter',
};

const formatDtcList = (codes: string[] | undefined): string =>
  codes && codes.length > 0 ? codes.join(', ') : '-';

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
    const dtc = toRecord(diagnostics.dtc);
    const readiness = toRecord(diagnostics.readiness);
    const readinessIncomplete = readiness
      ? Object.entries(readiness)
          .filter(([, status]) => status === 'incomplete')
          .map(([key]) => readinessLabel[key] ?? key)
      : undefined;

    return {
      bleConnected:
        channel?.ble_obd_connected === undefined ? undefined : Boolean(channel.ble_obd_connected),
      elmReady: channel?.elm_ready === undefined ? undefined : Boolean(channel.elm_ready),
      ecuState: toOptionalString(channel?.ecu_state),
      sampleAgeMs: toFiniteNumber(quality?.sample_age_ms),
      connectFailCount5m: toFiniteNumber(channel?.connect_fail_count_5m),
      milOn: diagnostics.mil_on === undefined ? undefined : Boolean(diagnostics.mil_on),
      reportedDtcCount: toFiniteNumber(diagnostics.reported_dtc_count),
      rpm: toFiniteNumber(signals?.rpm),
      obdSpeedKph: toFiniteNumber(signals?.obd_speed_kph),
      coolantC: toFiniteNumber(signals?.coolant_c),
      engineLoadPct: toFiniteNumber(signals?.engine_load_pct),
      dtcStored: toStringArray(dtc?.stored),
      dtcPending: toStringArray(dtc?.pending),
      dtcPermanent: toStringArray(dtc?.permanent),
      readinessIncomplete,
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

  if (snapshot.ecuState === 'stopped') {
    return 'inactive';
  }

  if (
    snapshot.ecuState === 'searching' ||
    snapshot.ecuState === 'no_data' ||
    snapshot.milOn === true ||
    (snapshot.dtcStored?.length ?? 0) > 0 ||
    (snapshot.dtcPending?.length ?? 0) > 0 ||
    (snapshot.connectFailCount5m !== undefined && snapshot.connectFailCount5m >= 3) ||
    (snapshot.sampleAgeMs !== undefined && snapshot.sampleAgeMs > OBD_STALE_SAMPLE_MS) ||
    (snapshot.coolantC !== undefined && snapshot.coolantC >= OBD_COOLANT_WARNING_C)
  ) {
    return 'warning';
  }

  if (snapshot.bleConnected === true && snapshot.elmReady === true && snapshot.ecuState === 'live') {
    return 'good';
  }

  return 'unknown';
};

const buildObdRecommendations = (snapshot: DiagnosticsSnapshot | null): string[] => {
  if (!snapshot) {
    return ['Chưa có snapshot OBD. Hãy mở kết nối và gửi telemetry để hiển thị phân tích.'];
  }

  const recommendations: string[] = [];
  const storedDtc = snapshot.dtcStored ?? [];
  const pendingDtc = snapshot.dtcPending ?? [];
  const permanentDtc = snapshot.dtcPermanent ?? [];

  if (snapshot.bleConnected === false || snapshot.elmReady === false) {
    recommendations.push('Kiểm tra adapter OBD BLE, nguồn cổng OBD và vị trí thiết bị.');
  }
  if (snapshot.milOn === true) {
    recommendations.push('MIL đang bật. Nên kiểm tra DTC stored/pending để xác định nguyên nhân gốc.');
  }
  if (storedDtc.length > 0) {
    recommendations.push(`Stored DTC: ${storedDtc.join(', ')}.`);
  }
  if (pendingDtc.length > 0) {
    recommendations.push(`Pending DTC: ${pendingDtc.join(', ')}.`);
  }
  if (permanentDtc.length > 0) {
    recommendations.push(`Permanent DTC: ${permanentDtc.join(', ')}.`);
  }
  if (snapshot.ecuState === 'stopped') {
    recommendations.push(
      'ECU đang trả trạng thái STOPPED. Hãy bật ignition hoặc đánh thức bus OBD trước khi kỳ vọng PID thời gian thực.',
    );
  }
  if (snapshot.ecuState === 'searching' || snapshot.ecuState === 'no_data') {
    recommendations.push(
      'OBD đã nối nhưng ECU chưa trả PID hợp lệ. Kiểm tra giao thức xe, nguồn OBD và thời điểm wakeup.',
    );
  }
  if (snapshot.connectFailCount5m !== undefined && snapshot.connectFailCount5m >= 3) {
    recommendations.push('Lỗi kết nối OBD lặp lại nhiều trong 5 phút gần nhất.');
  }
  if (snapshot.coolantC !== undefined && snapshot.coolantC >= OBD_COOLANT_WARNING_C) {
    recommendations.push('Nhiệt độ nước làm mát cao, nên kiểm tra hệ thống làm mát.');
  }
  if (
    snapshot.rpm !== undefined &&
    snapshot.obdSpeedKph !== undefined &&
    snapshot.rpm > 900 &&
    snapshot.obdSpeedKph <= 3
  ) {
    recommendations.push('RPM cao khi xe gần như đứng yên, nên kiểm tra chế độ không tải.');
  }
  if (snapshot.readinessIncomplete && snapshot.readinessIncomplete.length > 0) {
    recommendations.push(`Monitor chưa complete: ${snapshot.readinessIncomplete.join(', ')}.`);
  }

  return recommendations.length > 0
    ? recommendations.slice(0, 3)
    : ['OBD đang ổn định, tiếp tục theo dõi định kỳ trong modal thiết bị.'];
};

const InfoTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-semibold">{value}</p>
  </div>
);

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

  const diagnosticsSnapshot = extractLatestDiagnostics(rawFeed);
  const obdHealthState = resolveObdHealthState(diagnosticsSnapshot);
  const obdRecommendations = buildObdRecommendations(diagnosticsSnapshot);
  const configuredCadence = device?.requestInterval ?? 60;
  const observedCadence = getObservedCadenceSeconds(trackingRowsAscending);
  const latestTelemetryTimestamp =
    latestTrackingRow?.timestamp ?? positionSnapshot?.timestamp ?? device?.lastSeenAt ?? null;
  const telemetryFreshness = getFreshnessSeconds(latestTelemetryTimestamp);
  const telemetryState = TELEMETRY_STATE_META[
    getTelemetryFreshnessState(telemetryFreshness, configuredCadence)
  ];

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
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DeviceStatCard title="Quãng đường ước tính" value={`${distanceKm.toFixed(2)} km`} />
        <DeviceStatCard
          title="Tốc độ TB / tối đa"
          value={`${averageSpeed.toFixed(1)} / ${maxSpeed.toFixed(1)} km/h`}
        />
        <DeviceStatCard title="Runtime" value={formatDuration(runtime?.totalRuntime ?? 0)} />
        <DeviceStatCard title="Mẫu telemetry" value={formatNumber(trackingRowsAscending.length)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin vận hành</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <InfoTile label="Thiết bị" value={device?.deviceName ?? '-'} />
            <InfoTile label="Mã thiết bị" value={device?.deviceId ?? '-'} />
            <InfoTile
              label="Trạng thái"
              value={DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? '-'}
            />
            <InfoTile label="Cập nhật gần nhất" value={formatRelative(device?.lastSeenAt ?? null)} />
            <InfoTile label="Tọa độ gần nhất" value={formatCoordinateLabel(latestPosition.latitude, latestPosition.longitude, 6)} />
            <InfoTile
              label="Tốc độ hiện tại"
              value={latestSpeed !== null ? `${latestSpeed.toFixed(1)} km/h` : '-'}
            />
            <InfoTile
              label="Pin / nhiệt độ"
              value={`${formatBatteryMetric(latestBattery)} · ${latestTemperature !== null ? `${latestTemperature.toFixed(1)}°C` : '-'}`}
            />
            <InfoTile label="Firmware" value={device?.firmwareVersion ?? '-'} />
            <InfoTile label="IMEI" value={device?.imei ?? '-'} />
            <InfoTile label="Chu kỳ gửi cấu hình" value={formatSecondsLabel(configuredCadence)} />
            <InfoTile label="Biển số" value={device?.vehiclePlate ?? '-'} />
            <InfoTile label="Khách hàng" value={device?.customerName ?? '-'} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Tình trạng telemetry</CardTitle>
                <Badge variant={telemetryState.variant}>{telemetryState.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <InfoTile label="Nhịp quan sát" value={formatSecondsLabel(observedCadence)} />
              <InfoTile label="Độ tươi bản tin" value={formatSecondsLabel(telemetryFreshness)} />
              <InfoTile
                label="Mốc mới nhất"
                value={
                  latestTrackingRow?.timestamp
                    ? `${formatDateTime(latestTrackingRow.timestamp)} (${formatRelative(latestTrackingRow.timestamp)})`
                    : '-'
                }
              />
              <InfoTile label="Phiên chạy" value={formatNumber(runtime?.totalSessions ?? sessions.length)} />
              <InfoTile label="Lệnh điều khiển" value={formatNumber(commands.length)} />
              <InfoTile label="Mã lỗi" value={formatNumber(errorCodes.length)} />
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
                <InfoTile
                  label="Trạng thái ECU OBD"
                  value={diagnosticsSnapshot?.ecuState ? (obdEcuStateLabel[diagnosticsSnapshot.ecuState] ?? diagnosticsSnapshot.ecuState) : '-'}
                />
                <InfoTile
                  label="Độ trễ mẫu"
                  value={diagnosticsSnapshot?.sampleAgeMs !== undefined ? `${diagnosticsSnapshot.sampleAgeMs.toFixed(0)} ms` : '-'}
                />
                <InfoTile
                  label="Lỗi kết nối / 5 phút"
                  value={diagnosticsSnapshot?.connectFailCount5m !== undefined ? diagnosticsSnapshot.connectFailCount5m.toFixed(0) : '-'}
                />
                <InfoTile
                  label="MIL / số DTC báo cáo"
                  value={`${diagnosticsSnapshot?.milOn === undefined ? '-' : diagnosticsSnapshot.milOn ? 'ON' : 'OFF'} / ${diagnosticsSnapshot?.reportedDtcCount !== undefined ? diagnosticsSnapshot.reportedDtcCount.toFixed(0) : '-'}`}
                />
                <InfoTile
                  label="RPM / tốc độ OBD"
                  value={`${diagnosticsSnapshot?.rpm !== undefined ? diagnosticsSnapshot.rpm.toFixed(0) : '-'} / ${diagnosticsSnapshot?.obdSpeedKph !== undefined ? `${diagnosticsSnapshot.obdSpeedKph.toFixed(1)} km/h` : '-'}`}
                />
                <InfoTile
                  label="Nhiệt độ nước / tải"
                  value={`${diagnosticsSnapshot?.coolantC !== undefined ? `${diagnosticsSnapshot.coolantC.toFixed(1)}°C` : '-'} / ${diagnosticsSnapshot?.engineLoadPct !== undefined ? `${diagnosticsSnapshot.engineLoadPct.toFixed(1)}%` : '-'}`}
                />
                <InfoTile
                  label="Readiness chưa complete"
                  value={
                    diagnosticsSnapshot?.readinessIncomplete && diagnosticsSnapshot.readinessIncomplete.length > 0
                      ? diagnosticsSnapshot.readinessIncomplete.join(', ')
                      : '-'
                  }
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <InfoTile label="Stored DTC" value={formatDtcList(diagnosticsSnapshot?.dtcStored)} />
                <InfoTile label="Pending DTC" value={formatDtcList(diagnosticsSnapshot?.dtcPending)} />
                <InfoTile
                  label="Permanent DTC"
                  value={formatDtcList(diagnosticsSnapshot?.dtcPermanent)}
                />
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
                    <Link href="/dashboard/attention/maintenance">Mở trang bảo trì</Link>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Runtime gần đây</CardTitle>
            <p className="text-xs text-muted-foreground">
              Giữ biểu đồ runtime trong tổng quan để tránh trùng vai trò với tab lộ trình.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <RuntimeTab />
        </CardContent>
      </Card>
    </div>
  );
};
