# 🤖 AI Agent Implementation Guide - Frontend IoT Vehicle Tracking

> **Mục đích**: Tài liệu này hướng dẫn AI Agent implement từng file theo thứ tự. Agent chỉ cần follow từng task và sinh code theo template.

---

## 📍 Project Context

```
PROJECT_ROOT = e:\1. Phenikaa University\AML\0. Project\12. DATN\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\frontend
SRC_DIR = {PROJECT_ROOT}\src
```

**Tech Stack**: Next.js 16, React 19, TailwindCSS 4, shadcn/ui, TanStack Query, Zustand, Zod, Socket.io-client, Leaflet

---

## 🎯 PHASE 1: TYPE DEFINITIONS

### Task 1.1: Create `types/common.ts`

**File Path**: `{SRC_DIR}/types/common.ts`

**Instructions**: Tạo file với các common types dùng chung trong toàn bộ app.

**Code Template**:
```typescript
/**
 * Common Types - CORRECTED based on REVIEW_CORRECTIONS.md
 */

// Pagination metadata
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  timestamp: string;  // Backend always includes timestamp
}

// Standard API response wrapper - Backend TransformInterceptor wraps ALL responses
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;  // Backend always adds timestamp
    [key: string]: any; // May have additional meta fields
  };
}

// Paginated API response
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Query parameters for list endpoints
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Date range filter
export interface DateRange {
  startDate: string;
  endDate: string;
}

// API Error response - matches backend HttpExceptionFilter
export interface ApiError {
  error: {
    code: string;
    message: string;
    status: number;
    path: string;
    details?: any;
    traceId: string;
  };
  timestamp: string;
}

// Base entity with audit fields
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// Status enum
export type StatusType = 'active' | 'inactive' | 'pending' | 'deleted';
```

---

### Task 1.2: Create `types/auth.ts`

**File Path**: `{SRC_DIR}/types/auth.ts`

**Dependencies**: Task 1.1

**Instructions**: Tạo auth types. Import `BaseEntity` từ `./common`.

**Code Template**:
```typescript
/**
 * Auth Types - Aligned with backend User entity
 * CORRECTED based on REVIEW_CORRECTIONS.md
 */
import type { BaseEntity } from './common';

// Backend has 4 roles: admin, manager, staff, user
export type UserRole = 'admin' | 'manager' | 'staff' | 'user';

// Backend User status enum
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User extends BaseEntity {
  email: string;
  username: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;     // Backend uses "status" not "isActive"
  lastLogin?: string;     // Backend uses "lastLogin" not "lastLoginAt"
}

// Backend returns session object, not tokens
export interface SessionResponse {
  token: string;          // Backend uses "token" not "accessToken"
  refreshToken: string;
  expiresAt: string;      // Backend returns ISO string, not expiresIn number
}

export interface LoginDto {
  username: string;       // Backend accepts username OR email in this field
  password: string;
}

export interface LoginResponse {
  user: User;
  session: SessionResponse;  // Backend uses "session" not "tokens"
}

export interface RegisterDto {
  email: string;
  password: string;
  username: string;
  fullName?: string;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;      // Match backend field name
  refreshToken: string | null;
  expiresAt: string | null;  // For token expiration check
  isAuthenticated: boolean;
}
```

---

### Task 1.3: Create `types/vehicle.ts`

**File Path**: `{SRC_DIR}/types/vehicle.ts`

**Dependencies**: Task 1.1

**Instructions**: Tạo vehicle types dựa trên backend Vehicle entity.

**Code Template**:
```typescript
/**
 * Vehicle Types - Aligned with backend Vehicle entity
 */
import type { BaseEntity, QueryParams } from './common';

// Backend status enum: 'active' | 'inactive' | 'maintenance' | 'retired'
export type VehicleStatus = 'active' | 'inactive' | 'maintenance' | 'retired';

// Availability status for rental feature
export type AvailabilityStatus = 'available' | 'rented' | 'maintenance' | 'reserved' | 'inactive';

export interface Vehicle extends BaseEntity {
  vehicleId: string;
  plateNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType?: string;      // sedan, suv, truck, etc.
  vin?: string;              // Vehicle Identification Number
  seats?: number;
  transmission?: string;     // automatic, manual
  fuelType?: string;         // gasoline, diesel, electric, hybrid
  mileageKm?: number;
  registrationNumber?: string;
  insuranceExpiry?: string;  // Date string
  status: VehicleStatus;
  // Rental pricing fields (Phase 2)
  rentalPricePerDay?: number;
  rentalPricePerHour?: number;
  depositAmount?: number;
  availabilityStatus?: AvailabilityStatus;
  // Relations
  ownerId?: number;
  deviceId?: number;
  // Computed/runtime fields
  lastLocation?: VehicleLocation;
}

export interface VehicleLocation {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface CreateVehicleDto {
  vehicleId: string;
  plateNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType?: string;
  vin?: string;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  mileageKm?: number;
  registrationNumber?: string;
  insuranceExpiry?: string;
  status?: VehicleStatus;
  ownerId?: number;
  deviceId?: number;
}

export interface UpdateVehicleDto {
  plateNumber?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vehicleType?: string;
  vin?: string;
  seats?: number;
  transmission?: string;
  fuelType?: string;
  mileageKm?: number;
  registrationNumber?: string;
  insuranceExpiry?: string;
  status?: VehicleStatus;
  ownerId?: number;
  deviceId?: number;
}

export interface QueryVehicleDto extends QueryParams {
  status?: VehicleStatus;
  ownerId?: number;
}
```

---

### Task 1.4: Create `types/device.ts`

**File Path**: `{SRC_DIR}/types/device.ts`

**Dependencies**: Task 1.1

**Instructions**: Tạo device types.

