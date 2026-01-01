/**
 * API Endpoints Constants - Aligned with backend routes
 */

export const API = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',  // Backend uses /profile not /me
  },
  VEHICLES: {
    LIST: '/vehicles',
    CREATE: '/vehicles',
    DETAILS: (id: number | string) => `/vehicles/${id}`,
    UPDATE: (id: number | string) => `/vehicles/${id}`,  // Uses PATCH
    DELETE: (id: number | string) => `/vehicles/${id}`,
    STATUS: (id: number | string) => `/vehicles/${id}/status`,
  },
  DEVICES: {
    LIST: '/devices',
    CREATE: '/devices',
    DETAILS: (id: number | string) => `/devices/${id}`,
    UPDATE: (id: number | string) => `/devices/${id}`,  // Uses PATCH
    DELETE: (id: number | string) => `/devices/${id}`,
    ASSIGN: (id: number | string) => `/devices/${id}/assign`,
  },
  CUSTOMERS: {
    LIST: '/customers',
    CREATE: '/customers',
    DETAILS: (id: number | string) => `/customers/${id}`,
    UPDATE: (id: number | string) => `/customers/${id}`,
    DELETE: (id: number | string) => `/customers/${id}`,
  },
  TRIPS: {
    LIST: '/trips',
    CREATE: '/trips',
    DETAILS: (id: number | string) => `/trips/${id}`,  // Returns trip with events
    UPDATE: (id: number | string) => `/trips/${id}`,
    DELETE: (id: number | string) => `/trips/${id}`,
    // Note: No separate /events or /route endpoints - included in DETAILS response
  },
  TELEMETRY: {
    // Note: Backend uses camelCase query params: deviceId, startTime, endTime, vehicleId, startDate, endDate
    LOCATION: '/telemetry/location',   // Params: deviceId, startTime, endTime, interval
    HISTORY: '/telemetry/history',     // Params: vehicleId, startDate, endDate, includeStops
  },
  ALERTS: {
    LIST: '/alerts',
    CREATE: '/alerts',
    DETAILS: (id: number | string) => `/alerts/${id}`,
    ACKNOWLEDGE: (id: number | string) => `/alerts/${id}/acknowledge`,  // POST
    RESOLVE: (id: number | string) => `/alerts/${id}/resolve`,  // POST
  },
  VIOLATIONS: {
    LIST: '/violations',
    DETAILS: (id: number | string) => `/violations/${id}`,
  },
  GEOFENCES: {
    LIST: '/geofences',
    CREATE: '/geofences',
    DETAILS: (id: number | string) => `/geofences/${id}`,
    UPDATE: (id: number | string) => `/geofences/${id}`,
    DELETE: (id: number | string) => `/geofences/${id}`,
    ASSIGN_VEHICLES: (id: number | string) => `/geofences/${id}/assign`,  // Backend uses /assign not /vehicles
  },
  MAINTENANCE: {
    LIST: '/maintenance',
    CREATE: '/maintenance',
    DETAILS: (id: number | string) => `/maintenance/${id}`,
    UPDATE: (id: number | string) => `/maintenance/${id}`,
    DELETE: (id: number | string) => `/maintenance/${id}`,
  },
  COMMANDS: {
    LIST: '/commands',
    DETAILS: (id: number | string) => `/commands/${id}`,
    // Backend route: POST /commands/:deviceId
    SEND: (deviceId: string) => `/commands/${deviceId}`,
  },
  NOTIFICATIONS: {
    LIST: '/notifications',
    DETAILS: (id: number | string) => `/notifications/${id}`,
    // Backend has PATCH /:id/delivered and POST /:id/retry
    MARK_DELIVERED: (id: number | string) => `/notifications/${id}/delivered`,
    RETRY: (id: number | string) => `/notifications/${id}/retry`,
    // NOTE: /read and /read-all do NOT exist in backend
  },
  // NOTE: DASHBOARD endpoints do NOT exist in backend
  // Frontend should aggregate from other endpoints:
  // - Stats: from vehicles, trips, alerts
  // - Recent alerts: GET /alerts?limit=10
  // - Active vehicles: GET /vehicles?status=active
} as const;
