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

export interface TableColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
}

export interface TableQueryState {
  table: string;
  page: number;
  limit: number;
  search: string;
  from?: string;
  to?: string;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
}