**Code Template**:
```typescript
/**
 * Device Types - CORRECTED based on REVIEW_CORRECTIONS.md
 */
import type { BaseEntity, QueryParams } from './common';

// Backend status enum (not 'online', 'maintenance')
export type DeviceStatus = 'active' | 'inactive' | 'offline' | 'error';

export interface Device extends BaseEntity {
  deviceId: string;
  vehicleId?: number;
  deviceType?: string;      // Backend has this (default: 'tracker')
  firmwareVersion?: string;
  hardwareVersion?: string; // Backend has this
  imei?: string;            // Backend has this (unique)
  simCardNumber?: string;   // Backend has this
  status: DeviceStatus;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
  // NOTE: serialNumber does NOT exist in backend
}

export interface CreateDeviceDto {
  deviceId: string;
  vehicleId?: number;
  deviceType?: string;      // Optional, default: 'tracker'
  firmwareVersion?: string;
  hardwareVersion?: string;
  imei?: string;
  simCardNumber?: string;
  status?: DeviceStatus;    // Optional, default: 'active'
}

export interface UpdateDeviceDto {
  firmwareVersion?: string;
  hardwareVersion?: string;
  imei?: string;
  simCardNumber?: string;
  status?: DeviceStatus;
  vehicleId?: number;
}

export interface QueryDeviceDto extends QueryParams {
  status?: DeviceStatus;
  vehicleId?: number;
}

export interface AssignDeviceDto {
  vehicleId: number;
}
```

---

### Task 1.5: Create `types/customer.ts`

**File Path**: `{SRC_DIR}/types/customer.ts`

**Dependencies**: Task 1.1

**Code Template**:
```typescript
/**
 * Customer Types - CORRECTED based on REVIEW_CORRECTIONS.md
 */
import type { BaseEntity, QueryParams } from './common';

export type CustomerStatus = 'active' | 'suspended' | 'blacklisted';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface Customer extends BaseEntity {
  userId?: number;
  fullName: string;           // Backend uses "fullName" not "name"
  email?: string;
  phone: string;              // Required in backend
  dateOfBirth?: string;
  // ID Card info
  idCardNumber?: string;
  idCardIssueDate?: string;
  idCardIssuePlace?: string;
  address?: string;
  // Driver's license info
  licenseNumber?: string;
  licenseType?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  licenseIssuePlace?: string;
  // Status
  status: CustomerStatus;     // Backend uses "status" not "isActive"
  verificationStatus: VerificationStatus;
  verifiedBy?: number;
  verifiedAt?: string;
  // Rental stats
  totalRentals?: number;
  totalSpent?: number;
  ratingAverage?: number;
}

export interface CreateCustomerDto {
  fullName: string;
  email?: string;
  phone: string;              // Required
  dateOfBirth?: string;
  idCardNumber?: string;
  idCardIssueDate?: string;
  idCardIssuePlace?: string;
  address?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  licenseIssuePlace?: string;
  status?: CustomerStatus;
  userId?: number;
}

export interface UpdateCustomerDto {
  fullName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  idCardNumber?: string;
  idCardIssueDate?: string;
  idCardIssuePlace?: string;
  address?: string;
  licenseNumber?: string;
  licenseType?: string;
  licenseIssueDate?: string;
  licenseExpiryDate?: string;
  licenseIssuePlace?: string;
  status?: CustomerStatus;
  verificationStatus?: VerificationStatus;
}

export interface QueryCustomerDto extends QueryParams {
  status?: CustomerStatus;
  verificationStatus?: VerificationStatus;
}
```

---

### Task 1.6: Create `types/trip.ts`

**File Path**: `{SRC_DIR}/types/trip.ts`

**Dependencies**: Task 1.1

**Code Template**:
```typescript
/**
 * Trip Types
 */
import type { BaseEntity, QueryParams, DateRange } from './common';

export type TripStatus = 'active' | 'completed' | 'cancelled';

export interface Trip extends BaseEntity {
  vehicleId: number;
  driverId?: number;
  status: TripStatus;
  startTime: string;
  endTime?: string;
  startLocation?: TripLocation;
  endLocation?: TripLocation;
  distance?: number;
  duration?: number;
  maxSpeed?: number;
  avgSpeed?: number;
}

export interface TripLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface TripEvent {
  id: number;
  tripId: number;
  type: string;
  timestamp: string;
  location?: TripLocation;
  data?: Record<string, unknown>;
}

export interface TripRoute {
  tripId: number;
  points: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
  }>;
}

export interface QueryTripDto extends QueryParams, Partial<DateRange> {
  vehicleId?: number;
  status?: TripStatus;
}
```

---

### Task 1.7: Create `types/telemetry.ts`

**File Path**: `{SRC_DIR}/types/telemetry.ts`

**Dependencies**: Task 1.1

**Code Template**:
```typescript
/**
 * Telemetry Types
 */
import type { DateRange } from './common';

export interface TelemetryData {
  deviceId: string;
  vehicleId: number;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  speed?: number;
  heading?: number;
  engineStatus?: boolean;
  fuelLevel?: number;
  odometer?: number;
  batteryVoltage?: number;
}

export interface TelemetryHistory {
  vehicleId: number;
  data: TelemetryData[];
  dateRange: DateRange;
}

export interface LiveLocation {
  vehicleId: number;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: string;
}

export interface QueryTelemetryDto extends Partial<DateRange> {
  vehicleId?: number;
  deviceId?: string;
  limit?: number;
}
```

---

### Task 1.8: Create `types/alert.ts`

**File Path**: `{SRC_DIR}/types/alert.ts`

**Dependencies**: Task 1.1

**Code Template**:
```typescript
/**
 * Alert Types
 */
import type { BaseEntity, QueryParams, DateRange } from './common';

export type AlertType = 
  | 'speeding' 
  | 'geofence_enter' 
  | 'geofence_exit' 
  | 'harsh_braking' 
  | 'harsh_acceleration'
  | 'idle'
  | 'low_battery'
  | 'device_offline';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved';

export interface Alert extends BaseEntity {
  vehicleId: number;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  acknowledgedAt?: string;
  acknowledgedBy?: number;
  resolvedAt?: string;
  resolvedBy?: number;
}

export interface AcknowledgeAlertDto {
  notes?: string;
}

export interface ResolveAlertDto {
  resolution: string;
}

export interface QueryAlertDto extends QueryParams, Partial<DateRange> {
  vehicleId?: number;
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
}
```

---

### Task 1.9: Create `types/geofence.ts`

**File Path**: `{SRC_DIR}/types/geofence.ts`

**Dependencies**: Task 1.1

