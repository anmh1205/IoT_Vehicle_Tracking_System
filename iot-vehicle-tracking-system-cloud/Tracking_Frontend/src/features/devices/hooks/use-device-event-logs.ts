import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';

interface EventLogsResult {
  items: Record<string, unknown>[];
  total: number;
}

const normalizeEventLogs = (payload: any): EventLogsResult => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];

  const total = Number(payload?.pagination?.total ?? payload?.data?.pagination?.total ?? items.length);

  return {
    items,
    total,
  };
};

export const useDeviceEventLogs = (
  deviceId: number | string | null,
  options: { enabled?: boolean; limit?: number } = {},
) => {
  const enabled = options.enabled ?? true;
  const limit = options.limit ?? 20;

  const query = useQuery({
    queryKey: ['device-event-logs', deviceId, limit],
    queryFn: () =>
      deviceServices
        .getEventLogs(deviceId!, { page: 1, limit })
        .then((payload) => normalizeEventLogs(payload)),
    enabled: enabled && deviceId !== null,
  });

  return {
    ...query,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
  };
};
