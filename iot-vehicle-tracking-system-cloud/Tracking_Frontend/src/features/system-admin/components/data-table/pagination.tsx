'use client';

import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DataTablePagination<TData>({ table }: { table: Table<TData> }) {
  return (
    <div className="flex items-center justify-between border-t px-3 py-2">
      <p className="text-xs text-muted-foreground">Số dòng: {table.getRowModel().rows.length}</p>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          className="h-11 w-11 sm:h-8 sm:w-8"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Trang trước"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="text-xs">
          Trang {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="h-11 w-11 sm:h-8 sm:w-8"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Trang sau"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
