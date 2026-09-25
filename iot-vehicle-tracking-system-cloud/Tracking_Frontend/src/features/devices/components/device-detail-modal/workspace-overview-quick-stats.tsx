'use client';

import { useVehicleAllowedZone } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import {
  describeBoundarySelections,
  formatAllowedZoneRadius,
  getZoneTypeLabel,
} from '@/features/geofences/lib/allowed-zone-form';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';
import {
  getConnectivityPresentation,
  getDeviceRuntimePresentation,
  getVehicleStatePresentation,
} from '@/lib/utils/device-state';
import {
  formatElectricalMetric,
  formatTemperatureMetric,
  pickLatestTelemetryTimestamp,
  pickLatestTelemetryValue,
  resolveEngineTemperatureValue,
  resolveVehicleBatteryValue,
} from './device-detail-presenters';
import { useDeviceDetailModal } from './modal-context';
import { formatCoordinateLabel } from './telemetry-insights';
import { formatNumber } from '@/lib/utils/date/format';

const MEMBERSHIP_LABELS: Record<string, string> = {
  inside: 'Đang ở trong vùng',
  outside: 'Đang ra ngoài vùng',
  suspect: 'Có tín hiệu nghi ngờ',
  unknown: 'Chưa xác định được trạng thái',
};

const QuickStatTile = ({
  label,
  note,
  value,
}: {
  label: string;
  note: string;
  value: string;
}) => (
  <div className="rounded-2xl border border-border/70 bg-muted/10 px-3 py-3">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-2 break-words text-sm font-semibold leading-6 text-foreground sm:text-[15px]">
      {value}
    </p>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
  </div>
);

const CompactQuickStatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border/70 bg-muted/10 px-3 py-3">
    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-2 break-words text-sm font-semibold leading-5 text-foreground">{value}</p>
  </div>
);

