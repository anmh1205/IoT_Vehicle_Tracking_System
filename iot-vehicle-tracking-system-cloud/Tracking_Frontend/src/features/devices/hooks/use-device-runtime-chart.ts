import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type { DeviceRuntimeBucket } from '@/features/devices/types';
import { formatDateTime } from '@/lib/utils/date/format';
export type RuntimeRange = '7d' | '30d' | '90d' | '1y';
const rangeToLimit = (range: RuntimeRange): number => {
  if (range === '7d') return 7;
  if (range === '30d') return 30;
  if (range === '90d') return 90;
  return 365;
};
export const useDeviceRuntimeChart = (deviceId: number | null) => {
  const [range, setRange] = useState<RuntimeRange>('30d');
  const limit = rangeToLimit(range);
  const query = useQuery({
    queryKey: ['device-runtime-chart', deviceId, range],
    queryFn: () =>
      deviceDetailServices.getSessions(deviceId as number, { page: 1, limit }).then((payload) => {
        const sessions = Array.isArray(payload?.sessions)
          ? payload.sessions
          : Array.isArray(payload?.items)
            ? payload.items
            : Array.isArray(payload?.data?.sessions)
              ? payload.data.sessions
              : [];
        return sessions.map((row: any) => ({
          label: formatDateTime(row?.serverSessionStart ?? row?.server_session_start, 'dd/MM'),
          runtimeSeconds: Number(row?.uptime ?? 0),
        })) as DeviceRuntimeBucket[];
      }),
    enabled: !!deviceId,
  });
  const totalRuntime = useMemo(
    () => (query.data ?? []).reduce((sum, item) => sum + item.runtimeSeconds, 0),
    [query.data],
  );
  return {
    ...query,
    data: query.data ?? [],
    totalRuntime,
    range,
    onRangeChange: setRange,
  };
};
