import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DeviceStatCard } from '@/features/devices/components/stat-card';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import { formatDateTime, formatDuration, formatNumber, formatRelative } from '@/lib/utils/date/format';
import Link from 'next/link';
import { useDeviceDetailModal } from './modal-context';
import {
  extractLatestDiagnosticsSnapshot,
  type ObdDiagnosticsSnapshot as DiagnosticsSnapshot,
} from './obd-diagnostics';
import {
  formatCoordinateLabel,
  formatSecondsLabel,
  getFreshnessSeconds,
  getObservedCadenceSeconds,
  getTelemetryFreshnessState,
} from './telemetry-insights';

const OBD_STALE_SAMPLE_MS = 30_000;
const OBD_COOLANT_WARNING_C = 105;

type ObdHealthState = 'good' | 'warning' | 'inactive' | 'offline' | 'unknown';

const TELEMETRY_STATE_META = {
  healthy: { label: 'Đúng chu kỳ', variant: 'default' as const },
  warning: { label: 'Hơi chậm', variant: 'secondary' as const },
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
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return '-';
  }
  const unit = value > 24 ? '%' : 'V';
  return `${value.toFixed(1)}${unit}`;
};

const formatTemperatureMetric = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? '-' : `${value.toFixed(1)}°C`;

const alertSeverityLabel: Record<'low' | 'medium' | 'high' | 'critical', string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  critical: 'Nghiêm trọng',
};

const readinessLabel: Record<string, string> = {
  misfire: 'Đánh lửa sai kỳ',
  fuel_system: 'Hệ nhiên liệu',
  comprehensive_components: 'Thành phần tổng quát',
  catalyst: 'Bộ xúc tác',
  heated_catalyst: 'Bộ xúc tác gia nhiệt',
  evaporative_system: 'EVAP',
  secondary_air_system: 'Hệ khí phụ',
  oxygen_sensor: 'Cảm biến O2',
  oxygen_sensor_heater: 'Sưởi cảm biến O2',
  egr_vvt_system: 'EGR/VVT',
  boost_pressure: 'Áp suất tăng áp',
  exhaust_gas_sensor: 'Cảm biến khí xả',
  pm_filter: 'Bộ lọc hạt',
};

const formatDtcList = (codes: string[] | undefined): string =>
  codes && codes.length > 0 ? codes.join(', ') : '-';

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
    recommendations.push(
      `Hạng mục tự chẩn đoán chưa hoàn tất: ${snapshot.readinessIncomplete.join(', ')}.`,
    );
  }

  return recommendations.length > 0
    ? recommendations.slice(0, 3)
    : ['OBD đang ổn định, tiếp tục theo dõi định kỳ trong modal thiết bị.'];
};

