'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useSystemQueryBuilder,
  useSystemTables,
  useTableColumns,
} from '@/features/system-admin/hooks/use-system-admin';
import type { QueryBuilderState, QueryCondition } from '@/features/system-admin/types';
import { QueryResultsTable } from './query-results-table';
const OPERATORS: QueryCondition['operator'][] = ['=', '!=', 'LIKE', '>', '<', '>=', '<='];
export const QueryBuilder = () => {
  const tablesQuery = useSystemTables();
  const [draft, setDraft] = useState<QueryBuilderState>({
    table: '',
    filters: [],
    sortColumn: '',
    sortDirection: 'desc',
    limit: 50,
    offset: 0,
    search: '',
  });
  const [queryState, setQueryState] = useState<QueryBuilderState>(draft);
  const columnsQuery = useTableColumns(draft.table);
  useEffect(() => {
    if (draft.table || !tablesQuery.data || tablesQuery.data.length === 0) {
      return;
    }
    const firstTable = tablesQuery.data[0];
    setDraft((prev) => ({ ...prev, table: firstTable }));
    setQueryState((prev) => ({ ...prev, table: firstTable }));
  }, [draft.table, tablesQuery.data]);
  const queryResult = useSystemQueryBuilder(queryState);
  const addCondition = () => {
    setDraft((prev) => ({
      ...prev,
      filters: [...prev.filters, { column: '', operator: '=', value: '' }],
    }));
  };
  const updateCondition = (index: number, next: QueryCondition) => {
    setDraft((prev) => ({
      ...prev,
      filters: prev.filters.map((item, itemIndex) => (itemIndex === index ? next : item)),
    }));
  };
  const removeCondition = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, itemIndex) => itemIndex !== index),
    }));
  };
  const currentColumns = useMemo(() => {
    const tableColumns = columnsQuery.data ?? [];
    if (tableColumns.length > 0) {
      return tableColumns;
    }
    const row = queryResult.data?.rows?.[0];
    if (!row) {
      return [];
    }
    return Object.keys(row);
  }, [columnsQuery.data, queryResult.data?.rows]);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Bảng</p>
          <Select
            value={draft.table}
            onValueChange={(value) => setDraft((prev) => ({ ...prev, table: value }))}
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
            placeholder="Từ khóa..."
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Cột sắp xếp</p>
          <Input
            value={draft.sortColumn}
            onChange={(event) => setDraft((prev) => ({ ...prev, sortColumn: event.target.value }))}
            list="query-builder-columns"
            placeholder={currentColumns[0] ?? 'tên_cột'}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Chiều sắp xếp</p>
          <Select
            value={draft.sortDirection}
            onValueChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                sortDirection: value as QueryBuilderState['sortDirection'],
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Tăng dần</SelectItem>
              <SelectItem value="desc">Giảm dần</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Giới hạn</p>
          <Input
            type="number"
            value={draft.limit}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                limit: Math.max(1, Number(event.target.value || 1)),
              }))
            }
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Điều kiện lọc</p>
          <Button size="sm" variant="outline" onClick={addCondition}>
            <Plus className="mr-1 h-4 w-4" />
Thêm điều kiện
          </Button>
        </div>

        {draft.filters.map((condition, index) => (
          <div key={`condition-${index}`} className="grid gap-2 md:grid-cols-[1fr_120px_1fr_auto]">
            <Input
              value={condition.column}
              onChange={(event) =>
                updateCondition(index, { ...condition, column: event.target.value })
              }
              list="query-builder-columns"
              placeholder="tên_cột"
            />
            <Select
              value={condition.operator}
              onValueChange={(value) =>
                updateCondition(index, {
                  ...condition,
                  operator: value as QueryCondition['operator'],
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map((operator) => (
                  <SelectItem key={operator} value={operator}>
                    {operator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={condition.value}
              onChange={(event) =>
                updateCondition(index, { ...condition, value: event.target.value })
              }
              placeholder="giá trị"
            />
            <Button size="icon" variant="ghost" onClick={() => removeCondition(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {draft.filters.length === 0 ? (
          <p className="text-xs text-muted-foreground">
Chưa có điều kiện lọc. Truy vấn sẽ trả về toàn bộ dữ liệu theo giới hạn.
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setQueryState(draft)}>
          <Play className="mr-2 h-4 w-4" />
Chạy truy vấn
        </Button>
      </div>

      <datalist id="query-builder-columns">
        {currentColumns.map((column) => (
          <option key={column} value={column} />
        ))}
      </datalist>

      <QueryResultsTable rows={queryResult.data?.rows ?? []} isLoading={queryResult.isLoading} />
    </div>
  );
};
