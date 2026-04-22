'use client';

import { Clock3, Cpu, Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDeviceRuntimeHours } from './device-utils';
import { DEVICE_ANIMATIONS, DEVICE_SHADOWS } from './device-design-constants';
import type { Device } from '@/features/devices/types';
import {
  getAlertSummaryPresentation,
  getDeviceRuntimePresentation,
  getEnginePresentation,
  getFreshnessPresentation,
  getMotionPresentation,
  type StateTone,
} from '@/lib/utils/device-state';

interface DeviceCardProps {
  device: Device;
  onClick?: (device: Device) => void;
}

const toneClassNames: Record<StateTone, string> = {
  neutral: 'border-border/70 bg-muted/40 text-foreground',
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

export const DeviceCard = ({ device, onClick }: DeviceCardProps) => {
  const interactive = typeof onClick === 'function';
  const freshness = getFreshnessPresentation(device.stateUpdatedAt ?? device.lastSeenAt);
  const engine = getEnginePresentation(device.ignitionState);
  const motion = getMotionPresentation(device.motionState);
  const runtime = getDeviceRuntimePresentation(device.deviceState);
  const deviceAlerts = getAlertSummaryPresentation(device.deviceAlerts, 'Thiết bị');
  const ecuAlerts = getAlertSummaryPresentation(device.ecuAlerts, 'ECU');

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
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="line-clamp-1 text-base">{device.deviceName}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {device.vehiclePlate ?? 'Chưa gán biển số'} · {device.deviceId}
            </p>
          </div>
          <Badge variant="outline" className={toneClassNames[freshness.tone]}>
            {freshness.label}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StateChip {...engine} />
          <StateChip {...motion} />
          <StateChip {...runtime} />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Tổng giờ hoạt động</p>
            <p className="mt-1 font-semibold">{getDeviceRuntimeHours(device)} giờ</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Firmware</p>
            <p className="mt-1 font-semibold">{device.firmwareVersion ?? '-'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Cpu className="h-3.5 w-3.5" />
            {device.imei ?? 'Không có IMEI'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" />
            Chu kỳ cấu hình: {device.requestInterval ?? 60} giây
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {device.lastSeenAt ? `Cập nhật ${new Date(device.lastSeenAt).toLocaleString('vi-VN')}` : 'Chưa có telemetry'}
          </span>
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
      </CardContent>
    </Card>
  );
};

