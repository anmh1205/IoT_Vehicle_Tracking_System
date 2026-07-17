import { deviceDetailServices } from '@/lib/api/device-detail';
import type { DeviceCommand } from '@/features/devices/types';
import { useInfiniteListQuery } from '@/hooks/use-infinite-list-query';

const normalizeCommand = (row: any): DeviceCommand => ({
  id: Number(row?.id ?? 0),
  deviceId: String(row?.deviceId ?? ''),
  command: String(row?.command ?? ''),
  params:
    row?.params && typeof row.params === 'object' && !Array.isArray(row.params) ? row.params : {},
  status: String(row?.status ?? 'pending'),
  sentAt: row?.sentAt ?? null,
  ackedAt: row?.ackedAt ?? null,
  response: row?.response ? String(row.response) : null,
});

const extractCommands = (payload: any): DeviceCommand[] => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];
  return items.map(normalizeCommand);
};

export const useDeviceCommands = (deviceId: number | null, pageSize = 10) => {
  const query = useInfiniteListQuery<DeviceCommand>({
    queryKey: ['device-commands', deviceId],
    pageSize,
    enabled: !!deviceId,
    queryFn: ({ page, limit }) =>
      deviceDetailServices.getCommands(deviceId as number, { page, limit }),
    selectItems: extractCommands,
  });

  return {
    ...query,
    items: query.items,
    total: query.total,
    loadedCount: query.loadedCount,
    hasMore: query.hasMore,
    onLoadMore: query.loadMore,
  };
};
