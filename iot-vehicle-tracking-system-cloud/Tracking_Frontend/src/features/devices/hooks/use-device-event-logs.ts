import { useQuery } from '@tanstack/react-query';
import { systemAdminServices } from '@/lib/api/system-admin';

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
  devicePublicId: string | null,
  options: { enabled?: boolean; limit?: number } = {},
) => {
  const enabled = options.enabled ?? true;
  const limit = options.limit ?? 20;

  const query = useQuery({
    queryKey: ['device-event-logs', devicePublicId, limit],
    queryFn: () =>
      systemAdminServices
        .queryTable('event_logs', {
          page: 1,
          limit,
          search: devicePublicId ?? undefined,
        })
        .then((payload) => normalizeEventLogs(payload)),
    enabled: enabled && !!devicePublicId,
  });

  return {
    ...query,
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
  };
};