**Code Template**:
```typescript
/**
 * Geofence Types
 */
import type { BaseEntity, QueryParams } from './common';

export type GeofenceType = 'circle' | 'polygon';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Geofence extends BaseEntity {
  name: string;
  description?: string;
  type: GeofenceType;
  isActive: boolean;
  // For circle type
  center?: GeoPoint;
  radius?: number;
  // For polygon type
  coordinates?: GeoPoint[];
  // Assigned vehicles
  vehicleIds?: number[];
}

export interface CreateGeofenceDto {
  name: string;
  description?: string;
  type: GeofenceType;
  center?: GeoPoint;
  radius?: number;
  coordinates?: GeoPoint[];
}

export interface UpdateGeofenceDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  center?: GeoPoint;
  radius?: number;
  coordinates?: GeoPoint[];
}

export interface AssignVehiclesToGeofenceDto {
  vehicleIds: number[];
}

export interface QueryGeofenceDto extends QueryParams {
  isActive?: boolean;
  type?: GeofenceType;
}
```

---

### Task 1.10: Create `types/maintenance.ts`

**File Path**: `{SRC_DIR}/types/maintenance.ts`

**Dependencies**: Task 1.1

**Code Template**:
```typescript
/**
 * Maintenance Types
 */
import type { BaseEntity, QueryParams, DateRange } from './common';

export type MaintenanceType = 
  | 'oil_change' 
  | 'tire_rotation' 
  | 'brake_service' 
  | 'inspection' 
  | 'repair' 
  | 'other';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Maintenance extends BaseEntity {
  vehicleId: number;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description?: string;
  scheduledDate: string;
  completedDate?: string;
  cost?: number;
  odometer?: number;
  notes?: string;
}

export interface CreateMaintenanceDto {
  vehicleId: number;
  type: MaintenanceType;
  description?: string;
  scheduledDate: string;
  cost?: number;
  odometer?: number;
  notes?: string;
}

export interface UpdateMaintenanceDto {
  status?: MaintenanceStatus;
  completedDate?: string;
  cost?: number;
  notes?: string;
}

export interface QueryMaintenanceDto extends QueryParams, Partial<DateRange> {
  vehicleId?: number;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
}
```

---

### Task 1.11: Create `types/command.ts`

**File Path**: `{SRC_DIR}/types/command.ts`

**Dependencies**: Task 1.1

**Code Template**:
```typescript
/**
 * Command Types
 */
import type { BaseEntity, QueryParams } from './common';

export type CommandType = 
  | 'engine_on' 
  | 'engine_off' 
  | 'lock' 
  | 'unlock' 
  | 'locate' 
  | 'reboot'
  | 'update_config';

export type CommandStatus = 'pending' | 'sent' | 'delivered' | 'executed' | 'failed';

export interface Command extends BaseEntity {
  deviceId: number;
  vehicleId: number;
  type: CommandType;
  status: CommandStatus;
  payload?: Record<string, unknown>;
  sentAt?: string;
  deliveredAt?: string;
  executedAt?: string;
  errorMessage?: string;
}

export interface SendCommandDto {
  deviceId: number;
  type: CommandType;
  payload?: Record<string, unknown>;
}

export interface QueryCommandDto extends QueryParams {
  deviceId?: number;
  vehicleId?: number;
  type?: CommandType;
  status?: CommandStatus;
}
```

---

### Task 1.12: Create `types/notification.ts`

**File Path**: `{SRC_DIR}/types/notification.ts`

**Dependencies**: Task 1.1

**Code Template**:
```typescript
/**
 * Notification Types
 */
import type { BaseEntity, QueryParams } from './common';

export type NotificationType = 'alert' | 'info' | 'warning' | 'success';

export interface Notification extends BaseEntity {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface MarkAsReadDto {
  notificationIds: number[];
}

export interface QueryNotificationDto extends QueryParams {
  isRead?: boolean;
  type?: NotificationType;
}
```

---

### Task 1.13: Create `types/violation.ts`

**File Path**: `{SRC_DIR}/types/violation.ts`

**Dependencies**: Task 1.1

**Code Template**:
```typescript
/**
 * Violation Types
 */
import type { BaseEntity, QueryParams, DateRange } from './common';

export type ViolationType = 
  | 'speeding' 
  | 'harsh_braking' 
  | 'harsh_acceleration' 
  | 'geofence_breach'
  | 'unauthorized_use';

export interface Violation extends BaseEntity {
  vehicleId: number;
  tripId?: number;
  type: ViolationType;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  value?: number; // e.g., speed value for speeding
  threshold?: number; // e.g., speed limit
  description?: string;
}

export interface QueryViolationDto extends QueryParams, Partial<DateRange> {
  vehicleId?: number;
  tripId?: number;
  type?: ViolationType;
}
```

---

### Task 1.14: Create `types/data-table.ts`

**File Path**: `{SRC_DIR}/types/data-table.ts`

**Code Template**:
```typescript
/**
 * Data Table Types for TanStack Table
 */
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
  };
  onRowClick?: (row: TData) => void;
}

export interface DataTableToolbarProps<TData> {
  table: import('@tanstack/react-table').Table<TData>;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
}

export interface UseDataTableOptions {
  initialPageSize?: number;
  initialSorting?: SortingState;
  initialColumnFilters?: ColumnFiltersState;
  initialColumnVisibility?: VisibilityState;
}
```

---

### Task 1.15: Create `types/index.ts`

**File Path**: `{SRC_DIR}/types/index.ts`

**Dependencies**: Tasks 1.1 - 1.14

**Instructions**: Re-export tất cả types từ một file index.

**Code Template**:
```typescript
/**
 * Type exports - Re-export all types
 */

// Common
export * from './common';

// Auth
export * from './auth';

// Entities
export * from './vehicle';
export * from './device';
export * from './customer';
export * from './trip';
export * from './telemetry';
export * from './alert';
export * from './geofence';
export * from './maintenance';
export * from './command';
export * from './notification';
export * from './violation';

// UI
export * from './data-table';
```

---

## 🎯 PHASE 2: API LAYER

### Task 2.1: Create `lib/api/endpoints.ts`

**File Path**: `{SRC_DIR}/lib/api/endpoints.ts`

**Instructions**: Định nghĩa tất cả API endpoints dựa trên backend routes.

**Code Template**:
```typescript
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
```

