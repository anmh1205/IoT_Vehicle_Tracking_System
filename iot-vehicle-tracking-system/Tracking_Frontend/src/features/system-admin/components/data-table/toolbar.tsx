'use client';

import { X } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = 'Tìm kiếm...',
}: {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
}) {
  const hasFilters = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2 p-3">
      {searchKey ? (
        <Input
          value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn(searchKey)?.setFilterValue(event.target.value)}
          placeholder={searchPlaceholder}
          className="w-full sm:w-[280px]"
        />
      ) : null}
      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => table.resetColumnFilters()}
          className="h-8 px-2"
        >
          <X className="mr-1 h-4 w-4" />
          Đặt lại
        </Button>
      ) : null}
    </div>
  );
}
