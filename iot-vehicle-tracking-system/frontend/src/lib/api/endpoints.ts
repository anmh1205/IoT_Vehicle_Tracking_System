export const API = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    REGISTER: "/api/v1/auth/register",
    LOGOUT: "/api/v1/auth/logout",
    REFRESH: "/api/v1/auth/refresh",
  },
  VEHICLES: {
    LIST: "/api/v1/vehicles",
    DETAILS: (id: number | string) => `/api/v1/vehicles/${id}`,
    CREATE: "/api/v1/vehicles",
    UPDATE: "/api/v1/vehicles",
    DELETE: (id: number | string) => `/api/v1/vehicles/${id}`,
  },
  TRIPS: {
    LIST: "/api/v1/trips",
    DETAILS: (id: number | string) => `/api/v1/trips/${id}`,
  },
  TELEMETRY: {
    LOCATION: (deviceId: string) =>
      `/api/v1/telemetry/location?device_id=${deviceId}`,
  },
  // ... other endpoints
} as const;

