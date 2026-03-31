/* eslint-disable @typescript-eslint/no-explicit-any */

const bearerAuth = {
  type: 'http' as const,
  scheme: 'bearer',
  bearerFormat: 'token',
  description: 'Session token sent as Bearer header',
};

const paginationParams = [
  { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
  { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Items per page' },
  { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search term' },
];

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description: 'Resource ID',
};

const jsonBody = (props: Record<string, any>) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object', properties: props } } },
});

const ok = (desc = 'Success') => ({
  '200': { description: desc },
  '401': { description: 'Unauthorized' },
});

const crud = (desc = 'Success') => ({
  '200': { description: desc },
  '400': { description: 'Validation error' },
  '401': { description: 'Unauthorized' },
  '404': { description: 'Not found' },
});

export const spec = {
  openapi: '3.0.3',
  info: {
    title: 'IoT Vehicle Tracking System API',
    version: '1.0.0',
    description:
      'REST API for real-time vehicle tracking, fleet management, and IoT device monitoring',
  },
  servers: [
    { url: '/api/v1', description: 'API v1' },
    { url: '/api', description: 'API (compat alias)' },
  ],
  components: {
    securitySchemes: { BearerAuth: bearerAuth },
  },
  security: [{ BearerAuth: [] }],
  tags: [
    { name: 'Auth', description: 'Authentication & session management' },
    { name: 'Users', description: 'User management' },
    { name: 'Devices', description: 'IoT device management' },
    { name: 'Vehicles', description: 'Vehicle fleet management' },
    { name: 'Customers', description: 'Customer management' },
    { name: 'Trips', description: 'Trip tracking' },
    { name: 'Alerts', description: 'Alert management' },
    { name: 'Geofences', description: 'Geofence management' },
    { name: 'Maintenance', description: 'Maintenance records' },
    { name: 'Firmware', description: 'Firmware & OTA management' },
    { name: 'Exports', description: 'Data export' },
    { name: 'Dashboard', description: 'Dashboard statistics' },
    { name: 'Statistics', description: 'Fleet & operational statistics' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Telemetry', description: 'Telemetry data queries' },
    { name: 'Simulator', description: 'Device simulator control' },
    { name: 'System', description: 'System health & metrics' },
    { name: 'System Admin', description: 'Admin-level system management' },
  ],
  paths: {
    // ── Auth ────────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: jsonBody({
          username: { type: 'string' },
          password: { type: 'string' },
        }),
        responses: {
          '200': { description: 'Login successful, returns token' },
          '401': { description: 'Invalid credentials' },
          '429': { description: 'Too many attempts' },
        },
      },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Logout', responses: ok() },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Get current user profile', responses: ok() },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Refresh session token', responses: ok() },
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change own password',
        requestBody: jsonBody({
          currentPassword: { type: 'string' },
          newPassword: { type: 'string' },
        }),
        responses: crud(),
      },
    },
    '/auth/profile': {
      put: {
        tags: ['Auth'],
        summary: 'Update own profile',
        requestBody: jsonBody({
          fullName: { type: 'string' },
          email: { type: 'string' },
        }),
        responses: crud(),
      },
    },
    '/auth/notifications': {
      put: {
        tags: ['Auth'],
        summary: 'Update notification preferences',
        requestBody: jsonBody({
          emailNotifications: { type: 'boolean' },
          pushNotifications: { type: 'boolean' },
        }),
        responses: crud(),
      },
    },
    '/auth/users': {
      get: {
        tags: ['Auth'],
        summary: 'List users (admin, via auth route)',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Auth'],
        summary: 'Create user (admin, via auth route)',
        requestBody: jsonBody({
          username: { type: 'string' },
          password: { type: 'string' },
          fullName: { type: 'string' },
          role: { type: 'string' },
        }),
        responses: crud('User created'),
      },
    },
    '/auth/users/{id}': {
      get: {
        tags: ['Auth'],
        summary: 'Get user by ID (admin, via auth route)',
        parameters: [idParam],
        responses: crud(),
      },
      patch: {
        tags: ['Auth'],
        summary: 'Update user (admin, via auth route)',
        parameters: [idParam],
        requestBody: jsonBody({
          fullName: { type: 'string' },
          role: { type: 'string' },
          active: { type: 'boolean' },
        }),
        responses: crud(),
      },
      delete: {
        tags: ['Auth'],
        summary: 'Delete user (admin, via auth route)',
        parameters: [idParam],
        responses: crud(),
      },
    },

    // ── Users ───────────────────────────────────────
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List all users',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Users'],
        summary: 'Create a user',
        requestBody: jsonBody({
          username: { type: 'string' },
          password: { type: 'string' },
          fullName: { type: 'string' },
          role: { type: 'string' },
        }),
        responses: crud('User created'),
      },
    },
    '/users/profile': {
      get: { tags: ['Users'], summary: 'Get own profile', responses: ok() },
      put: {
        tags: ['Users'],
        summary: 'Update own profile',
        requestBody: jsonBody({ fullName: { type: 'string' }, email: { type: 'string' } }),
        responses: crud(),
      },
    },
    '/users/notification-settings': {
      get: { tags: ['Users'], summary: 'Get notification settings', responses: ok() },
      put: {
        tags: ['Users'],
        summary: 'Update notification settings',
        requestBody: jsonBody({
          emailNotifications: { type: 'boolean' },
          pushNotifications: { type: 'boolean' },
        }),
        responses: crud(),
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        parameters: [idParam],
        responses: crud(),
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user',
        parameters: [idParam],
        requestBody: jsonBody({ fullName: { type: 'string' }, role: { type: 'string' } }),
        responses: crud(),
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/users/{id}/reset-password': {
      post: {
        tags: ['Users'],
        summary: 'Reset user password (admin)',
        parameters: [idParam],
        responses: crud(),
      },
    },

    // ── Devices ─────────────────────────────────────
    '/devices': {
      get: {
        tags: ['Devices'],
        summary: 'List devices',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Devices'],
        summary: 'Create a device',
        requestBody: jsonBody({
          serialNumber: { type: 'string' },
          model: { type: 'string' },
          firmwareVersion: { type: 'string' },
        }),
        responses: crud('Device created'),
      },
    },
    '/devices/positions': {
      get: { tags: ['Devices'], summary: 'Get latest positions for all devices', responses: ok() },
    },
    '/devices/import': {
      post: {
        tags: ['Devices'],
        summary: 'Import devices from CSV/Excel',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: crud('Import result'),
      },
    },
    '/devices/{id}': {
      get: {
        tags: ['Devices'],
        summary: 'Get device by ID',
        parameters: [idParam],
        responses: crud(),
      },
      put: {
        tags: ['Devices'],
        summary: 'Update device',
        parameters: [idParam],
        requestBody: jsonBody({ model: { type: 'string' }, firmwareVersion: { type: 'string' } }),
        responses: crud(),
      },
      delete: {
        tags: ['Devices'],
        summary: 'Delete device',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/devices/{id}/sessions': {
      get: {
        tags: ['Devices'],
        summary: 'Get device connection sessions',
        parameters: [idParam],
        responses: ok(),
      },
    },
    '/devices/{id}/runtime': {
      get: {
        tags: ['Devices'],
        summary: 'Get device runtime statistics',
        parameters: [idParam],
        responses: ok(),
      },
    },
    '/devices/{id}/telemetry': {
      get: {
        tags: ['Devices'],
        summary: 'Get device telemetry data',
        parameters: [idParam, { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } }, { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } }],
        responses: ok(),
      },
    },
    '/devices/{id}/command': {
      post: {
        tags: ['Devices'],
        summary: 'Send command to device',
        parameters: [idParam],
        requestBody: jsonBody({ command: { type: 'string' }, payload: { type: 'object' } }),
        responses: crud(),
      },
    },
    '/devices/{id}/ota': {
      post: {
        tags: ['Devices'],
        summary: 'Trigger OTA update for device',
        parameters: [idParam],
        requestBody: jsonBody({
          firmwareVersion: { type: 'string' },
          force: { type: 'boolean' },
          confirmTimeoutSec: { type: 'integer', minimum: 1 },
        }),
        responses: crud(),
      },
    },
    '/devices/{id}/ota/rollback': {
      post: {
        tags: ['Devices'],
        summary: 'Trigger OTA rollback for device',
        parameters: [idParam],
        requestBody: jsonBody({ reason: { type: 'string' } }),
        responses: crud(),
      },
    },
    '/devices/{id}/commands': {
      get: {
        tags: ['Devices'],
        summary: 'Get command history for device',
        parameters: [idParam],
        responses: ok(),
      },
    },
    '/devices/{id}/errors': {
      get: {
        tags: ['Devices'],
        summary: 'Get device error log',
        parameters: [idParam],
        responses: ok(),
      },
    },
    '/devices/{id}/regenerate-token': {
      post: {
        tags: ['Devices'],
        summary: 'Regenerate device auth token',
        parameters: [idParam],
        responses: crud(),
      },
    },

    // ── Vehicles ────────────────────────────────────
    '/vehicles': {
      get: {
        tags: ['Vehicles'],
        summary: 'List vehicles',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Vehicles'],
        summary: 'Create a vehicle',
        requestBody: jsonBody({
          licensePlate: { type: 'string' },
          make: { type: 'string' },
          model: { type: 'string' },
          year: { type: 'integer' },
          customerId: { type: 'string' },
        }),
        responses: crud('Vehicle created'),
      },
    },
    '/vehicles/import': {
      post: {
        tags: ['Vehicles'],
        summary: 'Import vehicles from CSV/Excel',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: crud('Import result'),
      },
    },
    '/vehicles/{id}': {
      get: {
        tags: ['Vehicles'],
        summary: 'Get vehicle by ID',
        parameters: [idParam],
        responses: crud(),
      },
      put: {
        tags: ['Vehicles'],
        summary: 'Update vehicle',
        parameters: [idParam],
        requestBody: jsonBody({ licensePlate: { type: 'string' }, make: { type: 'string' } }),
        responses: crud(),
      },
      delete: {
        tags: ['Vehicles'],
        summary: 'Delete vehicle',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/vehicles/{id}/assign-device': {
      put: {
        tags: ['Vehicles'],
        summary: 'Assign device to vehicle',
        parameters: [idParam],
        requestBody: jsonBody({ deviceId: { type: 'string' } }),
        responses: crud(),
      },
    },
    '/vehicles/{id}/unassign-device': {
      put: {
        tags: ['Vehicles'],
        summary: 'Unassign device from vehicle',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/vehicles/{id}/device': {
      put: {
        tags: ['Vehicles'],
        summary: 'Set device assignment for vehicle',
        parameters: [idParam],
        requestBody: jsonBody({ deviceId: { type: 'string', nullable: true } }),
        responses: crud(),
      },
    },

    // ── Customers ───────────────────────────────────
    '/customers': {
      get: {
        tags: ['Customers'],
        summary: 'List customers',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Customers'],
        summary: 'Create a customer',
        requestBody: jsonBody({
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
        }),
        responses: crud('Customer created'),
      },
    },
    '/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Get customer by ID',
        parameters: [idParam],
        responses: crud(),
      },
      put: {
        tags: ['Customers'],
        summary: 'Update customer',
        parameters: [idParam],
        requestBody: jsonBody({ name: { type: 'string' }, email: { type: 'string' } }),
        responses: crud(),
      },
      delete: {
        tags: ['Customers'],
        summary: 'Delete customer',
        parameters: [idParam],
        responses: crud(),
      },
    },

    // ── Trips ───────────────────────────────────────
    '/trips': {
      get: {
        tags: ['Trips'],
        summary: 'List trips',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Trips'],
        summary: 'Create a trip',
        requestBody: jsonBody({
          vehicleId: { type: 'string' },
          startLocation: { type: 'string' },
          endLocation: { type: 'string' },
        }),
        responses: crud('Trip created'),
      },
    },
    '/trips/{id}': {
      get: {
        tags: ['Trips'],
        summary: 'Get trip by ID',
        parameters: [idParam],
        responses: crud(),
      },
      put: {
        tags: ['Trips'],
        summary: 'Update trip',
        parameters: [idParam],
        requestBody: jsonBody({ startLocation: { type: 'string' }, endLocation: { type: 'string' } }),
        responses: crud(),
      },
      delete: {
        tags: ['Trips'],
        summary: 'Delete trip',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/trips/{id}/telemetry': {
      get: {
        tags: ['Trips'],
        summary: 'Get trip telemetry data',
        parameters: [idParam],
        responses: ok(),
      },
    },
    '/trips/{id}/start': {
      put: {
        tags: ['Trips'],
        summary: 'Start a trip',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/trips/{id}/end': {
      put: {
        tags: ['Trips'],
        summary: 'End a trip',
        parameters: [idParam],
        responses: crud(),
      },
    },

    // ── Alerts ──────────────────────────────────────
    '/alerts': {
      get: {
        tags: ['Alerts'],
        summary: 'List alerts',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Alerts'],
        summary: 'Create an alert',
        requestBody: jsonBody({
          type: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          message: { type: 'string' },
          deviceId: { type: 'string' },
        }),
        responses: crud('Alert created'),
      },
    },
    '/alerts/{id}': {
      get: {
        tags: ['Alerts'],
        summary: 'Get alert by ID',
        parameters: [idParam],
        responses: crud(),
      },
      delete: {
        tags: ['Alerts'],
        summary: 'Delete alert',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/alerts/{id}/acknowledge': {
      put: {
        tags: ['Alerts'],
        summary: 'Acknowledge alert',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/alerts/{id}/resolve': {
      put: {
        tags: ['Alerts'],
        summary: 'Resolve alert',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/alerts/{id}/dismiss': {
      put: {
        tags: ['Alerts'],
        summary: 'Dismiss alert',
        parameters: [idParam],
        responses: crud(),
      },
    },

    // ── Geofences ───────────────────────────────────
    '/geofences': {
      get: {
        tags: ['Geofences'],
        summary: 'List geofences',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Geofences'],
        summary: 'Create a geofence',
        requestBody: jsonBody({
          name: { type: 'string' },
          type: { type: 'string', enum: ['circle', 'polygon'] },
          coordinates: { type: 'array', items: { type: 'number' } },
          radius: { type: 'number' },
        }),
        responses: crud('Geofence created'),
      },
    },
    '/geofences/{id}': {
      get: {
        tags: ['Geofences'],
        summary: 'Get geofence by ID',
        parameters: [idParam],
        responses: crud(),
      },
      put: {
        tags: ['Geofences'],
        summary: 'Update geofence',
        parameters: [idParam],
        requestBody: jsonBody({ name: { type: 'string' }, radius: { type: 'number' } }),
        responses: crud(),
      },
      delete: {
        tags: ['Geofences'],
        summary: 'Delete geofence',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/geofences/{id}/vehicles': {
      post: {
        tags: ['Geofences'],
        summary: 'Assign vehicle to geofence',
        parameters: [idParam],
        requestBody: jsonBody({ vehicleId: { type: 'string' } }),
        responses: crud(),
      },
    },
    '/geofences/{id}/vehicles/{vehicleId}': {
      delete: {
        tags: ['Geofences'],
        summary: 'Unassign vehicle from geofence',
        parameters: [
          idParam,
          { name: 'vehicleId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: crud(),
      },
    },

    // ── Maintenance ─────────────────────────────────
    '/maintenance': {
      get: {
        tags: ['Maintenance'],
        summary: 'List maintenance records',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Maintenance'],
        summary: 'Create maintenance record',
        requestBody: jsonBody({
          vehicleId: { type: 'string' },
          type: { type: 'string' },
          description: { type: 'string' },
          scheduledDate: { type: 'string', format: 'date' },
        }),
        responses: crud('Maintenance record created'),
      },
    },
    '/maintenance/{id}': {
      get: {
        tags: ['Maintenance'],
        summary: 'Get maintenance record by ID',
        parameters: [idParam],
        responses: crud(),
      },
      put: {
        tags: ['Maintenance'],
        summary: 'Update maintenance record',
        parameters: [idParam],
        requestBody: jsonBody({ description: { type: 'string' }, status: { type: 'string' } }),
        responses: crud(),
      },
      delete: {
        tags: ['Maintenance'],
        summary: 'Delete maintenance record',
        parameters: [idParam],
        responses: crud(),
      },
    },

    // ── Firmware ────────────────────────────────────
    '/firmware': {
      get: {
        tags: ['Firmware'],
        summary: 'List firmware versions',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Firmware'],
        summary: 'Create firmware entry',
        requestBody: jsonBody({
          version: { type: 'string' },
          description: { type: 'string' },
          deviceModel: { type: 'string' },
        }),
        responses: crud('Firmware created'),
      },
    },
    '/firmware/upload': {
      post: {
        tags: ['Firmware'],
        summary: 'Upload firmware binary',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, version: { type: 'string' } } } } } },
        responses: crud('Firmware uploaded'),
      },
    },
    '/firmware/{id}': {
      get: {
        tags: ['Firmware'],
        summary: 'Get firmware by ID',
        parameters: [idParam],
        responses: crud(),
      },
      delete: {
        tags: ['Firmware'],
        summary: 'Delete firmware',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/firmware/{id}/download': {
      get: {
        tags: ['Firmware'],
        summary: 'Download firmware binary',
        parameters: [idParam],
        responses: { '200': { description: 'Firmware binary file' }, '404': { description: 'Not found' } },
      },
    },
    '/firmware/{id}/devices': {
      get: {
        tags: ['Firmware'],
        summary: 'Get devices assigned to firmware',
        parameters: [idParam],
        responses: ok(),
      },
    },
    '/firmware/{id}/activate': {
      post: {
        tags: ['Firmware'],
        summary: 'Activate firmware version',
        parameters: [idParam],
        responses: crud(),
      },
      put: {
        tags: ['Firmware'],
        summary: 'Activate firmware version (PUT)',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/firmware/{id}/deactivate': {
      post: {
        tags: ['Firmware'],
        summary: 'Deactivate firmware version',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/firmware/{id}/deploy': {
      post: {
        tags: ['Firmware'],
        summary: 'Deploy firmware to devices',
        parameters: [idParam],
        requestBody: jsonBody({ deviceIds: { type: 'array', items: { type: 'string' } } }),
        responses: crud(),
      },
    },
    '/firmware/{id}/assign': {
      post: {
        tags: ['Firmware'],
        summary: 'Assign firmware to devices',
        parameters: [idParam],
        requestBody: jsonBody({ deviceIds: { type: 'array', items: { type: 'string' } } }),
        responses: crud(),
      },
    },
    '/firmware/{id}/deployments': {
      get: {
        tags: ['Firmware'],
        summary: 'Get firmware deployment history',
        parameters: [idParam],
        responses: ok(),
      },
    },

    // ── Exports ─────────────────────────────────────
    '/exports': {
      get: {
        tags: ['Exports'],
        summary: 'List exports',
        parameters: paginationParams,
        responses: ok(),
      },
      post: {
        tags: ['Exports'],
        summary: 'Create an export job',
        requestBody: jsonBody({
          type: { type: 'string' },
          format: { type: 'string', enum: ['csv', 'xlsx', 'pdf'] },
          filters: { type: 'object' },
        }),
        responses: crud('Export job created'),
      },
    },
    '/exports/{id}': {
      get: {
        tags: ['Exports'],
        summary: 'Get export status',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/exports/{id}/download': {
      get: {
        tags: ['Exports'],
        summary: 'Download exported file',
        parameters: [idParam],
        responses: { '200': { description: 'File download' }, '404': { description: 'Not found' } },
      },
    },

    // ── Dashboard ───────────────────────────────────
    '/dashboard/stats': {
      get: { tags: ['Dashboard'], summary: 'Get dashboard statistics', responses: ok() },
    },
    '/dashboard/activity': {
      get: { tags: ['Dashboard'], summary: 'Get recent activity feed', responses: ok() },
    },
    '/dashboard/activity-feed': {
      get: { tags: ['Dashboard'], summary: 'Get activity feed (alias)', responses: ok() },
    },
    '/dashboard/device-activity': {
      get: { tags: ['Dashboard'], summary: 'Get device activity summary', responses: ok() },
    },
    '/dashboard/device-status': {
      get: { tags: ['Dashboard'], summary: 'Get device status overview', responses: ok() },
    },
    '/dashboard/fleet-runtime': {
      get: { tags: ['Dashboard'], summary: 'Get fleet runtime stats', responses: ok() },
    },

    // ── Statistics ──────────────────────────────────
    '/statistics/fleet': {
      get: { tags: ['Statistics'], summary: 'Get fleet statistics', responses: ok() },
    },
    '/statistics/maintenance': {
      get: { tags: ['Statistics'], summary: 'Get maintenance statistics', responses: ok() },
    },
    '/statistics/summary': {
      get: { tags: ['Statistics'], summary: 'Get overall summary', responses: ok() },
    },
    '/statistics/fleet-usage': {
      get: { tags: ['Statistics'], summary: 'Get fleet usage data', responses: ok() },
    },
    '/statistics/fleet-utilization': {
      get: { tags: ['Statistics'], summary: 'Get fleet utilization (alias)', responses: ok() },
    },
    '/statistics/device-uptime': {
      get: { tags: ['Statistics'], summary: 'Get device uptime stats', responses: ok() },
    },
    '/statistics/alert-frequency': {
      get: { tags: ['Statistics'], summary: 'Get alert frequency data', responses: ok() },
    },
    '/statistics/trip-summary': {
      get: { tags: ['Statistics'], summary: 'Get trip summary statistics', responses: ok() },
    },

    // ── Notifications ───────────────────────────────
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications',
        parameters: paginationParams,
        responses: ok(),
      },
    },
    '/notifications/stats': {
      get: { tags: ['Notifications'], summary: 'Get notification statistics', responses: ok() },
    },
    '/notifications/read-all': {
      put: { tags: ['Notifications'], summary: 'Mark all notifications as read', responses: ok() },
    },
    '/notifications/mark-all-read': {
      put: { tags: ['Notifications'], summary: 'Mark all notifications as read (alias)', responses: ok() },
    },
    '/notifications/{id}/read': {
      put: {
        tags: ['Notifications'],
        summary: 'Mark notification as read',
        parameters: [idParam],
        responses: crud(),
      },
    },
    '/notifications/{id}': {
      delete: {
        tags: ['Notifications'],
        summary: 'Delete notification',
        parameters: [idParam],
        responses: crud(),
      },
    },

    // ── Telemetry ───────────────────────────────────
    '/telemetry/history': {
      get: {
        tags: ['Telemetry'],
        summary: 'Query telemetry history',
        parameters: [
          { name: 'deviceId', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'metric', in: 'query', schema: { type: 'string' } },
        ],
        responses: ok(),
      },
    },
    '/telemetry/export': {
      post: {
        tags: ['Telemetry'],
        summary: 'Export telemetry data',
        requestBody: jsonBody({
          deviceId: { type: 'string' },
          from: { type: 'string', format: 'date-time' },
          to: { type: 'string', format: 'date-time' },
          format: { type: 'string' },
        }),
        responses: crud('Export initiated'),
      },
    },

    // ── Simulator ───────────────────────────────────
    '/simulator/status': {
      get: { tags: ['Simulator'], summary: 'Get simulator status', responses: ok() },
    },
    '/simulator/start': {
      post: {
        tags: ['Simulator'],
        summary: 'Start device simulator',
        requestBody: jsonBody({
          deviceCount: { type: 'integer' },
          intervalMs: { type: 'integer' },
        }),
        responses: crud(),
      },
    },
    '/simulator/stop': {
      post: { tags: ['Simulator'], summary: 'Stop simulator', responses: ok() },
    },
    '/simulator/pause': {
      post: { tags: ['Simulator'], summary: 'Pause simulator', responses: ok() },
    },
    '/simulator/resume': {
      post: { tags: ['Simulator'], summary: 'Resume simulator', responses: ok() },
    },

    // ── System ──────────────────────────────────────
    '/system/health': {
      get: { tags: ['System'], summary: 'Get system health status', responses: ok() },
    },
    '/system/metrics': {
      get: { tags: ['System'], summary: 'Get system metrics', responses: ok() },
    },

    // ── System Admin ────────────────────────────────
    '/system-admin/health': {
      get: { tags: ['System Admin'], summary: 'Get admin health check', responses: ok() },
    },
    '/system-admin/metrics': {
      get: {
        tags: ['System Admin'],
        summary: 'Query Prometheus/VictoriaMetrics',
        parameters: [{ name: 'query', in: 'query', schema: { type: 'string' }, description: 'PromQL query' }],
        responses: ok(),
      },
    },
    '/system-admin/logs': {
      get: {
        tags: ['System Admin'],
        summary: 'Query VictoriaLogs',
        parameters: [
          { name: 'query', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: ok(),
      },
    },
    '/system-admin/audit': {
      get: {
        tags: ['System Admin'],
        summary: 'Query audit trail',
        parameters: paginationParams,
        responses: ok(),
      },
    },
    '/system-admin/settings': {
      get: { tags: ['System Admin'], summary: 'Get system settings', responses: ok() },
    },
    '/system-admin/settings/{key}': {
      put: {
        tags: ['System Admin'],
        summary: 'Update a system setting',
        parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: jsonBody({ value: { type: 'string' } }),
        responses: crud(),
      },
    },
    '/system-admin/tables': {
      get: { tags: ['System Admin'], summary: 'List database tables', responses: ok() },
    },
    '/system-admin/tables/{table}': {
      get: {
        tags: ['System Admin'],
        summary: 'Query a database table',
        parameters: [
          { name: 'table', in: 'path', required: true, schema: { type: 'string' } },
          ...paginationParams,
        ],
        responses: ok(),
      },
    },
    '/system-admin/tables/{table}/columns': {
      get: {
        tags: ['System Admin'],
        summary: 'List columns of a database table',
        parameters: [{ name: 'table', in: 'path', required: true, schema: { type: 'string' } }],
        responses: ok(),
      },
    },

  },
};
