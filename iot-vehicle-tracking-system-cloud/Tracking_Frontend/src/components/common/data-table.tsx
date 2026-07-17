'use client';

import type { KeyboardEvent, MouseEvent } from 'react';
import { useId, useState } from 'react';
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from './empty-state';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  searchLabel?: string;
  isLoading?: boolean;
  pagination?: boolean;
  pageSize?: number;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  toolbar?: React.ReactNode;
  onRowClick?: (row: TData) => void;
}

const humanizeColumnId = (value: string) =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getColumnLabel = <TData, TValue>(column: Column<TData, TValue>) => {
  const metaLabel = (column.columnDef.meta as { label?: string } | undefined)?.label;
  if (metaLabel) return metaLabel;

  const header = column.columnDef.header;
  if (typeof header === 'string' || typeof header === 'number') {
    return String(header);
  }

  return humanizeColumnId(column.id);
};

const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  Boolean(
    target.closest(
      'button, a, input, select, textarea, summary, [role="button"], [role="link"], [role="menuitem"], [data-row-click-ignore="true"]',
    ),
  );

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Tìm kiếm...',
  searchLabel = 'Tìm kiếm trong bảng',
  isLoading = false,
  pagination = true,
  pageSize = 10,
  emptyIcon,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription,
  emptyAction,
  toolbar,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const searchInputId = useId();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
    initialState: { pagination: { pageSize } },
  });

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-live="polite" aria-label="Đang tải dữ liệu bảng">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
        <p className="sr-only">Đang tải dữ liệu...</p>
      </div>
    );
  }

  const handleRowClick = (row: TData, event: MouseEvent<HTMLTableRowElement>) => {
    if (!onRowClick || isInteractiveTarget(event.target)) {
      return;
    }
    onRowClick(row);
  };

  const handleRowKeyDown = (row: TData, event: KeyboardEvent<HTMLTableRowElement>) => {
    if (!onRowClick || isInteractiveTarget(event.target)) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  const shouldHideEmptyAccessorCell = (cell: any) => {
    const accessorKey = (cell.column.columnDef as { accessorKey?: string }).accessorKey;
    if (!accessorKey) {
      return false;
    }

    const rawValue = cell.getValue();
    if (rawValue == null) {
      return true;
    }

    return typeof rawValue === 'string' && rawValue.trim().length === 0;
  };

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          {searchKey ? (
            <div className="relative w-full md:max-w-sm">
              <Label htmlFor={searchInputId} className="sr-only">
                {searchLabel}
              </Label>
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground sm:top-2.5" />
              <Input
                id={searchInputId}
                type="search"
                inputMode="search"
                spellCheck={false}
                placeholder={searchPlaceholder}
                aria-label={searchLabel}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
                className="pl-9"
              />
            </div>
          ) : null}
          {toolbar}
        </div>

        <div className="hidden shrink-0 justify-end sm:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Settings2 className="mr-2 h-4 w-4" />
                Cột hiển thị
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                  >
                    {getColumnLabel(column)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {table.getRowModel().rows.length > 0 ? (
          table.getRowModel().rows.map((row) => {
            const visibleCells = row.getVisibleCells();
            const actionCell = visibleCells.find((cell) => cell.column.id === 'actions');
            const dataCells = visibleCells.filter(
              (cell) => cell.column.id !== 'actions' && !shouldHideEmptyAccessorCell(cell),
            );

            return (
              <div
                key={row.id}
                tabIndex={onRowClick ? 0 : undefined}
                className={
                  onRowClick
                    ? 'rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    : 'rounded-xl border bg-card p-4 shadow-sm'
                }
                onClick={
                  onRowClick
                    ? (event) => {
                        if (!isInteractiveTarget(event.target)) {
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (isInteractiveTarget(event.target)) {
                          return;
                        }
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row.original);
                        }
                      }
                    : undefined
                }
              >
                <div className="space-y-3">
                  {dataCells.map((cell) => (
                    <div key={cell.id} className="space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {getColumnLabel(cell.column)}
                      </p>
                      <div className="min-w-0 break-words text-sm leading-5 text-foreground [&_*]:max-w-full [&_p]:whitespace-normal [&_span]:whitespace-normal">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    </div>
                  ))}
                  {actionCell ? (
                    <div className="border-t pt-3" data-row-click-ignore="true">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {getColumnLabel(actionCell.column)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {flexRender(actionCell.column.columnDef.cell, actionCell.getContext())}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border">
            <div className="p-6">
              <EmptyState
                icon={emptyIcon}
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
              />
            </div>
          </div>
        )}
      </div>

      <div className="hidden min-w-0 max-w-full overflow-hidden rounded-md border md:block">
        <div className="min-w-0 w-full max-w-full overflow-x-auto">
          <Table className="w-full min-w-full table-auto">
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
                  <TableRow
                    key={row.id}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={onRowClick ? 'cursor-pointer transition-colors hover:bg-muted/40' : undefined}
                    onClick={(event) => handleRowClick(row.original, event)}
                    onKeyDown={(event) => handleRowKeyDown(row.original, event)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="align-top whitespace-normal break-words">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48 text-center">
                    <EmptyState
                      icon={emptyIcon}
                      title={emptyTitle}
                      description={emptyDescription}
                      action={emptyAction}
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pagination ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Hiển thị {table.getRowModel().rows.length} / {table.getFilteredRowModel().rows.length}{' '}
            bản ghi
          </p>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Trang trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Trang sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
