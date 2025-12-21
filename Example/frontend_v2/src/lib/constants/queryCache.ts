/**
 * Query cache configuration constants
 * Standardizes stale times across the application
 */

/**
 * Stale time constants (in milliseconds)
 * - Data is considered fresh for this duration
 * - React Query won't refetch if data is within stale time
 */
export const STALE_TIMES = {
    // Device data - updates frequently
    DEVICE_LIST: 120000, // 2 minutes
    DEVICE_DETAIL: 60000, // 1 minute
    DEVICE_SESSIONS: 30000, // 30 seconds
    DEVICE_ERROR_CODES: 30000, // 30 seconds
    DEVICE_RUNTIME_CHART: 30000, // 30 seconds
    DEVICE_VIBRATION_CHART: 30000, // 30 seconds

    // Statistics - updates less frequently
    STATISTICS: 300000, // 5 minutes

    // Firmware - updates rarely
    FIRMWARE: 600000, // 10 minutes

    // Users - updates rarely
    USERS: 600000, // 10 minutes

    // Notifications - updates frequently
    NOTIFICATIONS: 60000, // 1 minute

    // Default
    DEFAULT: 120000, // 2 minutes
} as const;

/**
 * Cache time constants (in milliseconds)
 * - How long data stays in cache after being unused
 * - Default: 5 minutes
 */
export const CACHE_TIMES = {
    DEFAULT: 300000, // 5 minutes
    LONG: 600000, // 10 minutes
    SHORT: 60000, // 1 minute
} as const;

