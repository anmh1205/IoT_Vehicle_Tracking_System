export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogRecord {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  stack?: string | null;
}

export interface LogsFilterState {
  level: LogLevel | 'all';
  search: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export interface QueryCondition {
  column: string;
  operator: '=' | '!=' | 'LIKE' | '>' | '<' | '>=' | '<=';
  value: string;
}

export interface QueryBuilderState {
  table: string;
  filters: QueryCondition[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  limit: number;
  offset: number;
  search: string;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
}

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
}