---

### Task 2.2: Create `lib/api/http.ts`

**File Path**: `{SRC_DIR}/lib/api/http.ts`

**Instructions**: HTTP client wrapper với error handling, auth headers, retry logic.

**Code Template**:
```typescript
/**
 * HTTP Client - Wrapper for fetch with auth and error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

// Get auth store - lazy import to avoid circular dependency
const getAuthStore = async () => {
  const { useAuthStore } = await import('@/lib/store/auth-store');
  return useAuthStore.getState();
};

// Check if error is retryable
function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError) return true; // Network error
  if (error instanceof Response) {
    return error.status >= 500 || error.status === 429;
  }
  return false;
}

// Retry with exponential backoff  
async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries && isRetryableError(error)) {
        await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, i)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// Main request function
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const authStore = await getAuthStore();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth token if available
  if (authStore.token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authStore.token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 - Token expired
  if (response.status === 401) {
    authStore.logout();
    throw new Error('Session expired. Please login again.');
  }

  // Handle error responses
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP Error: ${response.status}`);
  }

  // Return JSON response
  return response.json();
}

// HTTP methods
export const http = {
  get: <T>(endpoint: string) => retryRequest(() => request<T>(endpoint)),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    }),
};
```

---

### Task 2.3: Create `lib/api/vehicles.ts`

**File Path**: `{SRC_DIR}/lib/api/vehicles.ts`

**Dependencies**: Tasks 2.1, 2.2, 1.3

**Instructions**: Vehicle API service. Import types từ `@/types`, http từ `./http`, endpoints từ `./endpoints`.

**Code Template**:
```typescript
/**
 * Vehicle API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Vehicle,
  CreateVehicleDto,
  UpdateVehicleDto,
  QueryVehicleDto,
  VehicleLocation,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

// Build query string from params
function buildQueryString(params?: QueryVehicleDto): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const vehicleServices = {
  // List vehicles with pagination and filters
  list: async (params?: QueryVehicleDto): Promise<PaginatedResponse<Vehicle>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Vehicle>>(`${API.VEHICLES.LIST}${query}`);
  },

  // Get vehicle by ID
  getById: async (id: number | string): Promise<ApiResponse<Vehicle>> => {
    return http.get<ApiResponse<Vehicle>>(API.VEHICLES.DETAILS(id));
  },

  // Create new vehicle
  create: async (data: CreateVehicleDto): Promise<ApiResponse<Vehicle>> => {
    return http.post<ApiResponse<Vehicle>>(API.VEHICLES.CREATE, data);
  },

  // Update vehicle
  update: async (id: number | string, data: UpdateVehicleDto): Promise<ApiResponse<Vehicle>> => {
    return http.patch<ApiResponse<Vehicle>>(API.VEHICLES.UPDATE(id), data);
  },

  // Delete vehicle
  delete: async (id: number | string): Promise<void> => {
    await http.delete(API.VEHICLES.DELETE(id));
  },

  // Get vehicle status/location
  getStatus: async (id: number | string): Promise<ApiResponse<VehicleLocation>> => {
    return http.get<ApiResponse<VehicleLocation>>(API.VEHICLES.STATUS(id));
  },
};
```

---

### Task 2.4: Create `lib/api/devices.ts`

**File Path**: `{SRC_DIR}/lib/api/devices.ts`

**Dependencies**: Tasks 2.1, 2.2, 1.4

**Instructions**: Device API service. Follow same pattern as vehicles.ts.

**Code Template**:
```typescript
/**
 * Device API Service
 */
import { http } from './http';
import { API } from './endpoints';
import type {
  Device,
  CreateDeviceDto,
  UpdateDeviceDto,
  QueryDeviceDto,
  AssignDeviceDto,
  PaginatedResponse,
  ApiResponse,
} from '@/types';

function buildQueryString(params?: QueryDeviceDto): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const deviceServices = {
  list: async (params?: QueryDeviceDto): Promise<PaginatedResponse<Device>> => {
    const query = buildQueryString(params);
    return http.get<PaginatedResponse<Device>>(`${API.DEVICES.LIST}${query}`);
  },

  getById: async (id: number | string): Promise<ApiResponse<Device>> => {
    return http.get<ApiResponse<Device>>(API.DEVICES.DETAILS(id));
  },

  create: async (data: CreateDeviceDto): Promise<ApiResponse<Device>> => {
    return http.post<ApiResponse<Device>>(API.DEVICES.CREATE, data);
  },

  update: async (id: number | string, data: UpdateDeviceDto): Promise<ApiResponse<Device>> => {
    return http.patch<ApiResponse<Device>>(API.DEVICES.UPDATE(id), data);
  },

  delete: async (id: number | string): Promise<void> => {
    await http.delete(API.DEVICES.DELETE(id));
  },

  assignToVehicle: async (id: number | string, data: AssignDeviceDto): Promise<ApiResponse<Device>> => {
    return http.post<ApiResponse<Device>>(API.DEVICES.ASSIGN(id), data);
  },
};
```

---

### Task 2.5 - 2.12: Create remaining API services

**Pattern**: Follow same pattern as Task 2.3 và 2.4 cho các services sau:

| Task | File Path | Type Dependencies |
|------|-----------|-------------------|
| 2.5 | `lib/api/customers.ts` | Customer types |
| 2.6 | `lib/api/trips.ts` | Trip types |
| 2.7 | `lib/api/telemetry.ts` | Telemetry types |
| 2.8 | `lib/api/alerts.ts` | Alert types |
| 2.9 | `lib/api/geofences.ts` | Geofence types |
| 2.10 | `lib/api/maintenance.ts` | Maintenance types |
| 2.11 | `lib/api/commands.ts` | Command types |
| 2.12 | `lib/api/notifications.ts` | Notification types |

**Agent Instructions**: 
1. Copy pattern từ Task 2.3/2.4
2. Thay thế entity name và types tương ứng
3. Thêm các methods đặc biệt nếu có (e.g., alerts có `acknowledge`, `resolve`)

---

### Task 2.13: Create `lib/api/auth.ts`

**File Path**: `{SRC_DIR}/lib/api/auth.ts`

**Code Template**:
```typescript
/**
 * Auth API Service - Aligned with backend routes
 */