export const WorkspaceOverviewQuickStats = ({
  variant = 'full',
}: {
  variant?: 'full' | 'compact';
}) => {
  const {
    device,
    linkedVehicle,
    deviceScopedAlerts,
    latestTrackingRow,
    positionSnapshot,
  } = useDeviceDetailModal();

  const vehicleId = device?.vehicleId ?? linkedVehicle?.vehicleId ?? null;
  const { zoneQuery } = useVehicleAllowedZone(vehicleId, { enabled: variant === 'full' });
  const activeAlertCount =
    deviceScopedAlerts.filter((alert) => (alert.status ?? '').toLowerCase() === 'active').length ||
    deviceScopedAlerts.length;
  const zoneAlertCount = deviceScopedAlerts.filter((alert) => {
    const normalized = String(alert.alertType ?? '').toLowerCase();
    return normalized.startsWith('zone_') || normalized.startsWith('geofence');
  }).length;

  const latestTelemetryTimestamp = pickLatestTelemetryTimestamp(
    latestTrackingRow?.timestamp,
    positionSnapshot?.timestamp,
    device?.lastSeenAt ?? null,
  );
  const latestSpeed = pickLatestTelemetryValue(
    latestTrackingRow?.speed,
    latestTrackingRow?.timestamp,
    positionSnapshot?.speed,
    positionSnapshot?.timestamp,
  );
  const latestLatitude = pickLatestTelemetryValue(
    latestTrackingRow?.latitude,
    latestTrackingRow?.timestamp,
    positionSnapshot?.latitude,
    positionSnapshot?.timestamp,
    device?.latitude ?? null,
  );
  const latestLongitude = pickLatestTelemetryValue(
    latestTrackingRow?.longitude,
    latestTrackingRow?.timestamp,
    positionSnapshot?.longitude,
    positionSnapshot?.timestamp,
    device?.longitude ?? null,
  );
  const coordinateLabel = formatCoordinateLabel(latestLatitude, latestLongitude, 5);
  const vehicleBatteryValue = resolveVehicleBatteryValue(latestTrackingRow, positionSnapshot);
  const engineTemperatureValue = resolveEngineTemperatureValue(latestTrackingRow, positionSnapshot);
  const activeZone = zoneQuery.data ?? null;
  const vehicleState = getVehicleStatePresentation(device?.vehicleState);
  const runtimeState = getDeviceRuntimePresentation(device?.deviceState);
  const connectivityState = getConnectivityPresentation(device?.currentStatus);

  if (variant === 'compact') {
    const compactTiles = [
      {
        label: vehicleState.label,
        value: vehicleState.value,
      },
      {
        label: connectivityState.label,
        value: connectivityState.value,
      },
      {
        label: 'Ắc quy xe',
        value: formatElectricalMetric(vehicleBatteryValue),
      },
      {
        label: 'Nhiệt độ máy',
        value: formatTemperatureMetric(engineTemperatureValue),
      },
    ];

    return (
      <div className="rounded-3xl border border-border/70 bg-background/80 p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Thông số nhanh</p>
          <p className="text-xs text-muted-foreground">
            {latestTelemetryTimestamp ? `Cập nhật ${formatRelative(latestTelemetryTimestamp)}` : 'Chưa có telemetry'}
          </p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
          {compactTiles.map((tile) => (
            <CompactQuickStatTile key={tile.label} label={tile.label} value={tile.value} />
          ))}
        </div>
      </div>
    );
  }

  const zoneValue = !vehicleId
    ? 'Chưa gắn xe'
    : zoneQuery.isLoading
      ? 'Đang tải'
      : activeZone
        ? activeZone.zoneType === 'administrative_boundary'
          ? describeBoundarySelections(activeZone.boundarySelections)
          : formatAllowedZoneRadius(activeZone.radiusMeters)
        : 'Chưa cấu hình';

  const zoneNote = activeZone
    ? `${getZoneTypeLabel(activeZone.zoneType)} · ${MEMBERSHIP_LABELS[activeZone.membershipState] ?? 'Đang theo dõi'}`
    : vehicleId
      ? 'Mỗi xe chỉ có một vùng đang kích hoạt'
      : 'Cần gắn thiết bị với xe trước khi cấu hình';

  const tiles = [
    {
      label: vehicleState.label,
      value: vehicleState.value,
      note: device?.vehiclePlate ?? 'Chưa gắn biển số',
    },
    {
      label: connectivityState.label,
      value: connectivityState.value,
      note: device?.deviceId ?? 'Chưa có mã thiết bị',
    },
    {
      label: runtimeState.label,
      value: runtimeState.value,
      note: latestTelemetryTimestamp ? `Cập nhật ${formatRelative(latestTelemetryTimestamp)}` : 'Chưa có telemetry',
    },
    {
      label: 'Xe liên kết',
      value:
        linkedVehicle?.plateNumber ??
        linkedVehicle?.vehicleId ??
        device?.vehiclePlate ??
        'Chưa gắn xe',
      note: linkedVehicle?.customerName ?? device?.customerName ?? 'Chưa gắn khách hàng',
    },
    {
      label: 'Cảnh báo đang mở',
      value: `${activeAlertCount}`,
      note:
        activeAlertCount > 0
          ? 'Có cảnh báo cần theo dõi trong không gian làm việc'
          : 'Hiện không có cảnh báo mở',
    },
    {
      label: 'Tốc độ gần nhất',
      value: latestSpeed !== null ? `${formatNumber(latestSpeed)} km/h` : 'Chưa có dữ liệu',
      note: latestTrackingRow ? 'Lấy từ telemetry gần nhất' : 'Đang dùng ảnh chụp hiện có',
    },
    {
      label: 'Tọa độ',
      value: coordinateLabel,
      note:
        coordinateLabel === 'Chưa có vị trí'
          ? 'Thiết bị chưa có GPS hợp lệ'
          : 'Tọa độ dùng để nhảy nhanh trên bản đồ',
    },
    {
      label: 'Vùng',
      value: zoneValue,
      note: zoneNote,
    },
    {
      label: 'Cảnh báo vùng',
      value: zoneAlertCount > 0 ? `${zoneAlertCount} cảnh báo` : 'Không có cảnh báo',
      note: 'Gộp lịch sử cảnh báo vùng trong cùng một nhóm.',
    },
    {
      label: 'Ắc quy xe',
      value: formatElectricalMetric(vehicleBatteryValue),
      note: latestTelemetryTimestamp ? formatDateTime(latestTelemetryTimestamp) : 'Chưa có mốc telemetry',
    },
    {
      label: 'Nhiệt độ máy',
      value: formatTemperatureMetric(engineTemperatureValue),
      note: 'Ưu tiên telemetry mới nhất hoặc snapshot vị trí',
    },
  ];

  return (
    <div className="rounded-3xl border border-border/70 bg-background/80 p-4">
      <div>
        <p className="text-sm font-semibold">Thông số xem nhanh</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Giữ các tín hiệu vận hành cần đọc nhanh mà không chiếm vùng nội dung chính.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <QuickStatTile key={tile.label} label={tile.label} value={tile.value} note={tile.note} />
        ))}
      </div>
    </div>
  );
};
