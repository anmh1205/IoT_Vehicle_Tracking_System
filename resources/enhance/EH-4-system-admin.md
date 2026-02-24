# EH-4 — System Admin & Observability

> System admin tools: logs viewer, query builder, metrics explorer, chart views.
> **Deps**: EH-0 (shared hooks), EH-3 (dashboard patterns)

---

## CRITICAL RULES

```
1. Logs viewer PHẢI hỗ trợ: filter by level, search, time range, pagination
2. Query builder PHẢI hỗ trợ: chọn table, filter columns, sort, limit
3. Metrics explorer: hiển thị PromQL queries results
4. DataTable pattern từ IVM26 — TanStack Table + shadcn/ui Table
5. Ref IVM26: E:\anmh1205\ivm26\IVM26_Frontend\frontend_v2\src\features\system-admin\
```

---

## Task List

| ID      | Description                                               | Files (trong src/features/system-admin/)     | Ref IVM26 (bytes) |
| ------- | --------------------------------------------------------- | -------------------------------------------- | ----------------- |
| EH-4-01 | System admin page layout — tabs: Logs, Query, Metrics     | `../../app/dashboard/admin/system/page.tsx`  | —                 |
| EH-4-02 | Logs viewer — DataTable with log entries                  | `components/logs-viewer.tsx`                 | ~8,000            |
| EH-4-03 | Logs filter bar — level, search, time range               | `components/logs-filter.tsx`                 | ~3,000            |
| EH-4-04 | Query builder — table selector + column filters + results | `components/query-builder.tsx`               | ~12,000           |
| EH-4-05 | Query results table — dynamic columns from query result   | `components/query-results-table.tsx`         | ~5,000            |
| EH-4-06 | Metrics explorer — PromQL input + chart display           | `components/metrics-explorer.tsx`            | ~8,000            |
| EH-4-07 | Line chart view — recharts time series                    | `components/chart-views/line-chart-view.tsx` | ~4,000            |
| EH-4-08 | Table view — DataTable for metric results                 | `components/chart-views/table-view.tsx`      | ~3,000            |
| EH-4-09 | System admin data table wrapper                           | `components/data-table/data-table.tsx`       | ~4,000            |
| EH-4-10 | DataTable column header                                   | `components/data-table/column-header.tsx`    | ~2,000            |
| EH-4-11 | DataTable pagination                                      | `components/data-table/pagination.tsx`       | ~2,000            |
| EH-4-12 | DataTable toolbar                                         | `components/data-table/toolbar.tsx`          | ~3,000            |
| EH-4-13 | System admin constants — table names, log levels          | `constants.ts`                               | ~500              |
| EH-4-14 | System admin types                                        | `types.ts`                                   | ~1,000            |
| EH-4-15 | Hooks — useLogs, useQueryBuilder, useMetrics              | `hooks/use-system-admin.ts`                  | ~2,000            |

---

## Architecture

```
SystemAdminPage  
├── PageContainer (pageTitle="System Admin", RBAC: admin/root only)
├── Tabs (nuqs URL state)
│   ├── "Logs" → LogsViewer
│   │   ├── LogsFilter (level select, search input, date range)
│   │   └── DataTable (timestamp, level badge, source, message)
│   │       └── Expandable rows for stack trace
│   ├── "Query Builder" → QueryBuilder
│   │   ├── Table selector (validation_errors, event_logs, export_jobs, etc.)
│   │   ├── Column filter builder (add/remove filter conditions)
│   │   ├── Sort + Limit controls
│   │   ├── Execute button
│   │   └── QueryResultsTable (dynamic columns)
│   └── "Metrics" → MetricsExplorer
│       ├── PromQL input (textarea with syntax hint)
│       ├── Time range selector
│       ├── Step selector
│       ├── Execute button
│       └── Chart/Table view toggle
│           ├── LineChartView (recharts)
│           └── TableView (DataTable)
```

### Query Builder

```typescript
// Supported tables (from backend enum)
export const SYSTEM_TABLES = [
  'validation_errors',
  'event_logs', 
  'export_jobs',
  'export_audit_log',
  'error_code_definitions',
] as const;

// Filter condition
interface FilterCondition {
  column: string;
  operator: '=' | '!=' | 'LIKE' | '>' | '<' | '>=' | '<=';
  value: string;
}

interface QueryParams {
  table: typeof SYSTEM_TABLES[number];
  filters: FilterCondition[];
  sort?: { column: string; direction: 'asc' | 'desc' };
  limit: number;
  offset: number;
}
```

### Logs Viewer

```typescript
// Log levels with colors
export const LOG_LEVELS = {
  error: { label: 'Error', variant: 'destructive' },
  warn: { label: 'Warning', variant: 'warning' },
  info: { label: 'Info', variant: 'default' },
  debug: { label: 'Debug', variant: 'secondary' },
} as const;

// Filter state
interface LogsFilter {
  level?: string;
  search?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}
```

---

## Backend API Requirements

| Endpoint                                        | Purpose                     | Notes    |
| ----------------------------------------------- | --------------------------- | -------- |
| `GET /api/v1/system-admin/logs`                 | Paginated logs with filters | Đã có    |
| `POST /api/v1/system-admin/query`               | Execute dynamic query       | Đã có    |
| `POST /api/v1/system-admin/metrics`             | Execute PromQL query        | Đã có    |
| `GET /api/v1/system-admin/tables`               | List available tables       | Kiểm tra |
| `GET /api/v1/system-admin/tables/:name/columns` | List columns for a table    | Kiểm tra |

---

## Verification Checklist

- [ ] System admin page chỉ hiện cho admin/root (RBAC)
- [ ] Logs viewer: filter by level hoạt động
- [ ] Logs viewer: search hoạt động
- [ ] Logs viewer: date range filter hoạt động
- [ ] Logs viewer: pagination hoạt động
- [ ] Query builder: chọn table → hiện columns
- [ ] Query builder: add filter conditions
- [ ] Query builder: execute → hiện results
- [ ] Metrics explorer: nhập PromQL → hiện chart
- [ ] Metrics explorer: toggle chart/table view
- [ ] Error handling: network errors hiện thông báo
