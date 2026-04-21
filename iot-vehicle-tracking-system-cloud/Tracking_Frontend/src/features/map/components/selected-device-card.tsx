'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hasValidMapCoordinates, MAP_STATUS_LABELS } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

const STATUS_VARIANTS: Record<
  DevicePosition['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  running: 'default',
  online: 'secondary',
  stopped: 'outline',
  disconnected: 'outline',
  error: 'destructive',
};

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
          Chọn một thiết bị để xem telemetry, tốc độ, cảm biến và thời điểm cập nhật.
        </CardContent>
      </Card>
    );
  }

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
          <Badge variant={STATUS_VARIANTS[device.status]}>{MAP_STATUS_LABELS[device.status]}</Badge>
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
        </div>

        <div className="space-y-2 text-xs">
          <p>
            <span className="text-muted-foreground">Cập nhật gần nhất:</span>{' '}
            <span className="font-medium">
              {device.timestamp
                ? `${formatDateTime(device.timestamp)} (${formatRelative(device.timestamp)})`
                : 'Chưa có dữ liệu'}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Biển số:</span>{' '}
            <span className="font-medium">{device.vehiclePlate ?? 'Chưa gán phương tiện'}</span>
          </p>
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