const InfoTile = ({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <p>{label}</p>
      {description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Giải thích ${label}`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs leading-5">
            {description}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
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

  const diagnosticsSnapshot = extractLatestDiagnosticsSnapshot(rawFeed, readinessLabel);
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
  const latestDeviceBattery =
    latestTrackingRow?.deviceBattery ?? positionSnapshot?.deviceBattery ?? latestTrackingRow?.battery ?? null;
  const latestVehicleBattery =
    latestTrackingRow?.vehicleBattery ?? positionSnapshot?.vehicleBattery ?? positionSnapshot?.battery ?? null;
  const latestEngineTemperature =
    positionSnapshot?.engineTemperature ??
    diagnosticsSnapshot?.coolantC ??
    latestTrackingRow?.engineTemperature ??
    latestTrackingRow?.temperature ??
    null;
  const lastTelemetryLabel = latestTrackingRow?.timestamp
    ? `${formatDateTime(latestTrackingRow.timestamp)} (${formatRelative(latestTrackingRow.timestamp)})`
    : '-';

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
            <CardTitle className="text-base">Ngữ cảnh thiết bị</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <InfoTile
              label="Thiết bị"
              value={device?.deviceName ?? '-'}
              description="Tên hiển thị của bộ tracker trong hệ thống điều hành."
            />
            <InfoTile
              label="Mã thiết bị"
              value={device?.deviceId ?? '-'}
              description="Định danh duy nhất để tra cứu telemetry, lệnh và lịch sử kết nối."
            />
            <InfoTile
              label="Trạng thái"
              value={DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? '-'}
              description="Trạng thái vận hành hiện tại được suy ra từ phiên chạy và nhịp telemetry."
            />
            <InfoTile
              label="Cập nhật gần nhất"
              value={formatRelative(device?.lastSeenAt ?? null)}
              description="Khoảng thời gian từ lúc backend nhận được tín hiệu gần nhất của thiết bị."
            />
            <InfoTile
              label="Tọa độ gần nhất"
              value={formatCoordinateLabel(latestPosition.latitude, latestPosition.longitude, 6)}
              description="Vị trí GPS gần nhất đã được hệ thống chấp nhận là hợp lệ."
            />
            <InfoTile
              label="Tốc độ hiện tại"
              value={latestSpeed !== null ? `${latestSpeed.toFixed(1)} km/h` : '-'}
              description="Tốc độ hiện tại lấy từ điểm telemetry mới nhất có tọa độ hợp lệ."
            />
            <InfoTile
              label="Pin thiết bị"
              value={formatBatteryMetric(latestDeviceBattery)}
              description="Mức pin hoặc điện áp cấp cho tracker, tách riêng khỏi ắc quy xe."
            />
            <InfoTile
              label="Ắc quy xe"
              value={formatBatteryMetric(latestVehicleBattery)}
              description="Điện áp ắc quy phía xe/nguồn OBD mà firmware gửi lên cloud."
            />
            <InfoTile
              label="Nhiệt độ động cơ"
              value={formatTemperatureMetric(latestEngineTemperature)}
              description="Ưu tiên lấy từ coolant OBD; nếu thiếu sẽ lấy nhiệt độ vận hành gần nhất."
            />
            <InfoTile
              label="Firmware"
              value={device?.firmwareVersion ?? '-'}
              description="Phiên bản firmware hiện tại mà thiết bị đã báo về server."
            />
            <InfoTile
              label="IMEI"
              value={device?.imei ?? '-'}
              description="Mã định danh modem phục vụ truy vết phần cứng và SIM."
            />
            <InfoTile
              label="Chu kỳ gửi đã cấu hình"
              value={formatSecondsLabel(configuredCadence)}
              description="Nhịp gửi dữ liệu mà cloud đang lưu cho thiết bị trên cấu hình hiện hành."
            />
            <InfoTile label="Biển số" value={device?.vehiclePlate ?? '-'} />
            <InfoTile label="Khách hàng" value={device?.customerName ?? '-'} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Tình trạng gửi dữ liệu</CardTitle>
                <Badge variant={telemetryState.variant}>{telemetryState.label}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <InfoTile
                label="Khoảng gửi thực tế"
                value={formatSecondsLabel(observedCadence)}
                description="Khoảng cách trung vị giữa các bản tin gần đây, dùng để so với chu kỳ đã cấu hình."
              />
              <InfoTile
                label="Bản tin mới nhất cách đây"
                value={formatSecondsLabel(telemetryFreshness)}
                description="Khoảng thời gian tính từ mốc telemetry gần nhất đến hiện tại."
              />
              <InfoTile
                label="Mốc telemetry mới nhất"
                value={lastTelemetryLabel}
              />
              <InfoTile label="Phiên vận hành" value={formatNumber(runtime?.totalSessions ?? sessions.length)} />
              <InfoTile label="Lệnh điều khiển" value={formatNumber(commands.length)} />
              <InfoTile label="Mã lỗi đang lưu" value={formatNumber(errorCodes.length)} />
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
                  label="Tự chẩn đoán chưa hoàn tất"
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
    </div>
  );
};

