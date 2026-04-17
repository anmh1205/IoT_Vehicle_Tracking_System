'use client';
import { Clock3, Cpu, Gauge, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/utils/date/format';
import { DEVICE_STATUS_LABELS, DEVICE_STATUS_VARIANTS } from './device-constants';
import { getDeviceRuntimeHours } from './device-utils';
import { DEVICE_ANIMATIONS, DEVICE_SHADOWS } from './device-design-constants';
import type { Device } from '@/features/devices/types';

interface DeviceCardProps {
  device: Device;
  onClick?: (device: Device) => void;
}

export const DeviceCard = ({ device, onClick }: DeviceCardProps) => {
  const interactive = typeof onClick === 'function';

  return (
    <Card
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Mở chi tiết thiết bị ${device.deviceName}` : undefined}
      className={`${DEVICE_ANIMATIONS.hoverLift} ${DEVICE_SHADOWS.soft} ${interactive ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none' : ''}`}
      onClick={interactive ? () => onClick(device) : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick(device);
              }
            }
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="line-clamp-1 text-base">{device.deviceName}</CardTitle>
          <Badge variant={DEVICE_STATUS_VARIANTS[device.currentStatus] ?? 'outline'}>
            {DEVICE_STATUS_LABELS[device.currentStatus] ?? device.currentStatus}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{device.deviceId}</p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded border bg-muted/40 p-2">
            <p className="text-xs text-muted-foreground">Thời gian hoạt động</p>
            <p className="font-semibold">{getDeviceRuntimeHours(device)}h</p>
          </div>
          <div className="rounded border bg-muted/40 p-2">
            <p className="text-xs text-muted-foreground">Firmware</p>
            <p className="font-semibold">{device.firmwareVersion ?? '-'}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5" />
            {device.imei ?? 'Không có IMEI'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Radio className="h-3.5 w-3.5" />
            {device.lastSeenAt ? 'Trực tuyến' : 'Ngoại tuyến'}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" />
            Chu kỳ cấu hình: {device.requestInterval ?? 60} giây
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {device.lastSeenAt ? `Cập nhật ${formatRelative(device.lastSeenAt)}` : 'Chưa có telemetry'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};