import { http } from './http';
import { API } from './endpoints';
import type { LoginDto, LoginResponse, RegisterDto, User, ApiResponse } from '@/types';

export const authServices = {
  login: async (data: LoginDto): Promise<LoginResponse> => {
    return http.post<LoginResponse>(API.AUTH.LOGIN, data);
  },

  logout: async (): Promise<void> => {
    await http.post(API.AUTH.LOGOUT);
  },

  register: async (data: RegisterDto): Promise<ApiResponse<User>> => {
    return http.post<ApiResponse<User>>(API.AUTH.REGISTER, data);
  },

  // Backend uses /auth/profile not /auth/me
  getProfile: async (): Promise<User> => {
    return http.get<User>(API.AUTH.PROFILE);
  },

  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    return http.post<{ token: string }>(API.AUTH.REFRESH, { refreshToken });
  },
};
```

---

## 🎯 PHASE 3: ZUSTAND STORES

### Task 3.1: Create `lib/store/auth-store.ts`

**File Path**: `{SRC_DIR}/lib/store/auth-store.ts`

**Code Template**:
```typescript
/**
 * Auth Store - CORRECTED based on REVIEW_CORRECTIONS.md
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthState } from '@/types';

interface AuthActions {
  setUser: (user: User) => void;
  // Backend returns session.token, session.refreshToken, session.expiresAt
  setSession: (token: string, refreshToken: string, expiresAt: string) => void;
  logout: () => void;
  hydrate: () => void;
  isTokenExpired: () => boolean;  // Helper to check expiration
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State - matches backend response structure
      user: null,
      token: null,           // Backend uses "token" not "accessToken"
      refreshToken: null,
      expiresAt: null,       // For token expiration check
      isAuthenticated: false,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: true }),

      setSession: (token, refreshToken, expiresAt) =>
        set({ token, refreshToken, expiresAt, isAuthenticated: true }),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          expiresAt: null,
          isAuthenticated: false,
        }),

      hydrate: () => {
        // Called on app init to restore state
      },

      isTokenExpired: () => {
        const { expiresAt } = get();
        if (!expiresAt) return true;
        return new Date(expiresAt) < new Date();
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        user: state.user,
      }),
    }
  )
);
```

---

### Task 3.2: Create `lib/store/ui-store.ts`

**File Path**: `{SRC_DIR}/lib/store/ui-store.ts`

**Code Template**:
```typescript
/**
 * UI Store - Zustand store for UI state
 */
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  setTheme: (theme: UIState['theme']) => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  // State
  sidebarOpen: true,
  sidebarCollapsed: false,
  theme: 'system',

  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
}));
```

---

## 🎯 PHASE 4: REACT QUERY HOOKS

### Task 4.1: Create `lib/constants/query-keys.ts`

**File Path**: `{SRC_DIR}/lib/constants/query-keys.ts`

**Code Template**:
```typescript
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
```

---

### Task 4.2: Create `lib/constants/query-cache.ts`

**File Path**: `{SRC_DIR}/lib/constants/query-cache.ts`

**Code Template**:
```typescript
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
```

---

### Task 4.3: Create `hooks/queries/use-vehicles.ts`

**File Path**: `{SRC_DIR}/hooks/queries/use-vehicles.ts`

**Code Template**:
```typescript
/**
 * useVehicles Hook - Fetch vehicles list
 */
import { useQuery } from '@tanstack/react-query';
import { vehicleServices } from '@/lib/api/vehicles';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryVehicleDto } from '@/types';

export function useVehicles(params?: QueryVehicleDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.VEHICLES, params],
    queryFn: () => vehicleServices.list(params),
    enabled,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}
```

---

### Task 4.4: Create `hooks/queries/use-vehicle.ts`

**File Path**: `{SRC_DIR}/hooks/queries/use-vehicle.ts`

**Code Template**:
```typescript
/**
 * useVehicle Hook - Fetch single vehicle
 */
import { useQuery } from '@tanstack/react-query';
import { vehicleServices } from '@/lib/api/vehicles';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';

export function useVehicle(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.VEHICLE(id!),
    queryFn: () => vehicleServices.getById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.VEHICLE_LIST,
  });
}

