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
          <CardTitle className="text-sm">Selected device</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Select a marker to inspect telemetry details.
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
        <p>Plate: {device.vehiclePlate ?? '-'}</p>
        <p>Status: {MAP_STATUS_LABELS[device.status]}</p>
        <p>Speed: {device.speed} km/h</p>
        <p>Heading: {device.heading}°</p>
        <p>
          Lat/Lon: {device.lat.toFixed(5)}, {device.lon.toFixed(5)}
        </p>
        <p>Updated: {formatDateTime(device.timestamp)}</p>
      </CardContent>
    </Card>
  );
};
