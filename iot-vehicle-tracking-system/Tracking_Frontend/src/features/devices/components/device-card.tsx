'use client';
import { Cpu, Gauge, Radio, Waves } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEVICE_STATUS_LABELS, DEVICE_STATUS_VARIANTS } from './device-constants';
import { getDeviceRuntimeHours } from './device-utils';
import { DEVICE_ANIMATIONS, DEVICE_SHADOWS } from './device-design-constants';
import type { Device } from '@/features/devices/types';
interface DeviceCardProps {
  device: Device;
  onClick?: (device: Device) => void;
}
export const DeviceCard = ({ device, onClick }: DeviceCardProps) => {
  return (
    <Card
      className={`${DEVICE_ANIMATIONS.hoverLift} ${DEVICE_SHADOWS.soft} cursor-pointer`}
      onClick={() => onClick?.(device)}
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
            <p className="text-xs text-muted-foreground">Runtime</p>
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
            {device.imei ?? 'No IMEI'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Radio className="h-3.5 w-3.5" />
            {device.lastSeenAt ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Gauge className="h-3.5 w-3.5" />
          Request interval: {device.requestInterval ?? 60}s
          <Waves className="ml-2 h-3.5 w-3.5" />
          Vib threshold: {device.vibrationThreshold ?? 0}
        </div>
      </CardContent>
    </Card>
  );
};
