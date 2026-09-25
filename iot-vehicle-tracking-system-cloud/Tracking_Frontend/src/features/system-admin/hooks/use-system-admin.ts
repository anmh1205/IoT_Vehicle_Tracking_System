import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { systemAdminServices, type VmSettingResource } from '@/lib/api/system-admin';
import type {
  ActivateVmSettingPayload,
  CreateSystemAdminSettingPayload,
  RollbackVmSettingPayload,
  SystemAdminMetricsResponse,
  SystemAdminSetting,
  UpdateSystemAdminSettingPayload,
} from '@/lib/api/system-admin';
import type {
  LogsFilterState,
  LogRecord,
  MetricSeries,
  QueryResult,
  TableColumn,
  TableQueryState,
} from '@/features/system-admin/types';

export const systemAdminQueryKeys = {
  root: ['system-admin'] as const,
  health: ['system-admin', 'health'] as const,
  logs: (filters: LogsFilterState) => ['system-admin', 'logs', filters] as const,
  metrics: (query: string, time: string) => ['system-admin', 'metrics', query, time] as const,
  tables: ['system-admin', 'tables'] as const,
  tableColumns: (table: string) => ['system-admin', 'table-columns', table] as const,
  tableQuery: (state: TableQueryState) => ['system-admin', 'table-query', state] as const,
  vmSettings: (resource: VmSettingResource | 'all') =>
    ['system-admin', 'vm-settings', resource] as const,
  revisions: (key: string | null, limit: number) =>
    ['system-admin', 'vm-setting-revisions', key, limit] as const,
};

const normalizeLogQueryResult = (
  payload: Awaited<ReturnType<typeof systemAdminServices.logs>>,
): {
  query: string;
  items: LogRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} => {
  const limit = payload.pagination.limit;
  const offset = payload.pagination.offset;
  const total = payload.pagination.total;
  const page = Math.floor(offset / Math.max(limit, 1)) + 1;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));

  return {
    query: payload.query,
    items: payload.items,
    total,
    page,
    limit,
    totalPages,
  };
};

const buildLogsQuery = (filters: LogsFilterState) => {
  const clauses: string[] = [];
  if (filters.level !== 'all') {
    clauses.push(`level:${filters.level}`);
  }
  if (filters.search.trim()) {
    clauses.push(filters.search.trim());
  }
  if (filters.from) {
    clauses.push(`from:${filters.from}`);
  }
  if (filters.to) {
    clauses.push(`to:${filters.to}`);
  }
  return clauses.join(' ').trim() || '*';
};

const toIsoDateTime = (value?: string) => {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const normalizeMetricSeries = (payload: SystemAdminMetricsResponse): MetricSeries[] => {
  if (payload.rangeApplied) {
    const rangeResult = payload.result as {
      series?: Array<{
        metric?: Record<string, string>;
        values?: Array<{ timestamp: number; value: number }>;
      }>;
    };

    return (rangeResult.series ?? []).map((series, index) => ({
      name: series.metric?.__name__ ?? `series_${index + 1}`,
      points: (series.values ?? []).map((point) => ({
        timestamp: point.timestamp * 1000,
        value: Number(point.value),
      })),
    }));
  }

  const instantResult = payload.result as {
    data?: {
      result?: Array<{
        metric?: Record<string, string>;
        value?: [number, string | number];
      }>;
    };
  };

  return (instantResult.data?.result ?? []).map((series, index) => ({
    name: series.metric?.__name__ ?? `series_${index + 1}`,
    points: series.value
      ? [
          {
            timestamp: Number(series.value[0]) * 1000,
            value: Number(series.value[1]),
          },
        ]
      : [],
  }));
};

const invalidateVmSettingScope = async (queryClient: ReturnType<typeof useQueryClient>, key?: string) => {
  await queryClient.invalidateQueries({ queryKey: ['system-admin', 'vm-settings'] });
  if (key) {
    await queryClient.invalidateQueries({ queryKey: ['system-admin', 'vm-setting-revisions', key] });
  } else {
    await queryClient.invalidateQueries({ queryKey: ['system-admin', 'vm-setting-revisions'] });
  }
};

export const useSystemAdminHealth = (enabled = true) => {
  return useQuery({
    queryKey: systemAdminQueryKeys.health,
    queryFn: () => systemAdminServices.health(),
    enabled,
  });
};

export const useSystemLogs = (filters: LogsFilterState) => {
  return useQuery({
    queryKey: systemAdminQueryKeys.logs(filters),
    queryFn: async () => {
      const payload = await systemAdminServices.logs({
        query: buildLogsQuery(filters),
        limit: filters.limit,
        offset: (filters.page - 1) * filters.limit,
      });
      return normalizeLogQueryResult(payload);
    },
  });
};

export const useSystemTables = () => {
  return useQuery({
    queryKey: systemAdminQueryKeys.tables,
    queryFn: () => systemAdminServices.listTables(),
  });
};

export const useSystemAdminSettings = (enabled = true, resource?: VmSettingResource) => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: systemAdminQueryKeys.vmSettings(resource ?? 'all'),
    queryFn: async (): Promise<SystemAdminSetting[]> => {
      const payload = await systemAdminServices.getSettings({ resource });
      return payload.settings;
    },
    enabled,
  });

  useRealtimeSubscription({
    namespace: 'dashboard',
    event: 'system-admin:settings',
    enabled,
    handler: (payload: { key?: string; resource?: VmSettingResource }) => {
      if (resource && payload.resource && payload.resource !== resource) {
        return;
      }
      void invalidateVmSettingScope(queryClient, payload.key);
    },
  });

  return query;
};

