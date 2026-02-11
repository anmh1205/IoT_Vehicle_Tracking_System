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
          <p className="text-xs text-muted-foreground">Table</p>
          <Select
            value={draft.table}
            onValueChange={(value) => setDraft((prev) => ({ ...prev, table: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select table" />
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
          <p className="text-xs text-muted-foreground">Search</p>
          <Input
            value={draft.search}
            onChange={(event) => setDraft((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="Keyword..."
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Sort column</p>
          <Input
            value={draft.sortColumn}
            onChange={(event) => setDraft((prev) => ({ ...prev, sortColumn: event.target.value }))}
            list="query-builder-columns"
            placeholder={currentColumns[0] ?? 'column_name'}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Direction</p>
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
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Limit</p>
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
          <p className="text-sm font-medium">Filter conditions</p>
          <Button size="sm" variant="outline" onClick={addCondition}>
            <Plus className="mr-1 h-4 w-4" />
            Add filter
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
              placeholder="column"
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
              placeholder="value"
            />
            <Button size="icon" variant="ghost" onClick={() => removeCondition(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {draft.filters.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No filters. Query returns full table slice.
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setQueryState(draft)}>
          <Play className="mr-2 h-4 w-4" />
          Execute query
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
