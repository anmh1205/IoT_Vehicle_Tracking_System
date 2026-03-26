'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTable } from './data-table/data-table';
import { DataTableColumnHeader } from './data-table/column-header';

const renderCellValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'true' : 'false'}</Badge>;
  }

  if (typeof value === 'object') {
    const formatted = JSON.stringify(value, null, 2);
    return (
      <details className="max-w-[360px] text-xs">
        <summary className="cursor-pointer text-muted-foreground">Xem chi tiết</summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/60 p-2 whitespace-pre-wrap">
          {formatted}
        </pre>
      </details>
    );
  }

  return String(value);
};

export const QueryResultsTable = ({
  rows,
  isLoading,
}: {
  rows: Record<string, unknown>[];
  isLoading?: boolean;
}) => {
  const columns = useMemo<ColumnDef<Record<string, unknown>, unknown>[]>(() => {
    const firstRow = rows[0];
    if (!firstRow) {
      return [];
    }
    return Object.keys(firstRow).map((key) => ({
      accessorKey: key,
      header: ({ column }) => <DataTableColumnHeader column={column} title={key} />,
      cell: ({ row }) => renderCellValue(row.original[key]),
    }));
  }, [rows]);

  return (
    <DataTable
      columns={columns}
      data={rows}
      isLoading={isLoading}
      pageSize={20}
      emptyMessage="Chạy truy vấn để xem kết quả."
    />
  );
};
