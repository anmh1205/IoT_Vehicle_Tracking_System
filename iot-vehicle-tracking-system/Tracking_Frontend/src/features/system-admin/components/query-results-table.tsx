'use client';
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './data-table/data-table';
import { DataTableColumnHeader } from './data-table/column-header';
export const QueryResultsTable = ({
  rows,
  isLoading,
}: {
  rows: Record<string, unknown>[];
  isLoading?: boolean;
}) => {
  const columns = useMemo<ColumnDef<Record<string, unknown>, any>[]>(() => {
    const firstRow = rows[0];
    if (!firstRow) {
      return [];
    }
    return Object.keys(firstRow).map((key) => ({
      accessorKey: key,
      header: ({ column }: any) => <DataTableColumnHeader column={column} title={key} />,
      cell: ({ row }: any) => {
        const value = row.original[key];
        if (value === null || value === undefined) {
          return '-';
        }
        if (typeof value === 'object') {
          return (
            <pre className="max-w-[320px] truncate text-xs" title={JSON.stringify(value)}>
              {JSON.stringify(value)}
            </pre>
          );
        }
        return String(value);
      },
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
