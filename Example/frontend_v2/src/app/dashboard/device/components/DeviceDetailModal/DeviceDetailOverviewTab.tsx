'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelative, formatTimestamp, formatTime } from '@/lib/utils/date/format';
import { STATUS_LABEL, STATUS_VARIANT } from '../device-constants';
import { formatHours } from '../device-utils';
import { Spec } from './Spec';
import { useDeviceRuntimeRealtime } from '@/hooks/useDeviceRuntimeRealtime';
import { useDeviceStatusRealtime } from '@/hooks/useDeviceStatusRealtime';
import { DEVICE_SPACING, DEVICE_SHADOWS, DEVICE_ANIMATIONS, DEVICE_HOVER } from '../device-design-constants';
import { Clock, Settings, BarChart3, Cpu } from 'lucide-react';

type DetailPayload = {
  device: Device.DeviceDetail;
  runtimeStats?: Device.RuntimeStats | null;
  realtimeData?: Device.RealtimeData | null;
};

export function DeviceDetailOverviewTab({ detail }: { detail: DetailPayload }) {
  const device = detail.device;
  const runtimeStats = detail.runtimeStats ?? null;
  const realtime = detail.realtimeData ?? null;
  // Backend returns imei, firmware_version directly on device, not in technical object
  const technical = device?.technical ?? {
    imei: (device as any)?.imei ?? null,
    firmware_version: (device as any)?.firmware_version ?? null,
    battery_top: null,
    battery_bot: null,
    signal_strength: null,
    temperature: null
  };

  const lastHeartbeat = realtime?.last_heartbeat ?? device.last_seen_at ?? null;

  // Use same status calculation logic as DeviceCard
  const { status: derivedStatus } = useDeviceStatusRealtime({
    last_seen_at: lastHeartbeat,
    request_interval: device.request_interval ?? null,
    current_status: realtime?.current_status ?? device.current_status ?? null
  });

  // Realtime runtime based on last heartbeat
  const baseQuarterFromBackend = runtimeStats?.quarter ?? device.quarter_runtime_seconds ?? 0;
  const baseTotalFromBackend = runtimeStats?.total ?? device.total_runtime_seconds ?? 0;

  const { quarterRuntime, totalRuntime } = useDeviceRuntimeRealtime({
    baseQuarterRuntime: baseQuarterFromBackend,
    baseTotalRuntime: baseTotalFromBackend,
    currentStatus: derivedStatus, // Use derived status from useDeviceStatusRealtime, same as DeviceCard
    lastSeenAt: lastHeartbeat
  });

  const statusValue = derivedStatus ?? 'stopped';

  // Delta so far since backend snapshot (dùng chung cho tất cả thống kê)
  const liveDeltaSeconds =
    derivedStatus === 'running'
      ? Math.max(0, totalRuntime - baseTotalFromBackend)
      : 0;

  // Get battery values: prefer realtime, then technical, then latest session
  const batteryTop = 
    realtime?.battery_top ?? 
    technical.battery_top ?? 
    runtimeStats?.latest_session?.avg_battery_top ?? 
    null;
  const batteryBot = 
    realtime?.battery_bot ?? 
    technical.battery_bot ?? 
    runtimeStats?.latest_session?.avg_battery_bot ?? 
    null;
  const batteryTotal =
    batteryTop != null && batteryBot != null
      ? batteryTop + batteryBot
      : batteryTop != null
        ? batteryTop
        : batteryBot != null
          ? batteryBot
          : null;

  // Get other technical values: prefer realtime, then technical
  const vibrationLevel = realtime?.vibration_level ?? runtimeStats?.latest_session?.avg_vibration ?? null;
  const temperature = realtime?.temperature ?? technical.temperature ?? null;
  const signalStrength = realtime?.signal_strength ?? technical.signal_strength ?? null;
  const imei = technical.imei ?? (device as any)?.imei ?? null;
  const firmwareVersion = technical.firmware_version ?? (device as any)?.firmware_version ?? null;

  return (
    <div className={`grid ${DEVICE_SPACING.gap.md} md:grid-cols-2`}>
      <Card
        className={`border border-primary/20 bg-primary/5 ${DEVICE_SHADOWS.card} ${DEVICE_ANIMATIONS.transition.normal} ${DEVICE_HOVER.card}`}
      >
        <CardHeader className='pb-4'>
          <CardTitle className='flex items-center gap-2 text-lg font-bold uppercase'>
            <Clock className='h-5 w-5 text-primary' />
            Trạng thái
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-3 text-sm`}>
          <div className='flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2'>
            <span className='text-sm font-semibold text-foreground uppercase'>Thời gian quý</span>
            <span className='text-sm font-semibold text-foreground'>{formatHours(quarterRuntime)}</span>
          </div>
          <div className='flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2'>
            <span className='text-sm font-semibold text-foreground uppercase'>Tổng thời gian chạy</span>
            <span className='text-sm font-semibold text-foreground'>{formatHours(totalRuntime)}</span>
          </div>
          <div className='flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2'>
            <span className='text-sm font-semibold text-foreground uppercase'>Cập nhật cuối</span>
            <span className='text-sm font-semibold text-foreground'>{lastHeartbeat ? formatTimestamp(lastHeartbeat) : '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card
        className={`border border-emerald-500/20 bg-emerald-500/5 ${DEVICE_SHADOWS.card} ${DEVICE_ANIMATIONS.transition.normal} ${DEVICE_HOVER.card}`}
      >
        <CardHeader className='pb-4'>
          <CardTitle className='flex items-center gap-2 text-lg font-bold uppercase'>
            <Settings className='h-5 w-5 text-primary' />
            Cài đặt
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 text-sm'>
          <div className='flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2'>
            <span className='text-sm font-semibold text-foreground uppercase'>Ngưỡng rung</span>
            <span className='text-sm font-semibold text-foreground'>
              {device.vibration_threshold != null ? `${device.vibration_threshold} mm/s` : '—'}
            </span>
          </div>
          <div className='flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2'>
            <span className='text-sm font-semibold text-foreground uppercase'>Chu kỳ gửi dữ liệu</span>
            <span className='text-sm font-semibold text-foreground'>
              {device.request_interval != null ? `${device.request_interval} ms` : '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card
        className={`md:col-span-2 border border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-500/15 dark:border-indigo-500/40 ${DEVICE_SHADOWS.card} ${DEVICE_ANIMATIONS.transition.normal} ${DEVICE_HOVER.card}`}
      >
        <CardHeader className='pb-4'>
          <CardTitle className='flex items-center gap-2 text-lg font-bold uppercase'>
            <BarChart3 className='h-5 w-5 text-primary' />
            Thống kê thời gian chạy
          </CardTitle>
        </CardHeader>
        <CardContent className={`grid ${DEVICE_SPACING.gap.sm} text-sm md:grid-cols-3`}>
          <Spec
            label='Hôm nay'
            value={
              runtimeStats
                ? formatTime((runtimeStats.today ?? 0) + liveDeltaSeconds)
                : null
            }
          />
          <Spec
            label='Tuần này'
            value={
              runtimeStats
                ? formatTime((runtimeStats.week ?? 0) + liveDeltaSeconds)
                : null
            }
          />
          <Spec
            label='Tháng này'
            value={
              runtimeStats
                ? formatTime((runtimeStats.month ?? 0) + liveDeltaSeconds)
                : null
            }
          />
          <Spec
            label='Quý này'
            value={
              runtimeStats
                ? formatTime((runtimeStats.quarter ?? 0) + liveDeltaSeconds)
                : formatTime(quarterRuntime)
            }
          />
          <Spec
            label='Năm nay'
            value={
              runtimeStats
                ? formatTime((runtimeStats.year ?? 0) + liveDeltaSeconds)
                : null
            }
          />
          <Spec
            label='Tổng tích lũy'
            value={
              runtimeStats
                ? formatTime((runtimeStats.total ?? 0) + liveDeltaSeconds)
                : formatHours(totalRuntime)
            }
          />
        </CardContent>
      </Card>

      <Card
        className={`md:col-span-2 border border-border bg-muted/20 ${DEVICE_SHADOWS.card} ${DEVICE_ANIMATIONS.transition.normal} ${DEVICE_HOVER.card}`}
      >
        <CardHeader className='pb-4'>
          <CardTitle className='flex items-center gap-2 text-lg font-bold uppercase'>
            <Cpu className='h-5 w-5 text-primary' />
            Thông số kỹ thuật / Realtime
          </CardTitle>
        </CardHeader>
        <CardContent className={`grid ${DEVICE_SPACING.gap.sm} text-sm md:grid-cols-2`}>
          <Spec label='IMEI' value={imei} />
          <Spec label='Firmware hiện tại' value={firmwareVersion} />
          <Spec 
            label='Pin tổng (V)' 
            value={batteryTotal != null ? `${batteryTotal.toFixed(2)} V` : null} 
          />
          <Spec 
            label='Tín hiệu' 
            value={signalStrength != null ? `${signalStrength} dBm` : null} 
          />
          <Spec 
            label='Pin top (V)' 
            value={batteryTop != null ? `${batteryTop.toFixed(2)} V` : null} 
          />
          <Spec 
            label='Rung hiện tại (mm/s)' 
            value={vibrationLevel != null ? `${vibrationLevel.toFixed(2)} mm/s` : null} 
          />
          <Spec 
            label='Pin bot (V)' 
            value={batteryBot != null ? `${batteryBot.toFixed(2)} V` : null} 
          />
          <Spec 
            label='Nhiệt độ' 
            value={temperature != null ? `${temperature.toFixed(1)} °C` : null} 
          />
        </CardContent>
      </Card>
    </div>
  );
}

