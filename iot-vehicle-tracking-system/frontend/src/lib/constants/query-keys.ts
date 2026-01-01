/**
 * React Query Keys - Centralized query key management
 */
export const QUERY_KEYS = {
  // Vehicles
  VEHICLES: ['vehicles'] as const,
  VEHICLE: (id: number | string) => ['vehicles', id] as const,
  VEHICLE_STATUS: (id: number | string) => ['vehicles', id, 'status'] as const,

  // Devices
  DEVICES: ['devices'] as const,
  DEVICE: (id: number | string) => ['devices', id] as const,

  // Customers
  CUSTOMERS: ['customers'] as const,
  CUSTOMER: (id: number | string) => ['customers', id] as const,

  // Trips
  TRIPS: ['trips'] as const,
  TRIP: (id: number | string) => ['trips', id] as const,
  TRIP_EVENTS: (id: number | string) => ['trips', id, 'events'] as const,
  TRIP_ROUTE: (id: number | string) => ['trips', id, 'route'] as const,

  // Telemetry
  TELEMETRY_LOCATION: ['telemetry', 'location'] as const,
  TELEMETRY_HISTORY: (vehicleId: number) => ['telemetry', 'history', vehicleId] as const,

  // Alerts
  ALERTS: ['alerts'] as const,
  ALERT: (id: number | string) => ['alerts', id] as const,

  // Geofences
  GEOFENCES: ['geofences'] as const,
  GEOFENCE: (id: number | string) => ['geofences', id] as const,

  // Maintenance
  MAINTENANCE: ['maintenance'] as const,
  MAINTENANCE_RECORD: (id: number | string) => ['maintenance', id] as const,

  // Commands
  COMMANDS: ['commands'] as const,

  // Notifications
  NOTIFICATIONS: ['notifications'] as const,

  // Dashboard
  DASHBOARD_STATS: ['dashboard', 'stats'] as const,
  DASHBOARD_RECENT_ALERTS: ['dashboard', 'recent-alerts'] as const,
  DASHBOARD_ACTIVE_VEHICLES: ['dashboard', 'active-vehicles'] as const,
} as const;

