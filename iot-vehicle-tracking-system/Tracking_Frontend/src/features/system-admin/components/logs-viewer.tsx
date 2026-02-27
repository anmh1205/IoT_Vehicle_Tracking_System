'use client';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { LogsFilter } from './logs-filter';
import { DataTable } from './data-table/data-table';
import { DataTableColumnHeader } from './data-table/column-header';
import { useSystemLogs } from '@/features/system-admin/hooks/use-system-admin';
import { DEFAULT_PAGE_LIMIT } from '@/features/system-admin/constants';
import { formatDateTime } from '@/lib/utils/date/format';
import type { LogRecord, LogsFilterState } from '@/features/system-admin/types';
const LOG_VARIANTS: Record<
  LogRecord['level'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  error: 'destructive',
  warn: 'secondary',
  info: 'default',
  debug: 'outline',
};
export const LogsViewer = () => {
  const [filters, setFilters] = useState<LogsFilterState>({
    level: 'all',
    search: '',
    page: 1,
    limit: DEFAULT_PAGE_LIMIT,
  });
  const logsQuery = useSystemLogs(filters);
  const columns = useMemo<ColumnDef<LogRecord, any>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Thời điểm" />,
        cell: ({ row }) => formatDateTime(row.original.timestamp),
      },
      {
        accessorKey: 'level',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Mức" />,
        cell: ({ row }) => (
          <Badge variant={LOG_VARIANTS[row.original.level] ?? 'outline'}>
            {row.original.level}
          </Badge>
        ),
      },
      {
        accessorKey: 'source',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nguồn" />,
      },
      {
        accessorKey: 'message',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nội dung" />,
        cell: ({ row }) => (
          <p className="max-w-[680px] truncate" title={row.original.message}>
            {row.original.message}
          </p>
        ),
      },
    ],
    [],
  );
  return (
    <div className="space-y-3">
      <LogsFilter value={filters} onChange={setFilters} />
      <DataTable
        columns={columns}
        data={logsQuery.data?.items ?? []}
        isLoading={logsQuery.isLoading}
        pageSize={filters.limit}
        emptyMessage="Không có nhật ký phù hợp với bộ lọc hiện tại."
      />
    </div>
  );
};
