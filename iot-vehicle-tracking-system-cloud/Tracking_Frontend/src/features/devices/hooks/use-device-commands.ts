import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type { DeviceCommand } from '@/features/devices/types';

interface DeviceCommandsResult {
  items: DeviceCommand[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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

const normalizePayload = (
  payload: any,
  fallbackPage: number,
  fallbackLimit: number,
): DeviceCommandsResult => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];

  const pagination = payload?.pagination ?? payload?.data?.pagination ?? {};

  const total = Number(pagination?.total ?? items.length);
  const limit = Number(pagination?.limit ?? fallbackLimit);
  const page = Number(pagination?.page ?? fallbackPage);
  const totalPages = Number(
    pagination?.totalPages ??
      pagination?.total_pages ??
      Math.max(Math.ceil(total / Math.max(limit, 1)), 1),
  );

  return {
    items: items.map(normalizeCommand),
    page,
    limit,
    total,
    totalPages,
  };
};

export const useDeviceCommands = (deviceId: number | null, pageSize = 10) => {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['device-commands', deviceId, page, pageSize],
    queryFn: () =>
      deviceDetailServices
        .getCommands(deviceId as number, { page, limit: pageSize })
        .then((payload) => normalizePayload(payload, page, pageSize)),
    enabled: !!deviceId,
  });

  const data = query.data ?? {
    items: [],
    page,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

  return {
    ...query,
    items: data.items,
    page: data.page,
    limit: data.limit,
    total: data.total,
    totalPages: data.totalPages,
    onPageChange: setPage,
  };
};
