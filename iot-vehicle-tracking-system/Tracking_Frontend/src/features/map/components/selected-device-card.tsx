'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MAP_STATUS_LABELS } from '@/features/map/constants/map-config';
import { formatDateTime } from '@/lib/utils/date/format';
import type { DevicePosition } from '@/features/map/types';
export const SelectedDeviceCard = ({ device }: { device: DevicePosition | null }) => {
  if (!device) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thiết bị đã chọn</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
Chọn một điểm đánh dấu để xem chi tiết telemetry.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{device.deviceName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-xs">
        <p>ID: {device.deviceId}</p>
        <p>Biển số: {device.vehiclePlate ?? '-'}</p>
        <p>Trạng thái: {MAP_STATUS_LABELS[device.status]}</p>
        <p>Tốc độ: {device.speed} km/h</p>
        <p>Hướng: {device.heading}°</p>
        <p>
          Vĩ độ/Kinh độ: {device.lat.toFixed(5)}, {device.lon.toFixed(5)}
        </p>
        <p>Cập nhật: {formatDateTime(device.timestamp)}</p>
      </CardContent>
    </Card>
  );
};
