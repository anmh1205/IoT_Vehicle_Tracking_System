'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hasValidMapCoordinates } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';
import {
  getAlertSummaryPresentation,
  getDeviceRuntimePresentation,
  getEnginePresentation,
  getFreshnessPresentation,
  getMotionPresentation,
  type StateTone,
} from '@/lib/utils/device-state';

const toneClassNames: Record<StateTone, string> = {
  neutral: 'border-border/70 bg-muted/30 text-foreground',
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
};

const StateChip = ({ label, value, tone }: { label: string; value: string; tone: StateTone }) => (
  <div className={`rounded-xl border px-3 py-2 ${toneClassNames[tone]}`}>
    <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">{label}</p>
    <p className="mt-1 text-sm font-semibold">{value}</p>
  </div>
);

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-semibold">{value}</p>
  </div>
);

const formatBatteryMetric = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'Chưa có';
  }
  const unit = value > 24 ? '%' : 'V';
  return `${value.toFixed(1)}${unit}`;
};

export const SelectedDeviceCard = ({ device }: { device: DevicePosition | null }) => {
  if (!device) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thiết bị đã chọn</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Chọn một thiết bị để xem trạng thái động cơ, di chuyển, thiết bị và hai nhóm cảnh báo.
        </CardContent>
      </Card>
    );
  }

  const freshness = getFreshnessPresentation(device.stateUpdatedAt ?? device.timestamp);
  const engine = getEnginePresentation(device.ignitionState);
  const motion = getMotionPresentation(device.motionState);
  const runtime = getDeviceRuntimePresentation(device.deviceState);
  const deviceAlerts = getAlertSummaryPresentation(device.deviceAlerts, 'Cảnh báo thiết bị');
  const ecuAlerts = getAlertSummaryPresentation(device.ecuAlerts, 'Cảnh báo ECU');

  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="line-clamp-1 text-sm">{device.deviceName}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {device.vehiclePlate ?? 'Chưa gán phương tiện'} · {device.deviceId}
            </p>
          </div>
          <div className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClassNames[freshness.tone]}`}>
            {freshness.label}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StateChip {...engine} />
          <StateChip {...motion} />
          <StateChip {...runtime} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <StatItem label="Tốc độ" value={`${device.speed} km/h`} />
          <StatItem label="Tua máy" value={device.rpm != null ? `${device.rpm} rpm` : 'Chưa có'} />
          <StatItem label="Pin thiết bị" value={formatBatteryMetric(device.deviceBattery)} />
          <StatItem label="Ắc quy xe" value={formatBatteryMetric(device.vehicleBattery)} />
          <StatItem
            label="Nhiệt độ máy"
            value={device.engineTemperature != null ? `${device.engineTemperature}°C` : 'Chưa có'}
          />
          <StatItem
            label="Cập nhật"
            value={device.timestamp ? `${formatDateTime(device.timestamp)} (${formatRelative(device.timestamp)})` : 'Chưa có dữ liệu'}
          />
        </div>

        <div className="grid gap-2">
          <div className={`rounded-xl border px-3 py-2 ${toneClassNames[deviceAlerts.tone]}`}>
            <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">{deviceAlerts.label}</p>
            <p className="mt-1 text-sm font-medium">{deviceAlerts.summary}</p>
          </div>
          <div className={`rounded-xl border px-3 py-2 ${toneClassNames[ecuAlerts.tone]}`}>
            <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">{ecuAlerts.label}</p>
            <p className="mt-1 text-sm font-medium">{ecuAlerts.summary}</p>
          </div>
        </div>

        {hasValidMapCoordinates(device) ? (
          <div className="rounded-xl border bg-muted/20 px-3 py-2 text-xs">
            <p className="text-muted-foreground">Tọa độ hiện tại</p>
            <p className="mt-1 font-medium">
              {device.lat.toFixed(5)}, {device.lon.toFixed(5)}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
            Thiết bị chưa có tọa độ hợp lệ để hiển thị chính xác trên bản đồ.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
