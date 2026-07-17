'use client';

import { useState } from 'react';
import {
  type Column,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableToolbar } from './toolbar';
import { DataTablePagination } from './pagination';

const humanizeColumnId = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getColumnLabel = <TData, TValue>(column: Column<TData, TValue>) => {
  const header = column.columnDef.header;
  if (typeof header === 'string' || typeof header === 'number') {
    return String(header);
  }

  return humanizeColumnId(column.id);
};

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  pageSize = 20,
  searchKey,
  searchPlaceholder,
  toolbar,
  emptyMessage = 'Không tìm thấy dữ liệu.',
  showPagination = true,
}: {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  isLoading?: boolean;
  pageSize?: number;
  searchKey?: string;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  emptyMessage?: string;
  showPagination?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      {toolbar ?? (
        <DataTableToolbar
          table={table}
          searchKey={searchKey}
          searchPlaceholder={searchPlaceholder}
        />
      )}

      <div className="space-y-3 p-3 md:hidden">
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => (
            <div key={row.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="space-y-3">
                {row.getVisibleCells().map((cell) => (
                  <div key={cell.id} className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {getColumnLabel(cell.column)}
                    </p>
                    <div className="min-w-0 break-words text-sm leading-5 text-foreground [&_*]:max-w-full [&_p]:whitespace-normal [&_span]:whitespace-normal">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-28 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination ? <DataTablePagination table={table} /> : null}
    </div>
  );
}