export const useCreateSystemSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSystemAdminSettingPayload) => systemAdminServices.createSetting(payload),
    onSuccess: async (_data, variables) => {
      await invalidateVmSettingScope(queryClient, variables.key);
    },
  });
};

export const useUpdateSystemSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: UpdateSystemAdminSettingPayload }) =>
      systemAdminServices.updateSetting(key, payload),
    onSuccess: async (_data, variables) => {
      await invalidateVmSettingScope(queryClient, variables.key);
    },
  });
};

export const useDeleteSystemSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      key,
      expectedRevision,
      resource,
      idempotencyKey,
    }: {
      key: string;
      expectedRevision: number;
      resource?: VmSettingResource;
      idempotencyKey?: string;
    }) => systemAdminServices.deleteSetting(key, { expectedRevision, resource, idempotencyKey }),
    onSuccess: async (_data, variables) => {
      await invalidateVmSettingScope(queryClient, variables.key);
    },
  });
};

export const useValidateSystemSetting = () => {
  return useMutation({
    mutationFn: ({ key, resource }: { key: string; resource?: VmSettingResource }) =>
      systemAdminServices.validateSetting(key, { resource }),
  });
};

export const useActivateSystemSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: ActivateVmSettingPayload }) =>
      systemAdminServices.activateSetting(key, payload),
    onSuccess: async (_data, variables) => {
      await invalidateVmSettingScope(queryClient, variables.key);
    },
  });
};

export const useRollbackSystemSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: RollbackVmSettingPayload }) =>
      systemAdminServices.rollbackSetting(key, payload),
    onSuccess: async (_data, variables) => {
      await invalidateVmSettingScope(queryClient, variables.key);
    },
  });
};

export const useSystemSettingRevisions = (key: string | null, limit = 20) => {
  return useQuery({
    queryKey: systemAdminQueryKeys.revisions(key, limit),
    queryFn: async () => {
      if (!key) {
        return [];
      }
      const payload = await systemAdminServices.listSettingRevisions(key, { limit });
      return payload.revisions;
    },
    enabled: Boolean(key),
  });
};

export const useTableColumns = (table: string) => {
  return useQuery({
    queryKey: systemAdminQueryKeys.tableColumns(table),
    queryFn: async (): Promise<TableColumn[]> => {
      const payload = await systemAdminServices.getTableColumns(table);
      return payload.map((column) => ({
        name: column.name,
        dataType: column.dataType,
        isNullable: column.isNullable,
      }));
    },
    enabled: table.trim().length > 0,
  });
};

export const useSystemQueryBuilder = (state: TableQueryState) => {
  return useQuery({
    queryKey: systemAdminQueryKeys.tableQuery(state),
    queryFn: async (): Promise<QueryResult> => {
      const payload = await systemAdminServices.queryTable(state.table, {
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        from: toIsoDateTime(state.from),
        to: toIsoDateTime(state.to),
      });
      return {
        rows: payload.items,
        total: payload.pagination.total,
        page: payload.pagination.page,
        limit: payload.pagination.limit,
        totalPages: payload.pagination.totalPages,
      };
    },
    enabled: Boolean(state.table),
  });
};

export const useSystemMetrics = ({
  query,
  time,
  enabled = true,
}: {
  query: string;
  time: string;
  enabled?: boolean;
}) => {
  const queryResult = useQuery({
    queryKey: systemAdminQueryKeys.metrics(query, time),
    queryFn: () => systemAdminServices.metrics({ query, time }),
    enabled: enabled && query.trim().length > 0,
  });

  const series = useMemo(
    () => (queryResult.data ? normalizeMetricSeries(queryResult.data) : []),
    [queryResult.data],
  );

  return {
    ...queryResult,
    series,
  };
};
