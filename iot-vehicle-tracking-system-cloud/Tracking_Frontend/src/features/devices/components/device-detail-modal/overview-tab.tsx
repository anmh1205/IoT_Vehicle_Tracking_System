import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/utils/date/format';
import {
  formatElectricalMetric,
  formatTemperatureMetric,
  getDeviceConfigSummary,
  resolveDeviceBatteryValue,
  resolveEngineTemperatureValue,
  resolveVehicleBatteryValue,
} from './device-detail-presenters';
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
import { AllowedZoneSetupSheet } from '@/features/geofences/components/allowed-zone-setup-sheet';
import { AllowedZoneStatusCard } from '@/features/geofences/components/allowed-zone-status-card';
import { useRoleAccess } from '@/hooks/use-role-access';

const OBD_STALE_SAMPLE_MS = 30_000;
const OBD_COOLANT_WARNING_C = 105;

type ObdHealthState = 'good' | 'warning' | 'inactive' | 'offline' | 'unknown';

type MatrixCell = {
  label: string;
  value: string;
  note?: string;
  colSpan?: 1 | 2;
  emphasize?: boolean;
};

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
    return ['Chưa có ảnh chụp OBD. Hãy kết nối bộ chuyển đổi rồi gửi dữ liệu đo từ xa để màn hình phân tích.'];
  }

  const recommendations: string[] = [];
  const storedDtc = snapshot.dtcStored ?? [];
  const pendingDtc = snapshot.dtcPending ?? [];
  const permanentDtc = snapshot.dtcPermanent ?? [];

  if (snapshot.bleConnected === false || snapshot.elmReady === false) {
    recommendations.push('Kiểm tra bộ chuyển đổi OBD BLE, nguồn cổng OBD và trạng thái đánh thức của thiết bị.');
  }
  if (snapshot.milOn === true) {
    recommendations.push('MIL đang bật. Nên kiểm tra ngay DTC đã lưu và DTC chờ xác nhận để xác định nguyên nhân gốc.');
  }
  if (storedDtc.length > 0) {
    recommendations.push(`DTC đang lưu: ${storedDtc.join(', ')}.`);
  }
  if (pendingDtc.length > 0) {
    recommendations.push(`DTC chờ xác nhận: ${pendingDtc.join(', ')}.`);
  }
  if (permanentDtc.length > 0) {
    recommendations.push(`DTC thường trực: ${permanentDtc.join(', ')}.`);
  }
  if (snapshot.ecuState === 'stopped') {
    recommendations.push('ECU đang ở trạng thái dừng. Cần bật khóa điện hoặc đánh thức bus OBD trước khi chờ PID thời gian thực.');
  }
  if (snapshot.ecuState === 'searching' || snapshot.ecuState === 'no_data') {
    recommendations.push('OBD đã nối nhưng ECU chưa trả PID hợp lệ. Kiểm tra giao thức xe và thứ tự wakeup.');
  }
  if (snapshot.connectFailCount5m !== undefined && snapshot.connectFailCount5m >= 3) {
    recommendations.push('Lỗi kết nối OBD đang lặp lại nhiều lần trong 5 phút gần nhất.');
  }
  if (snapshot.coolantC !== undefined && snapshot.coolantC >= OBD_COOLANT_WARNING_C) {
    recommendations.push('Nhiệt độ nước làm mát đang cao. Cần kiểm tra hệ thống làm mát và tải động cơ.');
  }
  if (
    snapshot.rpm !== undefined &&
    snapshot.obdSpeedKph !== undefined &&
    snapshot.rpm > 900 &&
    snapshot.obdSpeedKph <= 3
  ) {
    recommendations.push('Vòng tua cao khi xe gần như đứng yên. Nên kiểm tra chế độ không tải hoặc thao tác ga.');
  }
  if (snapshot.readinessIncomplete && snapshot.readinessIncomplete.length > 0) {
    recommendations.push(`Hạng mục tự kiểm tra chưa hoàn tất: ${snapshot.readinessIncomplete.join(', ')}.`);
  }

  return recommendations.length > 0
    ? recommendations.slice(0, 3)
    : ['OBD đang ổn định. Tiếp tục theo dõi định kỳ trong màn hình thiết bị.'];
};