export function useVehicleStatus(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.VEHICLE_STATUS(id!),
    queryFn: () => vehicleServices.getStatus(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.VEHICLE_STATUS,
    refetchInterval: STALE_TIMES.VEHICLE_STATUS,
  });
}
```

---

### Task 4.5 - 4.12: Create remaining query hooks

**Pattern**: Follow same pattern as Task 4.3/4.4 cho các hooks sau:

| Task | File Path | API Service |
|------|-----------|-------------|
| 4.5 | `hooks/queries/use-devices.ts` | deviceServices |
| 4.6 | `hooks/queries/use-customers.ts` | customerServices |
| 4.7 | `hooks/queries/use-trips.ts` | tripServices |
| 4.8 | `hooks/queries/use-telemetry.ts` | telemetryServices |
| 4.9 | `hooks/queries/use-alerts.ts` | alertServices |
| 4.10 | `hooks/queries/use-geofences.ts` | geofenceServices |
| 4.11 | `hooks/queries/use-maintenance.ts` | maintenanceServices |
| 4.12 | `hooks/queries/use-commands.ts` | commandServices |

---

### Task 4.13: Create `hooks/mutations/use-vehicle-mutations.ts`

**File Path**: `{SRC_DIR}/hooks/mutations/use-vehicle-mutations.ts`

**Code Template**:
```typescript
/**
 * Vehicle Mutation Hooks
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleServices } from '@/lib/api/vehicles';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { CreateVehicleDto, UpdateVehicleDto } from '@/types';

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVehicleDto) => vehicleServices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
      toast.success('Vehicle created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create vehicle', { description: error.message });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number | string; data: UpdateVehicleDto }) =>
      vehicleServices.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLE(variables.id) });
      toast.success('Vehicle updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update vehicle', { description: error.message });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => vehicleServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
      toast.success('Vehicle deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete vehicle', { description: error.message });
    },
  });
}
```

---

### Task 4.14 - 4.20: Create remaining mutation hooks

**Pattern**: Follow same pattern as Task 4.13 cho các mutations:

| Task | File Path | Mutations |
|------|-----------|-----------|
| 4.14 | `hooks/mutations/use-device-mutations.ts` | create, update, delete, assign |
| 4.15 | `hooks/mutations/use-customer-mutations.ts` | create, update, delete |
| 4.16 | `hooks/mutations/use-trip-mutations.ts` | create, update |
| 4.17 | `hooks/mutations/use-alert-mutations.ts` | acknowledge, resolve |
| 4.18 | `hooks/mutations/use-geofence-mutations.ts` | create, update, delete, assignVehicles |
| 4.19 | `hooks/mutations/use-maintenance-mutations.ts` | create, update, delete |
| 4.20 | `hooks/mutations/use-command-mutations.ts` | send |

---

## 📋 SUMMARY - TASK INDEX

```
PHASE 1: TYPES (15 tasks)
├── 1.1  types/common.ts
├── 1.2  types/auth.ts
├── 1.3  types/vehicle.ts
├── 1.4  types/device.ts
├── 1.5  types/customer.ts
├── 1.6  types/trip.ts
├── 1.7  types/telemetry.ts
├── 1.8  types/alert.ts
├── 1.9  types/geofence.ts
├── 1.10 types/maintenance.ts
├── 1.11 types/command.ts
├── 1.12 types/notification.ts
├── 1.13 types/violation.ts
├── 1.14 types/data-table.ts
└── 1.15 types/index.ts

PHASE 2: API LAYER (13 tasks)
├── 2.1  lib/api/endpoints.ts
├── 2.2  lib/api/http.ts
├── 2.3  lib/api/vehicles.ts
├── 2.4  lib/api/devices.ts
├── 2.5  lib/api/customers.ts
├── 2.6  lib/api/trips.ts
├── 2.7  lib/api/telemetry.ts
├── 2.8  lib/api/alerts.ts
├── 2.9  lib/api/geofences.ts
├── 2.10 lib/api/maintenance.ts
├── 2.11 lib/api/commands.ts
├── 2.12 lib/api/notifications.ts
└── 2.13 lib/api/auth.ts

PHASE 3: STORES (2 tasks)
├── 3.1  lib/store/auth-store.ts
└── 3.2  lib/store/ui-store.ts

PHASE 4: HOOKS (20 tasks)
├── 4.1  lib/constants/query-keys.ts
├── 4.2  lib/constants/query-cache.ts
├── 4.3  hooks/queries/use-vehicles.ts
├── 4.4  hooks/queries/use-vehicle.ts
├── 4.5  hooks/queries/use-devices.ts
├── 4.6  hooks/queries/use-customers.ts
├── 4.7  hooks/queries/use-trips.ts
├── 4.8  hooks/queries/use-telemetry.ts
├── 4.9  hooks/queries/use-alerts.ts
├── 4.10 hooks/queries/use-geofences.ts
├── 4.11 hooks/queries/use-maintenance.ts
├── 4.12 hooks/queries/use-commands.ts
├── 4.13 hooks/mutations/use-vehicle-mutations.ts
├── 4.14 hooks/mutations/use-device-mutations.ts
├── 4.15 hooks/mutations/use-customer-mutations.ts
├── 4.16 hooks/mutations/use-trip-mutations.ts
├── 4.17 hooks/mutations/use-alert-mutations.ts
├── 4.18 hooks/mutations/use-geofence-mutations.ts
├── 4.19 hooks/mutations/use-maintenance-mutations.ts
└── 4.20 hooks/mutations/use-command-mutations.ts

PHASE 5: UI COMPONENTS (25 tasks)
├── 5.1  components/ui/button.tsx (shadcn)
├── 5.2  components/ui/input.tsx (shadcn)
├── 5.3  components/ui/card.tsx (shadcn)
├── 5.4  components/ui/dialog.tsx (shadcn)
├── 5.5  components/ui/form.tsx (shadcn)
├── 5.6  components/ui/table/data-table.tsx
├── 5.7  components/ui/table/data-table-pagination.tsx
├── 5.8  components/ui/table/data-table-toolbar.tsx
├── 5.9  components/layout/app-sidebar.tsx
├── 5.10 components/layout/header.tsx
├── 5.11 components/layout/page-container.tsx
├── 5.12 components/layout/auth-guard.tsx
├── 5.13 components/providers/index.tsx
├── 5.14 config/nav-config.ts
├── 5.15 features/auth/components/login-form.tsx
├── 5.16 features/auth/schemas/login.schema.ts
├── 5.17 features/vehicles/components/vehicle-table.tsx
├── 5.18 features/vehicles/components/vehicle-table-columns.tsx
├── 5.19 features/vehicles/components/vehicle-form.tsx
├── 5.20 features/vehicles/schemas/vehicle.schema.ts
├── 5.21 features/tracking/components/tracking-map.tsx
├── 5.22 features/tracking/components/vehicle-marker.tsx
├── 5.23 features/dashboard/components/stats-cards.tsx
├── 5.24 features/dashboard/components/recent-alerts.tsx
└── 5.25 features/dashboard/components/active-vehicles.tsx

PHASE 6: PAGES (15 tasks)
├── 6.1  app/globals.css
├── 6.2  app/layout.tsx
├── 6.3  app/page.tsx
├── 6.4  app/(auth)/login/page.tsx
├── 6.5  app/(auth)/layout.tsx
├── 6.6  app/(dashboard)/layout.tsx
├── 6.7  app/(dashboard)/dashboard/page.tsx
├── 6.8  app/(dashboard)/vehicles/page.tsx
├── 6.9  app/(dashboard)/vehicles/[id]/page.tsx
├── 6.10 app/(dashboard)/vehicles/new/page.tsx
├── 6.11 app/(dashboard)/devices/page.tsx
├── 6.12 app/(dashboard)/tracking/page.tsx
├── 6.13 app/(dashboard)/trips/page.tsx
├── 6.14 app/(dashboard)/alerts/page.tsx
└── 6.15 app/(dashboard)/geofences/page.tsx

TOTAL: 90 tasks
```

---

## 🎯 PHASE 5: UI COMPONENTS

### Task 5.1 - 5.5: Install shadcn/ui Components

**Instructions**: Chạy CLI command để install shadcn components. Agent KHÔNG cần viết code thủ công.

```bash
# Chạy từng command tuần tự
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add separator
```

---

### Task 5.6: Create `components/ui/table/data-table.tsx`

**File Path**: `{SRC_DIR}/components/ui/table/data-table.tsx`

**Code Template**:
```typescript
/**
 * DataTable Component - Reusable table with TanStack Table
 */
