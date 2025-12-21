'use client';

import { ClockIcon, ZapIcon, AlertTriangleIcon, PauseCircleIcon } from 'lucide-react';
import { useDeviceRuntimeRealtime } from '@/hooks/useDeviceRuntimeRealtime';
import { useDeviceStatusRealtime } from '@/hooks/useDeviceStatusRealtime';
import { formatTime, formatTimestamp } from '@/lib/utils/date/format';
import {
  DEVICE_COLORS,
  DEVICE_GRADIENTS,
  DEVICE_SHADOWS,
  DEVICE_ANIMATIONS,
  DEVICE_HOVER,
  DEVICE_RADIUS,
  DEVICE_SPACING,
  DEVICE_GLASS
} from './device-design-constants';

interface IDeviceCardProps {
  device: Device.DeviceDto;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function DeviceCard({ device, onView }: IDeviceCardProps) {
  const { status, timeRemaining, progress, isNearTimeout } = useDeviceStatusRealtime({
    last_seen_at: device.last_seen_at,
    request_interval: device.request_interval ?? null,
    current_status: device.current_status
  });

  const { quarterRuntime, totalRuntime } = useDeviceRuntimeRealtime({
    baseQuarterRuntime: device.quarter_runtime_seconds ?? 0,
    baseTotalRuntime: device.total_runtime_seconds ?? 0,
    currentStatus: status, // Use derived status from useDeviceStatusRealtime, not device.current_status
    lastSeenAt: device.last_seen_at
  });

  const getStatusColor = (s?: string | null) => {
    switch (s) {
      case 'running':
        return isNearTimeout
          ? DEVICE_GRADIENTS.status.disconnected
          : DEVICE_GRADIENTS.status.running;
      case 'disconnected':
        return DEVICE_GRADIENTS.status.disconnected;
      case 'stopped':
        return DEVICE_GRADIENTS.status.stopped;
      default:
        return 'bg-muted/60';
    }
  };

  const getStatusIcon = (s?: string | null) => {
    switch (s) {
      case 'running':
        return <ZapIcon className='w-6 h-6 text-white' />;
      case 'disconnected':
        return <AlertTriangleIcon className='w-6 h-6 text-white' />;
      case 'stopped':
        return <PauseCircleIcon className='w-6 h-6 text-white' />;
      default:
        return <ZapIcon className='w-6 h-6 text-white' />;
    }
  };

  const progressWidth = Math.max(0, Math.min(100, 100 - progress));
  const progressGradient =
    status === 'running'
      ? isNearTimeout
        ? DEVICE_GRADIENTS.progress.warning
        : progress < 70
        ? DEVICE_GRADIENTS.progress.healthy
        : DEVICE_GRADIENTS.progress.danger
      : 'bg-transparent';

  return (
    <div
      className={`group cursor-pointer ${DEVICE_RADIUS.card} bg-card border-2 border-border/80 dark:border-border/60 shadow-xl ${DEVICE_ANIMATIONS.transition.normal} hover:-translate-y-1 hover:shadow-2xl dark:hover:shadow-2xl hover:border-primary/60 dark:hover:border-primary/40 overflow-hidden`}
      onClick={onView}
    >
      <div className={`${DEVICE_SPACING.card.md} sm:p-6 bg-gradient-to-b from-muted/30 to-muted/50 dark:from-muted/20 dark:to-muted/30 border border-border/80 dark:border-border/60 rounded-2xl`}>
        {/* Header */}
        <div className='relative mb-5'>
          <div
            className={`mb-4 ${DEVICE_RADIUS.md} border border-primary/30 dark:border-primary/40 bg-primary/10 dark:bg-primary/15 p-4 sm:p-5 ${DEVICE_ANIMATIONS.transition.colors} group-hover:border-primary/50 dark:group-hover:border-primary/60 group-hover:bg-primary/15 dark:group-hover:bg-primary/20`}
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-3'>
                <div
                  className={`flex h-12 w-12 items-center justify-center ${DEVICE_RADIUS.icon} ${getStatusColor(status)} shadow-md ${DEVICE_ANIMATIONS.transition.colors} group-hover:scale-105`}
                >
                  {getStatusIcon(status)}
                </div>
                <div>
                  <h3 className='line-clamp-1 text-lg font-bold text-foreground sm:text-xl'>
                    {device.device_name || 'Unnamed'}
                  </h3>
                  <p className='font-mono text-xs text-muted-foreground sm:text-sm'>
                    ID: {device.device_id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className={`mb-4 grid grid-cols-2 ${DEVICE_SPACING.gap.sm}`}>
          <div
            className={`${DEVICE_RADIUS.md} border border-primary/30 dark:border-primary/40 bg-primary/10 dark:bg-primary/15 p-3 text-center sm:p-4 shadow-sm ${DEVICE_ANIMATIONS.transition.normal} group-hover:shadow-md group-hover:bg-primary/15 dark:group-hover:bg-primary/20`}
          >
            <div className='mb-1 text-lg font-bold text-foreground sm:text-xl truncate'>
              {formatTime(quarterRuntime)}
            </div>
            <div className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide'>GIỜ QUÝ</div>
          </div>
          <div
            className={`${DEVICE_RADIUS.md} border border-primary/30 dark:border-primary/40 bg-primary/10 dark:bg-primary/15 p-3 text-center sm:p-4 shadow-sm ${DEVICE_ANIMATIONS.transition.normal} group-hover:shadow-md group-hover:bg-primary/15 dark:group-hover:bg-primary/20`}
          >
            <div className='mb-1 text-lg font-bold text-foreground sm:text-xl truncate'>
              {formatTime(totalRuntime)}
            </div>
            <div className='text-[10px] font-semibold text-muted-foreground uppercase tracking-wide'>TỔNG GIỜ</div>
          </div>
        </div>

        {/* Progress bar with gradient */}
        <div className='mb-4'>
          <div className='h-1.5 rounded-full bg-muted/60 dark:bg-muted/40 overflow-hidden'>
            {status === 'running' && timeRemaining > 0 ? (
              <div
                className={`h-full ${progressGradient} ${DEVICE_ANIMATIONS.transition.slow}`}
                style={{ width: `${progressWidth}%` }}
              />
            ) : (
              <div className='h-full bg-transparent' style={{ width: '0%' }} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between pt-2 text-sm'>
          <div className='flex items-center text-muted-foreground'>
            <ClockIcon className='mr-2 h-4 w-4 opacity-70' />
            <span className='text-xs sm:text-[13px]'>{formatTimestamp(device.last_seen_at)}</span>
          </div>
          <div className='text-xs font-semibold text-primary transition-colors group-hover:text-primary/80 sm:text-sm'>
            Chi tiết →
          </div>
        </div>
      </div>
    </div>
  );
}

