export const OTA_RAW_STATES = [
  'assigned',
  'downloading',
  'verifying',
  'installing',
  'rebooting',
  'confirming',
  'success',
  'failed',
  'rolled_back',
] as const;

export type OtaRawState = (typeof OTA_RAW_STATES)[number];

export const OTA_TERMINAL_STATES = new Set<OtaRawState>(['success', 'failed', 'rolled_back']);

export const OTA_IN_PROGRESS_STATES = new Set<OtaRawState>([
  'downloading',
  'verifying',
  'installing',
  'rebooting',
  'confirming',
]);

export type OtaSummaryState =
  | 'assigned'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'rolled_back'
  | 'stuck_timeout';

export const OTA_ERROR_CODES = [
  'unsafe_runtime_window',
  'http_open_failed',
  'http_status_not_200',
  'http_read_failed',
  'sha256_mismatch',
  'ota_begin_failed',
  'ota_write_failed',
  'ota_end_failed',
  'set_boot_partition_failed',
  'confirm_failed',
  'confirm_timeout_exceeded',
  'manual_rollback_failed',
] as const;