const InfoMatrixCard = ({
  title,
  description,
  rows,
  badge,
  className = '',
}: {
  title: string;
  description?: string;
  rows: MatrixCell[][];
  badge?: ReactNode;
  className?: string;
}) => (
  <Card className={className}>
    <CardHeader className="space-y-1.5 pb-3">
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {badge}
      </div>
      {description ? <p className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
    </CardHeader>
    <CardContent className="pt-0">
      <Table>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={`${title}-${rowIndex}`} className="hover:bg-transparent">
              {row.map((cell, cellIndex) => (
                <TableCell
                  key={`${title}-${rowIndex}-${cell.label}-${cellIndex}`}
                  colSpan={cell.colSpan ?? 1}
                  className={[
                    'whitespace-normal break-words px-0 py-3 align-top',
                    row.length === 2 && cellIndex === 0 ? 'pr-5' : '',
                    row.length === 2 && cellIndex === 1 ? 'border-l pl-5' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{cell.label}</p>
                  <p
                    className={`mt-1 text-sm ${cell.emphasize ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'}`}
                  >
                    {cell.value}
                  </p>
                  {cell.note ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{cell.note}</p> : null}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export const OverviewTab = () => {
  const [allowedZoneOpen, setAllowedZoneOpen] = useState(false);
  const access = useRoleAccess();
  const {
    device,
    runtime,
    sessions,
    errorCodes,
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
  const configSummary = getDeviceConfigSummary(device);
  const observedCadence = getObservedCadenceSeconds(trackingRowsAscending);
  const latestTelemetryTimestamp =
    latestTrackingRow?.timestamp ?? positionSnapshot?.timestamp ?? device?.lastSeenAt ?? null;
  const telemetryFreshness = getFreshnessSeconds(latestTelemetryTimestamp);
  const telemetryFreshnessState = getTelemetryFreshnessState(
    telemetryFreshness,
    configSummary.activeIntervalSec,
  );
  const telemetryState = TELEMETRY_STATE_META[telemetryFreshnessState];
  const metricsUseLastReportedValues =
    telemetryFreshnessState === 'stale' || telemetryFreshnessState === 'offline';

  const latestPosition = {
    latitude: latestTrackingRow?.latitude ?? positionSnapshot?.latitude ?? device?.latitude ?? null,
    longitude:
      latestTrackingRow?.longitude ?? positionSnapshot?.longitude ?? device?.longitude ?? null,
  };
  const latestSpeed = latestTrackingRow?.speed ?? positionSnapshot?.speed ?? null;
  const latestDeviceBattery = resolveDeviceBatteryValue(latestTrackingRow, positionSnapshot);
  const latestVehicleBattery = resolveVehicleBatteryValue(latestTrackingRow, positionSnapshot);
  const latestEngineTemperature = resolveEngineTemperatureValue(
    latestTrackingRow,
    positionSnapshot,
    diagnosticsSnapshot,
  );

  const speedLabel = metricsUseLastReportedValues ? 'Tốc độ bản tin cuối' : 'Tốc độ hiện tại';
  const deviceBatteryLabel = metricsUseLastReportedValues ? 'Pin thiết bị bản tin cuối' : 'Pin thiết bị';
  const vehicleBatteryLabel = metricsUseLastReportedValues ? 'Ắc quy xe bản tin cuối' : 'Ắc quy xe';
  const engineTemperatureLabel = metricsUseLastReportedValues
    ? 'Nhiệt độ động cơ bản tin cuối'
    : 'Nhiệt độ động cơ';

  const deviceRows: MatrixCell[][] = [
    [
      {
        label: 'Thiết bị',
        value: device?.deviceName ?? '-',
        note: device?.deviceId ?? 'Chưa có mã thiết bị',
        emphasize: true,
      },
      {
        label: 'Trạng thái',
        value: DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? '-',
        note: device?.vehiclePlate ? `Biển số ${device.vehiclePlate}` : 'Chưa gán biển số',
      },
    ],
    [
      {
        label: 'Khách hàng',
        value: device?.customerName ?? '-',
      },
      {
        label: 'Tọa độ gần nhất',
        value: formatCoordinateLabel(latestPosition.latitude, latestPosition.longitude, 6),
      },
    ],
    [
      {
        label: speedLabel,
        value: latestSpeed !== null ? `${latestSpeed.toFixed(1)} km/h` : '-',
      },
      {
        label: vehicleBatteryLabel,
        value: formatElectricalMetric(latestVehicleBattery),
      },
    ],
    [
      {
        label: deviceBatteryLabel,
        value: formatElectricalMetric(latestDeviceBattery),
      },
      {
        label: engineTemperatureLabel,
        value: formatTemperatureMetric(latestEngineTemperature),
      },
    ],
  ];

  const telemetryRows: MatrixCell[][] = [
    [
      {
        label: 'Chu kỳ gửi thực tế',
        value: formatSecondsLabel(observedCadence),
        note:
          telemetryFreshnessState === 'healthy'
            ? 'Đang bám gần chu kỳ cấu hình.'
            : telemetryFreshnessState === 'warning'
              ? 'Nhịp gửi chậm hơn mong đợi.'
              : telemetryFreshnessState === 'offline'
                ? 'Đã vượt ngưỡng mất tín hiệu.'
                : 'Chưa có đủ dữ liệu ổn định.',
        emphasize: true,
      },
      {
        label: 'Bản tin gần nhất',
        value: latestTelemetryTimestamp ? formatDateTime(latestTelemetryTimestamp) : '-',
        note: latestTelemetryTimestamp ? formatRelative(latestTelemetryTimestamp) : 'Chưa có dữ liệu đo từ xa.',
      },
    ],
    [
      {
        label: 'Quãng đường theo dải dữ liệu',
        value: `${distanceKm.toFixed(2)} km`,
      },
      {
        label: 'Bản tin đã nhận',
        value: formatNumber(trackingRowsAscending.length),
      },
    ],
    [
      {
        label: 'Tốc độ TB / tối đa',
        value: `${averageSpeed.toFixed(1)} / ${maxSpeed.toFixed(1)} km/h`,
      },
      {
        label: 'Phiên vận hành / mã lỗi',
        value: `${formatNumber(runtime?.totalSessions ?? sessions.length)} / ${formatNumber(errorCodes.length)}`,
      },
    ],
  ];

  const storedDtc = diagnosticsSnapshot?.dtcStored ?? [];
  const pendingDtc = diagnosticsSnapshot?.dtcPending ?? [];
  const permanentDtc = diagnosticsSnapshot?.dtcPermanent ?? [];
  const activeAlertSummary = obdAlertsLoading
    ? 'Đang tải cảnh báo OBD...'
    : obdActiveAlerts.length > 0
      ? obdActiveAlerts
          .slice(0, 2)
          .map((alert) => alert.title)
          .join(' · ')
      : 'Chưa có cảnh báo OBD nào đang hoạt động.';
  const connectionStateNote = diagnosticsSnapshot
    ? [
        diagnosticsSnapshot.bleConnected === true ? 'BLE ổn' : diagnosticsSnapshot.bleConnected === false ? 'BLE ngắt' : 'BLE chưa rõ',
        diagnosticsSnapshot.elmReady === true ? 'ELM sẵn sàng' : diagnosticsSnapshot.elmReady === false ? 'ELM chưa sẵn sàng' : 'ELM chưa rõ',
      ].join(' · ')
    : 'Chưa có ảnh chụp OBD để đánh giá kết nối.';

  const obdRows: MatrixCell[][] = [
    [
      {
        label: 'Trạng thái ECU',
        value: diagnosticsSnapshot?.ecuState
          ? obdEcuStateLabel[diagnosticsSnapshot.ecuState] ?? diagnosticsSnapshot.ecuState
          : '-',
        note: connectionStateNote,
        emphasize: true,
      },
      {
        label: 'MIL / số DTC báo cáo',
        value: `${diagnosticsSnapshot?.milOn === undefined ? '-' : diagnosticsSnapshot.milOn ? 'ON' : 'OFF'} / ${diagnosticsSnapshot?.reportedDtcCount !== undefined ? diagnosticsSnapshot.reportedDtcCount.toFixed(0) : '-'}`,
      },
    ],
    [
      {
        label: 'Độ trễ mẫu',
        value:
          diagnosticsSnapshot?.sampleAgeMs !== undefined
            ? `${diagnosticsSnapshot.sampleAgeMs.toFixed(0)} ms`
            : '-',
      },
      {
        label: 'Lỗi kết nối / 5 phút',
        value:
          diagnosticsSnapshot?.connectFailCount5m !== undefined
            ? diagnosticsSnapshot.connectFailCount5m.toFixed(0)
            : '-',
      },
    ],
    [
      {
        label: 'RPM / tốc độ OBD',
        value: `${diagnosticsSnapshot?.rpm !== undefined ? diagnosticsSnapshot.rpm.toFixed(0) : '-'} / ${diagnosticsSnapshot?.obdSpeedKph !== undefined ? `${diagnosticsSnapshot.obdSpeedKph.toFixed(1)} km/h` : '-'}`,
      },
      {
        label: 'Nhiệt độ / tải máy',
        value: `${diagnosticsSnapshot?.coolantC !== undefined ? `${diagnosticsSnapshot.coolantC.toFixed(1)}°C` : '-'} / ${diagnosticsSnapshot?.engineLoadPct !== undefined ? `${diagnosticsSnapshot.engineLoadPct.toFixed(1)}%` : '-'}`,
      },
    ],
    [
      {
        label: 'DTC hiện có',
        value: `Đã lưu ${storedDtc.length} · Chờ xác nhận ${pendingDtc.length} · Thường trực ${permanentDtc.length}`,
        note:
          storedDtc.length + pendingDtc.length + permanentDtc.length > 0
            ? [
                storedDtc.length > 0 ? `Đã lưu: ${storedDtc.join(', ')}` : '',
                pendingDtc.length > 0 ? `Chờ xác nhận: ${pendingDtc.join(', ')}` : '',
                permanentDtc.length > 0 ? `Thường trực: ${permanentDtc.join(', ')}` : '',
              ]
                .filter(Boolean)
                .join(' · ')
            : 'Chưa có mã DTC nào được báo cáo.',
        colSpan: 2,
      },
    ],
    [
      {
        label: 'Kiểm tra chưa hoàn tất',
        value:
          diagnosticsSnapshot?.readinessIncomplete && diagnosticsSnapshot.readinessIncomplete.length > 0
            ? diagnosticsSnapshot.readinessIncomplete.join(', ')
            : '-',
        note: 'Dùng để đánh giá trạng thái sẵn sàng của ECU trước khi kết luận trạng thái OBD.',
        colSpan: 2,
      },
    ],
    [
      {
        label: 'Khuyến nghị nhanh',
        value: obdRecommendations[0] ?? 'Không có hành động ngay.',
        note: obdRecommendations.slice(1).join(' · ') || undefined,
        colSpan: 2,
      },
    ],
    [
      {
        label: 'Cảnh báo bảo trì OBD',
        value: obdAlertsLoading ? 'Đang tải...' : `${formatNumber(obdActiveAlerts.length)} cảnh báo đang mở`,
        note: activeAlertSummary,
        colSpan: 2,
      },
    ],
  ];

  return (
    <div className="space-y-3">
      <AllowedZoneStatusCard
        vehicleId={device?.vehicleId ?? null}
        title="Vùng"
        canEdit={access.canEditDevice && Boolean(device?.vehicleId)}
        onConfigure={() => setAllowedZoneOpen(true)}
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
          <InfoMatrixCard
          title="Trạng thái thiết bị"
          rows={deviceRows}
          className="xl:w-[31%] xl:flex-none"
        />
        <InfoMatrixCard
          title="Tình trạng dữ liệu đo từ xa"
          rows={telemetryRows}
          badge={<Badge variant={telemetryState.variant}>{telemetryState.label}</Badge>}
          className="xl:w-[31%] xl:flex-none"
        />
        <InfoMatrixCard
          title="Trạng thái OBD"
          rows={obdRows}
          badge={<Badge variant={healthBadgeVariant[obdHealthState]}>{healthLabel[obdHealthState]}</Badge>}
          className="xl:min-w-0 xl:flex-1"
        />
      </div>

      <AllowedZoneSetupSheet
        open={allowedZoneOpen}
        onOpenChange={setAllowedZoneOpen}
        vehicleId={device?.vehicleId ?? null}
        vehicleLabel={device?.vehiclePlate ?? device?.vehicleId ?? device?.deviceName ?? null}
        canEdit={access.canEditDevice && Boolean(device?.vehicleId)}
      />
    </div>
  );
};
