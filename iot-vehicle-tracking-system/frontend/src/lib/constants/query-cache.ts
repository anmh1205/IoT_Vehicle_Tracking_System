/**
 * Query Cache Configuration
 */
export const STALE_TIMES = {
  // Real-time data - very short stale time
  REALTIME: 5 * 1000, // 5 seconds

  // Frequently changing data
  VEHICLE_STATUS: 10 * 1000, // 10 seconds
  ALERTS: 30 * 1000, // 30 seconds

  // Normal data
  VEHICLE_LIST: 60 * 1000, // 1 minute
  DEVICE_LIST: 60 * 1000,
  CUSTOMER_LIST: 5 * 60 * 1000, // 5 minutes

  // Rarely changing data
  GEOFENCES: 10 * 60 * 1000, // 10 minutes
  DASHBOARD_STATS: 60 * 1000, // 1 minute
} as const;

export const CACHE_TIMES = {
  // How long to keep data in cache after becoming unused
  DEFAULT: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
} as const;

