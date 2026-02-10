export const DEVICE_TOPICS = {
  RAW_DATA: 'v1/+/rawdata',
  STATUS: 'v1/+/status',
  EVENTS: 'v1/+/events',
  FIRMWARE: 'v1/+/firmware',
} as const;

export const INTERNAL_TOPICS = {
  DEVICE_STATUS: 'internal/events/device/status',
  DEVICE_ALERT: 'internal/events/device/alert',
  DEVICE_SESSION: 'internal/events/device/session',
  DEVICE_DATA: 'internal/events/device/data',
} as const;

export const INTERNAL_QOS: Record<string, 0 | 1> = {
  'device/status': 1,
  'device/alert': 1,
  'device/session': 1,
  'device/data': 0,
};
