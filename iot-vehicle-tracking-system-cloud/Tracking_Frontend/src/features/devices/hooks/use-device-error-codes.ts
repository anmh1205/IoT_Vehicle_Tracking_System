import { useMemo, useState } from 'react';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type { DeviceErrorCode } from '@/features/devices/types';
import { useInfiniteListQuery } from '@/hooks/use-infinite-list-query';

type ErrorStatusFilter = 'all' | 'active' | 'resolved';
type ErrorTypeFilter = 'all' | 'critical' | 'warning' | 'info';

const localizeErrorDescription = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (/GPS jitter spike resolved after dense urban segment/i.test(trimmed)) {
    return 'Dao động GPS đã ổn định lại sau đoạn đô thị dày nhà cao tầng.';
  }

  return trimmed;
};

const localizeErrorName = (value: string, description: string, errorCode: number): string => {
  const trimmed = value.trim();

  if (/^Code 8$/i.test(trimmed) && /GPS jitter/i.test(description)) {
    return 'GPS dao động mạnh';
  }

  if (/^Code 7$/i.test(trimmed) && /connection lost/i.test(description)) {
    return 'Mất kết nối';
  }

  return trimmed || `Code ${errorCode}`;
};

const toErrorCodes = (
  payload: any,
): DeviceErrorCode[] => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];
  return items.map((row: any) => {
    const errorCode = Number(row?.errorCode ?? 0);
    const rawDescription = String(row?.description ?? row?.message ?? '');
    const description = localizeErrorDescription(rawDescription);
    const rawName = String(row?.errorName ?? `Code ${errorCode}`);

    return {
      id: Number(row?.id ?? 0),
      errorCode,
      errorName: localizeErrorName(rawName, rawDescription, errorCode),
      description,
      severity: row?.severity ? String(row.severity) : undefined,
      status: row?.status ? String(row.status) : undefined,
      occurredAt: String(row?.occurredAt ?? row?.createdAt ?? ''),
      resolvedAt: row?.resolvedAt ?? null,
    };
  });
};
const getErrorType = (row: DeviceErrorCode): ErrorTypeFilter => {
  const severity = String(row.severity ?? '').toLowerCase();
  if (severity === 'critical' || severity === 'high') return 'critical';
  if (severity === 'medium' || severity === 'low') return 'warning';
  if (/^[PCBU][0-9A-F]{4}$/i.test(row.errorName)) return 'warning';
  if (row.errorCode >= 500) return 'critical';
  if (row.errorCode >= 200) return 'warning';
  return 'info';
};
export const useDeviceErrorCodes = (deviceId: number | null, pageSize = 10) => {
  const [status, setStatus] = useState<ErrorStatusFilter>('all');
  const [type, setType] = useState<ErrorTypeFilter>('all');
  const query = useInfiniteListQuery<DeviceErrorCode>({
    queryKey: ['device-errors', deviceId],
    pageSize,
    enabled: !!deviceId,
    queryFn: ({ page, limit }) =>
      deviceDetailServices.getErrors(deviceId as number, { page, limit }),
    selectItems: toErrorCodes,
  });
  const filtered = useMemo(() => {
    const items = query.items;
    return items.filter((item) => {
      if (status === 'active' && item.resolvedAt) return false;
      if (status === 'resolved' && !item.resolvedAt) return false;
      if (type !== 'all' && getErrorType(item) !== type) return false;
      return true;
    });
  }, [query.items, status, type]);
  return {
    ...query,
    items: filtered,
    total: query.total,
    loadedCount: query.loadedCount,
    hasMore: query.hasMore,
    status,
    type,
    onLoadMore: query.loadMore,
    onStatusChange: setStatus,
    onTypeChange: setType,
  };
};
