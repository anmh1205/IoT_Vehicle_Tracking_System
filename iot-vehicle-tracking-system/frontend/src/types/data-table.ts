/**
 * Data Table Types for TanStack Table
 */
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
  };
  onRowClick?: (row: TData) => void;
}

export interface DataTableToolbarProps<TData> {
  table: import('@tanstack/react-table').Table<TData>;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
}

export interface UseDataTableOptions {
  initialPageSize?: number;
  initialSorting?: SortingState;
  initialColumnFilters?: ColumnFiltersState;
  initialColumnVisibility?: VisibilityState;
}

