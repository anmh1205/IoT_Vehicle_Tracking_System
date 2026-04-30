import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type { DeviceVibrationPoint } from '@/features/devices/types';
export type VibrationPeriod = '1h' | '6h' | '24h' | '7d';
const periodToFrom = (period: VibrationPeriod): string => {
  const now = Date.now();
  const ms =
    period === '1h'
      ? 3600000
      : period === '6h'
        ? 21600000
        : period === '24h'
          ? 86400000
          : 604800000;
  return new Date(now - ms).toISOString();
};
export const useDeviceVibrationChart = (deviceId: number | null) => {
  const [period, setPeriod] = useState<VibrationPeriod>('24h');
  const query = useQuery({
    queryKey: ['device-vibration-chart', deviceId, period],
    queryFn: () =>
      deviceDetailServices
        .getTelemetry(deviceId as number, {
          metric: 'vibration',
          from: periodToFrom(period),
          to: new Date().toISOString(),
        })
        .then((payload) => {
          const points = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.items)
              ? payload.items
              : Array.isArray(payload?.data?.items)
                ? payload.data.items
                : [];
          return points.map((row: any) => ({
            timestamp: String(row?.timestamp ?? ''),
            value: Number(row?.value ?? 0),
          })) as DeviceVibrationPoint[];
        }),
    enabled: !!deviceId,
  });
  return {
    ...query,
    data: query.data ?? [],
    period,
    onPeriodChange: setPeriod,
  };
};
