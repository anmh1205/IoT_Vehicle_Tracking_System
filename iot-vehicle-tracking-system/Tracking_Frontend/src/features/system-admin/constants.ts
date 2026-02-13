import type { LogLevel } from './types';

export const SYSTEM_TABLES = [
  'validation_errors',
  'event_logs',
  'export_jobs',
  'export_audit_log',
  'error_code_definitions',
  'notifications',
  'device_data_history',
] as const;

export const LOG_LEVELS: Array<{ value: LogLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'error', label: 'Error' },
  { value: 'warn', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'debug', label: 'Debug' },
];

export const DEFAULT_PAGE_LIMIT = 20;
