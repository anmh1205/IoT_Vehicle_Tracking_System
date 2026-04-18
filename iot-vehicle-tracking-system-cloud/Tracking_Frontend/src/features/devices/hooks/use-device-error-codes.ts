import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type { DeviceErrorCode } from '@/features/devices/types';
type ErrorStatusFilter = 'all' | 'active' | 'resolved';
type ErrorTypeFilter = 'all' | 'critical' | 'warning' | 'info';
interface DeviceErrorCodesResult {
  items: DeviceErrorCode[];
  total: number;
  page: number;
  limit: number;
}
const toErrorCodes = (
  payload: any,
  fallbackPage: number,
  fallbackLimit: number,
): DeviceErrorCodesResult => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];
  return {
    items: items.map((row: any) => ({
      id: Number(row?.id ?? 0),
      errorCode: Number(row?.errorCode ?? row?.error_code ?? 0),
      errorName: String(
        row?.errorName ?? row?.error_name ?? `Code ${row?.errorCode ?? row?.error_code ?? 0}`,
      ),
      description: String(row?.description ?? row?.message ?? ''),
      occurredAt: String(
        row?.occurredAt ?? row?.occurred_at ?? row?.createdAt ?? row?.created_at ?? '',
      ),
      resolvedAt: row?.resolvedAt ?? row?.resolved_at ?? null,
    })),
    total: Number(payload?.total ?? payload?.pagination?.total ?? items.length),
    page: Number(payload?.page ?? payload?.pagination?.page ?? fallbackPage),
    limit: Number(payload?.limit ?? payload?.pagination?.limit ?? fallbackLimit),
  };
};
const getErrorType = (row: DeviceErrorCode): ErrorTypeFilter => {
  if (/^[PCBU][0-9A-F]{4}$/i.test(row.errorName)) return 'warning';
  if (row.errorCode >= 500) return 'critical';
  if (row.errorCode >= 200) return 'warning';
  return 'info';
};
export const useDeviceErrorCodes = (deviceId: number | null, pageSize = 10) => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ErrorStatusFilter>('all');
  const [type, setType] = useState<ErrorTypeFilter>('all');
  const query = useQuery({
    queryKey: ['device-errors', deviceId, page, pageSize],
    queryFn: () =>
      deviceDetailServices
        .getErrors(deviceId as number, { page, limit: pageSize })
        .then((data) => toErrorCodes(data, page, pageSize)),
    enabled: !!deviceId,
  });
  const filtered = useMemo(() => {
    const items = query.data?.items ?? [];
    return items.filter((item) => {
      if (status === 'active' && item.resolvedAt) return false;
      if (status === 'resolved' && !item.resolvedAt) return false;
      if (type !== 'all' && getErrorType(item) !== type) return false;
      return true;
    });
  }, [query.data?.items, status, type]);
  const data = query.data ?? { items: [], total: 0, page, limit: pageSize };
  return {
    ...query,
    items: filtered,
    total: data.total,
    page: data.page,
    limit: data.limit,
    status,
    type,
    onPageChange: setPage,
    onStatusChange: setStatus,
    onTypeChange: setType,
  };
};
