'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  const rows = logsQuery.data?.items ?? [];
  const total = logsQuery.data?.total ?? rows.length;

  const columns = useMemo<ColumnDef<LogRecord, unknown>[]>(
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
          <Badge variant={LOG_VARIANTS[row.original.level] ?? 'outline'}>{row.original.level}</Badge>
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
          <div className="max-w-[680px] space-y-1">
            <p className="truncate text-sm" title={row.original.message}>
              {row.original.message}
            </p>
            {row.original.stack ? (
              <p className="truncate text-xs text-muted-foreground" title={row.original.stack}>
                {row.original.stack}
              </p>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Theo dõi log hệ thống</p>
            <p className="text-xs text-muted-foreground">
              Đang hiển thị {rows.length} / {total} bản ghi phù hợp với bộ lọc hiện tại.
            </p>
          </div>
          <LogsFilter value={filters} onChange={setFilters} />
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={rows}
        isLoading={logsQuery.isLoading}
        pageSize={filters.limit}
        emptyMessage="Không có nhật ký phù hợp với bộ lọc hiện tại."
      />
    </div>
  );
};