'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from './data-table-pagination';
import { Skeleton } from '@/components/ui/skeleton';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
```

---

### Task 5.7: Create `components/ui/table/data-table-pagination.tsx`

**File Path**: `{SRC_DIR}/components/ui/table/data-table-pagination.tsx`

**Code Template**:
```typescript
/**
 * DataTable Pagination Component
 */
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-sm text-muted-foreground">
        {table.getFilteredRowModel().rows.length} row(s) total
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

### Task 5.9: Create `components/layout/app-sidebar.tsx`

**File Path**: `{SRC_DIR}/components/layout/app-sidebar.tsx`

**Code Template**:
```typescript
/**
 * App Sidebar - Main navigation sidebar
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItems } from '@/config/nav-config';
import { useUIStore } from '@/lib/store/ui-store';
import {
  LayoutDashboard,
  Car,
  Cpu,
  MapPin,
  Route,
  AlertTriangle,
  Map,
  Wrench,
  Terminal,
  Bell,
  Settings,
  Users,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  vehicles: Car,
  devices: Cpu,
  tracking: MapPin,
  trips: Route,
  alerts: AlertTriangle,
  geofences: Map,
  maintenance: Wrench,
  commands: Terminal,
  notifications: Bell,
  settings: Settings,
  customers: Users,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUIStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Car className="h-6 w-6" />
          {!sidebarCollapsed && (
            <span className="font-semibold">Vehicle Tracking</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);

          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {!sidebarCollapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

### Task 5.10: Create `components/layout/header.tsx`

**File Path**: `{SRC_DIR}/components/layout/header.tsx`

**Code Template**:
```typescript
/**
 * Header - Top navigation header
 */
'use client';

import { Menu, Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/lib/store/ui-store';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { toggleSidebarCollapse } = useUIStore();
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4">
      {/* Sidebar Toggle */}
      <Button variant="ghost" size="icon" onClick={toggleSidebarCollapse}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {/* Notifications */}
      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-sm font-medium">
            {user?.email || 'User'}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()}>
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
```

---

### Task 5.11: Create `components/layout/page-container.tsx`

**File Path**: `{SRC_DIR}/components/layout/page-container.tsx`

**Code Template**:
```typescript
/**
 * PageContainer - Wrapper for page content
 */
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('container mx-auto p-6', className)}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
```

---

### Task 5.12: Create `components/layout/auth-guard.tsx`

**File Path**: `{SRC_DIR}/components/layout/auth-guard.tsx`

**Code Template**:
```typescript
/**
 * AuthGuard - Protects routes that require authentication
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null; // or loading spinner
  }

  return <>{children}</>;
}
```

---

### Task 5.13: Create `components/providers/index.tsx`

**File Path**: `{SRC_DIR}/components/providers/index.tsx`

**Code Template**:
```typescript
/**
 * Providers - Combines all app providers
 */
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useState } from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
        <Toaster position="top-right" richColors />
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

### Task 5.14: Create `config/nav-config.ts`

**File Path**: `{SRC_DIR}/config/nav-config.ts`

**Code Template**:
```typescript
/**
 * Navigation Configuration
 */
export interface NavItem {
  title: string;
  url: string;
  icon: string;
  isActive?: boolean;
}

export const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: 'dashboard' },
  { title: 'Vehicles', url: '/dashboard/vehicles', icon: 'vehicles' },
  { title: 'Devices', url: '/dashboard/devices', icon: 'devices' },
  { title: 'Tracking', url: '/dashboard/tracking', icon: 'tracking' },
  { title: 'Trips', url: '/dashboard/trips', icon: 'trips' },
  { title: 'Alerts', url: '/dashboard/alerts', icon: 'alerts' },
  { title: 'Geofences', url: '/dashboard/geofences', icon: 'geofences' },
  { title: 'Customers', url: '/dashboard/customers', icon: 'customers' },
  { title: 'Maintenance', url: '/dashboard/maintenance', icon: 'maintenance' },
  { title: 'Commands', url: '/dashboard/commands', icon: 'commands' },
  { title: 'Notifications', url: '/dashboard/notifications', icon: 'notifications' },
  { title: 'Settings', url: '/dashboard/settings', icon: 'settings' },
];
```

---

### Task 5.15: Create `features/auth/components/login-form.tsx`

**File Path**: `{SRC_DIR}/features/auth/components/login-form.tsx`

**Code Template**:
```typescript
/**
 * Login Form Component
 */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { loginSchema, type LoginFormData } from '../schemas/login.schema';
import { authServices } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/auth-store';
import { toast } from 'sonner';
import { useState } from 'react';

export function LoginForm() {
  const router = useRouter();
  const { setUser, setSession } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authServices.login(data);
      setUser(response.user);
      setSession(response.session.token, response.session.refreshToken, response.session.expiresAt);
      toast.success('Login successful');
      router.push('/dashboard');
    } catch (error) {
      toast.error('Login failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Enter your credentials to access the dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username or Email</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="username or admin@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

---

### Task 5.16: Create `features/auth/schemas/login.schema.ts`

**File Path**: `{SRC_DIR}/features/auth/schemas/login.schema.ts`

**Code Template**:
```typescript
/**
 * Login Form Schema
 */
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'), // Backend accepts username OR email
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

---

### Task 5.17: Create `features/vehicles/components/vehicle-table.tsx`

**File Path**: `{SRC_DIR}/features/vehicles/components/vehicle-table.tsx`

**Code Template**:
```typescript
/**
 * Vehicle Table Component
 */
'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useVehicles } from '@/hooks/queries/use-vehicles';
import { vehicleColumns } from './vehicle-table-columns';

export function VehicleTable() {
  const router = useRouter();
  const { data, isLoading } = useVehicles();

  const handleRowClick = (vehicle: { id: number }) => {
    router.push(`/dashboard/vehicles/${vehicle.id}`);
  };

  return (
    <DataTable
      columns={vehicleColumns}
      data={data?.data || []}
      isLoading={isLoading}
      onRowClick={handleRowClick}
    />
  );
}
```

