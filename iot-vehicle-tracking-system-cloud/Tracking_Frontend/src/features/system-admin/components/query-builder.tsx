'use client';

import { useEffect, useMemo, useState } from 'react';
import { Database, Filter, Play, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useSystemQueryBuilder,
  useSystemTables,
  useTableColumns,
} from '@/features/system-admin/hooks/use-system-admin';
import type { TableColumn, TableQueryState } from '@/features/system-admin/types';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const formatCellValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">-</span>;
  }

  if (typeof value === 'boolean') {
    return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'true' : 'false'}</Badge>;
  }

  if (typeof value === 'object') {
    return (
      <details className="max-w-[360px] text-xs">
        <summary className="cursor-pointer text-muted-foreground">Xem chi tiết</summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-muted/60 p-2 whitespace-pre-wrap">
          {JSON.stringify(value, null, 2)}
        </pre>
      </details>
    );
  }

  return String(value);
};

const TableMetadata = ({
  columns,
  isLoading,
}: {
  columns: TableColumn[];
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground">Đang tải metadata cột cho bảng đã chọn.</p>
    );
  }

  if (columns.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Chưa có metadata cột cho bảng này.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {columns.map((column) => (
        <Badge key={column.name} variant="outline" className="gap-1">
          <span>{column.name}</span>
          <span className="text-muted-foreground">{column.dataType}</span>
          <span className="text-muted-foreground">{column.isNullable ? 'nullable' : 'not null'}</span>
        </Badge>
      ))}
    </div>
  );
};

export const QueryBuilder = () => {
  const tablesQuery = useSystemTables();
  const [draft, setDraft] = useState<TableQueryState>({
    table: '',
    page: 1,
    limit: 20,
    search: '',
    from: undefined,
    to: undefined,
  });
  const [queryState, setQueryState] = useState<TableQueryState>(draft);
  const activeTable = draft.table || queryState.table;
  const columnsQuery = useTableColumns(activeTable);

  useEffect(() => {
    if (draft.table || !tablesQuery.data || tablesQuery.data.length === 0) {
      return;
    }

    const firstTable = tablesQuery.data[0];
    if (!firstTable) {
      return;
    }

    setDraft((prev) => ({ ...prev, table: firstTable }));
    setQueryState((prev) => ({ ...prev, table: firstTable }));
  }, [draft.table, tablesQuery.data]);

  const queryResult = useSystemQueryBuilder(queryState);

  const availableColumns = useMemo(() => {
    const rowColumns = queryResult.data?.rows?.[0] ? Object.keys(queryResult.data.rows[0]) : [];
    const backendColumns = columnsQuery.data?.map((column) => column.name) ?? [];
    return backendColumns.length > 0 ? backendColumns : rowColumns;
  }, [columnsQuery.data, queryResult.data]);

  const applyQuery = () => {
    setQueryState({ ...draft, page: 1 });
  };

  const changePage = (nextPage: number) => {
    const page = Math.max(1, nextPage);
    setDraft((prev) => ({ ...prev, page }));
    setQueryState((prev) => ({ ...prev, page }));
  };

  const rows = queryResult.data?.rows ?? [];
  const pagination = queryResult.data
    ? {
        page: queryResult.data.page,
        totalPages: queryResult.data.totalPages,
        total: queryResult.data.total,
        limit: queryResult.data.limit,
      }
    : { page: 1, totalPages: 1, total: 0, limit: draft.limit };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            Trình duyệt PostgreSQL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)_180px_180px_140px]">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Bảng</p>
              <Select
                value={draft.table}
                onValueChange={(table) => {
                  setDraft((prev) => ({ ...prev, table, page: 1 }));
                  setQueryState((prev) => ({ ...prev, table, page: 1 }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bảng" />
                </SelectTrigger>
                <SelectContent>
                  {(tablesQuery.data ?? []).map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tìm kiếm</p>
              <Input
                value={draft.search}
                onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Từ khóa hoặc giá trị cần dò"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Từ thời điểm</p>
              <Input
                type="datetime-local"
                value={draft.from ?? ''}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, from: event.target.value || undefined }))
                }
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Đến thời điểm</p>
              <Input
                type="datetime-local"
                value={draft.to ?? ''}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, to: event.target.value || undefined }))
                }
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Kích thước trang</p>
              <Select
                value={String(draft.limit)}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, limit: Number(value), page: 1 }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={applyQuery} disabled={!draft.table}>
              <Play className="mr-2 h-4 w-4" />
              Chạy truy vấn
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const table = queryState.table || draft.table;
                setDraft({
                  table,
                  page: 1,
                  limit: 20,
                  search: '',
                  from: undefined,
                  to: undefined,
                });
                setQueryState({
                  table,
                  page: 1,
                  limit: 20,
                  search: '',
                  from: undefined,
                  to: undefined,
                });
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Làm mới bộ lọc
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>
                {columnsQuery.isLoading
                  ? 'Đang tải danh sách cột...'
                  : `${availableColumns.length} cột khả dụng`}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Metadata bảng</p>
            <TableMetadata
              columns={columnsQuery.data ?? []}
              isLoading={columnsQuery.isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-0">
          {queryResult.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-sm text-muted-foreground">
                <span>
                  {rows.length} dòng trên tổng số {pagination.total}
                </span>
                <span>
                  Trang {pagination.page} / {pagination.totalPages}
                </span>
              </div>

              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {availableColumns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length > 0 ? (
                      rows.map((row, rowIndex) => (
                        <TableRow key={`${queryState.table}-${queryResult.data?.page}-${rowIndex}`}>
                          {availableColumns.map((column) => (
                            <TableCell key={column}>{formatCellValue(row[column])}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={Math.max(availableColumns.length, 1)}
                          className="h-24 text-center text-sm text-muted-foreground"
                        >
                          Chưa có dữ liệu phù hợp với bộ lọc hiện tại.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  {queryState.table
                    ? `Bảng ${queryState.table} • giới hạn ${pagination.limit} dòng / trang`
                    : 'Chưa chọn bảng'}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changePage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Trước
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changePage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
