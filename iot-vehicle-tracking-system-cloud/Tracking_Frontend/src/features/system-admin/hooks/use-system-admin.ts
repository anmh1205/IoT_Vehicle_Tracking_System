import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemAdminServices } from '@/lib/api/system-admin';
import { DEFAULT_PAGE_LIMIT, SYSTEM_TABLES } from '@/features/system-admin/constants';
import type {
  LogsFilterState,
  LogRecord,
  MetricSeries,
  QueryResult,
  TableColumn,
  TableQueryState,
} from '@/features/system-admin/types';

const normalizeLogLevel = (value: unknown): LogRecord['level'] => {
  const level = String(value ?? 'info').toLowerCase();
  if (level === 'error' || level === 'warn' || level === 'info' || level === 'debug') {
    return level;
  }
  return 'info';
};

const normalizeLogs = (
  payload: any,
): {
  items: LogRecord[];
  total: number;
} => {
  const rows = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : Array.isArray(payload?.logs)
        ? payload.logs
        : Array.isArray(payload?.data?.logs)
          ? payload.data.logs
          : Array.isArray(payload)
            ? payload
            : [];

  return {
    items: rows.map((row: any, index: number) => ({
      id: String(row?.id ?? row?._id ?? `${row?.timestamp ?? index}`),
      timestamp: String(
        row?.timestamp ?? row?.ts ?? row?.createdAt ?? row?.created_at ?? new Date().toISOString(),
      ),
      level: normalizeLogLevel(row?.level),
      source: String(row?.source ?? row?.service ?? 'system'),
      message: String(row?.message ?? row?.msg ?? ''),
      stack: row?.stack ?? null,
    })),
    total: Number(payload?.total ?? payload?.pagination?.total ?? rows.length),
  };
};

const normalizeRows = (payload: any): QueryResult => {
  const rows = Array.isArray(payload?.rows)
    ? payload.rows
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data?.rows)
        ? payload.data.rows
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : Array.isArray(payload)
            ? payload
            : [];

  const total = Number(payload?.total ?? payload?.pagination?.total ?? rows.length);
  const page = Number(payload?.page ?? payload?.pagination?.page ?? 1);
  const limit = Number(payload?.limit ?? payload?.pagination?.limit ?? DEFAULT_PAGE_LIMIT);
  const totalPages = Number(payload?.totalPages ?? payload?.pagination?.totalPages ?? Math.max(Math.ceil(total / Math.max(limit, 1)), 1));

  return {
    rows: rows as Record<string, unknown>[],
    total,
    page,
    limit,
    totalPages,
  };
};

const normalizeMetricSeries = (payload: any): MetricSeries[] => {
  const result = payload?.data?.result ?? payload?.result ?? payload?.series ?? [];
  if (!Array.isArray(result)) {
    return [];
  }

  return result.map((series: any, index: number) => {
    const name =
      series?.metric?.__name__ ?? series?.name ?? series?.legend ?? `series_${index + 1}`;
    const values = Array.isArray(series?.values)
      ? series.values
      : Array.isArray(series?.data)
        ? series.data
        : [];

    return {
      name: String(name),
      points: values
        .map((point: any) => {
          if (Array.isArray(point) && point.length >= 2) {
            return {
              timestamp: Number(point[0]) * 1000,
              value: Number(point[1]),
            };
          }

          if (point && typeof point === 'object') {
            const rawTimestamp = Number(point.timestamp ?? point.ts ?? Date.now());
            return {
              timestamp:
                Number.isFinite(rawTimestamp) && rawTimestamp > 0 && rawTimestamp < 1_000_000_000_000
                  ? rawTimestamp * 1000
                  : rawTimestamp,
              value: Number(point.value ?? 0),
            };
          }

          return null;
        })
        .filter(
          (
            point: {
              timestamp: number;
              value: number;
            } | null,
          ): point is {
            timestamp: number;
            value: number;
          } => !!point,
        ),
    };
  });
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

export const useSystemAdminHealth = (enabled = true) => {
  return useQuery({
    queryKey: ['system-admin', 'health'],
    queryFn: () => systemAdminServices.health(),
    enabled,
    refetchInterval: 30000,
  });
};

export const useSystemLogs = (filters: LogsFilterState) => {
  return useQuery({
    queryKey: ['system-admin', 'logs', filters],
    queryFn: async () => {
      const payload = await systemAdminServices.logs({
        query: buildLogsQuery(filters),
        limit: filters.limit,
      });
      return normalizeLogs(payload);
    },
    refetchInterval: 60000,
  });
};

export const useSystemTables = () => {
  return useQuery({
    queryKey: ['system-admin', 'tables'],
    queryFn: async () => {
      const payload = await systemAdminServices.listTables();
      const rows = Array.isArray(payload) ? payload : [];
      return rows.length > 0 ? rows : [...SYSTEM_TABLES];
    },
  });
};

export const useTableColumns = (table: string) => {
  return useQuery({
    queryKey: ['system-admin', 'table-columns', table],
    queryFn: async () => {
      const payload = await systemAdminServices.getTableColumns(table);
      if (!Array.isArray(payload)) {
        return [] as TableColumn[];
      }

      return payload
        .map((row: any) => ({
          name: String(row?.name ?? row?.columnName ?? row?.column_name ?? row ?? ''),
          dataType: String(row?.dataType ?? row?.data_type ?? row?.type ?? ''),
          isNullable:
            row?.isNullable === true ||
            row?.isNullable === 'YES' ||
            row?.is_nullable === true ||
            row?.is_nullable === 'YES',
        }))
        .filter((row: TableColumn) => row.name.length > 0);
    },
    enabled: table.trim().length > 0,
  });
};

export const useSystemQueryBuilder = (state: TableQueryState) => {
  return useQuery({
    queryKey: ['system-admin', 'table-query', state],
    queryFn: async () => {
      const payload = await systemAdminServices.queryTable(state.table, {
        page: state.page,
        limit: state.limit,
        search: state.search || undefined,
        from: toIsoDateTime(state.from),
        to: toIsoDateTime(state.to),
      });
      return normalizeRows(payload);
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
    queryKey: ['system-admin', 'metrics', query, time],
    queryFn: () => systemAdminServices.metrics({ query, time }),
    enabled: enabled && query.trim().length > 0,
  });

  const series = useMemo(() => normalizeMetricSeries(queryResult.data), [queryResult.data]);

  return {
    ...queryResult,
    series,
  };
};