---

### Task 5.18: Create `features/vehicles/components/vehicle-table-columns.tsx`

**File Path**: `{SRC_DIR}/features/vehicles/components/vehicle-table-columns.tsx`

**Code Template**:
```typescript
/**
 * Vehicle Table Columns Definition
 */
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Vehicle, VehicleStatus } from '@/types';

const statusColors: Record<VehicleStatus, string> = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  maintenance: 'bg-yellow-500',
  offline: 'bg-red-500',
};

export const vehicleColumns: ColumnDef<Vehicle>[] = [
  {
    accessorKey: 'vehicleId',
    header: 'Vehicle ID',
  },
  {
    accessorKey: 'plateNumber',
    header: 'Plate Number',
  },
  {
    accessorKey: 'brand',
    header: 'Brand',
  },
  {
    accessorKey: 'model',
    header: 'Model',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as VehicleStatus;
      return (
        <Badge className={statusColors[status]}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'));
      return date.toLocaleDateString();
    },
  },
];
```

---

### Task 5.19 - 5.25: Remaining Feature Components

**Pattern**: Follow templates above cho các components:

| Task | File Path | Template Pattern |
|------|-----------|------------------|
| 5.19 | `features/vehicles/components/vehicle-form.tsx` | Same as login-form.tsx |
| 5.20 | `features/vehicles/schemas/vehicle.schema.ts` | Same as login.schema.ts |
| 5.21 | `features/tracking/components/tracking-map.tsx` | Leaflet MapContainer |
| 5.22 | `features/tracking/components/vehicle-marker.tsx` | Leaflet Marker |
| 5.23 | `features/dashboard/components/stats-cards.tsx` | Card grid |
| 5.24 | `features/dashboard/components/recent-alerts.tsx` | List component |
| 5.25 | `features/dashboard/components/active-vehicles.tsx` | Mini map widget |

---

## 🎯 PHASE 6: PAGES

### Task 6.1: Create `app/globals.css`

**File Path**: `{SRC_DIR}/app/globals.css`

**Code Template**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

### Task 6.2: Create `app/layout.tsx`

**File Path**: `{SRC_DIR}/app/layout.tsx`

**Code Template**:
```typescript
/**
 * Root Layout
 */
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IoT Vehicle Tracking System',
  description: 'Real-time vehicle tracking and fleet management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

### Task 6.3: Create `app/page.tsx`

**File Path**: `{SRC_DIR}/app/page.tsx`

**Code Template**:
```typescript
/**
 * Root Page - Redirect to dashboard or login
 */
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

---

### Task 6.4: Create `app/(auth)/login/page.tsx`

**File Path**: `{SRC_DIR}/app/(auth)/login/page.tsx`

**Code Template**:
```typescript
/**
 * Login Page
 */
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm />
    </div>
  );
}
```

---

### Task 6.5: Create `app/(auth)/layout.tsx`

**File Path**: `{SRC_DIR}/app/(auth)/layout.tsx`

**Code Template**:
```typescript
/**
 * Auth Layout - No sidebar
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

---

### Task 6.6: Create `app/(dashboard)/layout.tsx`

**File Path**: `{SRC_DIR}/app/(dashboard)/layout.tsx`

**Code Template**:
```typescript
/**
 * Dashboard Layout - With sidebar and header
 */
import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { AuthGuard } from '@/components/layout/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 pl-64">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
```

---

### Task 6.7: Create `app/(dashboard)/dashboard/page.tsx`

**File Path**: `{SRC_DIR}/app/(dashboard)/dashboard/page.tsx`

**Code Template**:
```typescript
/**
 * Dashboard Overview Page
 */
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { StatsCards } from '@/features/dashboard/components/stats-cards';
import { RecentAlerts } from '@/features/dashboard/components/recent-alerts';
import { ActiveVehicles } from '@/features/dashboard/components/active-vehicles';

export default function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader title="Dashboard" description="Overview of your fleet" />
      <div className="space-y-6">
        <StatsCards />
        <div className="grid gap-6 md:grid-cols-2">
          <RecentAlerts />
          <ActiveVehicles />
        </div>
      </div>
    </PageContainer>
  );
}
```

---

### Task 6.8: Create `app/(dashboard)/vehicles/page.tsx`

**File Path**: `{SRC_DIR}/app/(dashboard)/vehicles/page.tsx`

**Code Template**:
```typescript
/**
 * Vehicles List Page
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { VehicleTable } from '@/features/vehicles/components/vehicle-table';
import { Plus } from 'lucide-react';

export default function VehiclesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Vehicles"
        description="Manage your vehicle fleet"
        action={
          <Link href="/dashboard/vehicles/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </Link>
        }
      />
      <VehicleTable />
    </PageContainer>
  );
}
```

---

### Task 6.9 - 6.15: Remaining Pages

**Pattern**: Follow Task 6.8 pattern cho các pages:

| Task | File Path | Feature Component |
|------|-----------|-------------------|
| 6.9 | `app/(dashboard)/vehicles/[id]/page.tsx` | VehicleDetails |
| 6.10 | `app/(dashboard)/vehicles/new/page.tsx` | VehicleForm |
| 6.11 | `app/(dashboard)/devices/page.tsx` | DeviceTable |
| 6.12 | `app/(dashboard)/tracking/page.tsx` | TrackingMap |
| 6.13 | `app/(dashboard)/trips/page.tsx` | TripTable |
| 6.14 | `app/(dashboard)/alerts/page.tsx` | AlertTable |
| 6.15 | `app/(dashboard)/geofences/page.tsx` | GeofenceMap |

---

## 🔄 AGENT WORKFLOW

```
FOR each task in [1.1 → 6.15]:
  1. READ task index, file path, and code template
  2. CHECK dependencies are completed
  3. CREATE file at specified path
  4. WRITE code from template
  5. VERIFY imports resolve correctly
  6. MARK task as completed
  7. MOVE to next task
END
```

---

*Document Version: 3.0*
*Last Updated: 2026-01-01*
*Total Tasks: 90*
