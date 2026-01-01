# 🔍 Review & Corrections - Frontend Implementation Guide

> **Mục đích**: File này liệt kê tất cả các lỗi và sửa đổi cần thiết để frontend plan khớp với backend thực tế.

**Date**: 2026-01-01  
**Status**: ✅ Backend reviewed, Frontend plan needs corrections

---

## 📋 Tổng Quan Các Lỗi

| Category           | Số Lỗi | Mức Độ      |
| ------------------ | ------ | ----------- |
| Type Definitions   | 8      | 🔴 Critical |
| API Endpoints      | 4      | 🟡 Medium   |
| Response Structure | 2      | 🔴 Critical |
| Auth Flow          | 3      | 🔴 Critical |
| **TOTAL**          | **17** |             |

---

## 🔴 CRITICAL FIXES

### 1. Task 1.2: Auth Types - UserRole SAI

**File**: `types/auth.ts`

**❌ SAI:**

```typescript
export type UserRole = "admin" | "user";
```

**✅ ĐÚNG:**

```typescript
export type UserRole = "admin" | "manager" | "staff" | "user";
```

**Lý do**: Backend User entity có 4 roles: `'admin' | 'manager' | 'staff' | 'user'`

---

### 2. Task 1.2: Auth Types - LoginResponse Structure SAI

**File**: `types/auth.ts`

**❌ SAI:**

```typescript
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}
```

**✅ ĐÚNG:**

```typescript
export interface SessionResponse {
  token: string; // Backend dùng "token" không phải "accessToken"
  refreshToken: string;
  expiresAt: string; // Backend trả về "expiresAt" (ISO string) không phải "expiresIn" (number)
}

export interface LoginResponse {
  user: User;
  session: SessionResponse; // Backend dùng "session" không phải "tokens"
}
```

**Lý do**: Backend `LoginResponseDto` có structure: `{ user, session: { token, refreshToken, expiresAt } }`

---

### 3. Task 1.2: Auth Types - User Entity Thiếu Fields

**File**: `types/auth.ts`

**❌ THIẾU:**

```typescript
export interface User extends BaseEntity {
  email: string;
  username: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  isActive: boolean; // ❌ SAI - backend dùng "status" không phải "isActive"
  lastLoginAt?: string; // ❌ SAI - backend dùng "lastLogin" không phải "lastLoginAt"
}
```

**✅ ĐÚNG:**

```typescript
export type UserStatus = "active" | "inactive" | "suspended";

export interface User extends BaseEntity {
  email: string;
  username: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  status: UserStatus; // ✅ Đúng - backend có field "status"
  lastLogin?: string; // ✅ Đúng - backend có field "lastLogin"
}
```

**Lý do**: Backend User entity có `status: UserStatus` và `lastLogin: Date | null`

---

### 4. Task 1.2: Auth Types - LoginDto SAI

**File**: `types/auth.ts`

**❌ SAI:**

```typescript
export interface LoginDto {
  email: string; // ❌ Backend nhận "username" (có thể là email hoặc username)
  password: string;
}
```

**✅ ĐÚNG:**

```typescript
export interface LoginDto {
  username: string; // ✅ Backend LoginDto có field "username" (accept email hoặc username)
  password: string; // ✅ Frontend đã hash SHA-256 trước khi gửi
}
```

**Lý do**: Backend `LoginDto` có field `username: string` và comment nói "Username or email"

---

### 5. Task 1.4: Device Types - Thiếu/Sai Fields

**File**: `types/device.ts`

**❌ SAI:**

```typescript
export type DeviceStatus = "online" | "offline" | "error" | "maintenance";

export interface Device extends BaseEntity {
  deviceId: string;
  serialNumber: string; // ❌ KHÔNG TỒN TẠI trong backend
  firmwareVersion?: string;
  status: DeviceStatus;
  vehicleId?: number;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
}
```

**✅ ĐÚNG:**

```typescript
export type DeviceStatus = "active" | "inactive" | "offline" | "error"; // ✅ Đúng enum từ backend

export interface Device extends BaseEntity {
  deviceId: string;
  vehicleId?: number;
  deviceType?: string; // ✅ Có trong backend (default: 'tracker')
  firmwareVersion?: string;
  hardwareVersion?: string; // ✅ Có trong backend
  imei?: string; // ✅ Có trong backend (unique)
  simCardNumber?: string; // ✅ Có trong backend
  status: DeviceStatus;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
  // ❌ KHÔNG có serialNumber
}
```

**Lý do**:

- Backend Device entity có: `deviceType`, `imei`, `simCardNumber`, `hardwareVersion`
- Backend KHÔNG có `serialNumber`
- Backend status enum: `'active' | 'inactive' | 'offline' | 'error'` (không có 'online', 'maintenance')

---

### 6. Task 1.4: Device Types - CreateDeviceDto SAI

**File**: `types/device.ts`

**❌ SAI:**

```typescript
export interface CreateDeviceDto {
  deviceId: string;
  serialNumber: string; // ❌ KHÔNG TỒN TẠI
  firmwareVersion?: string;
}
```

**✅ ĐÚNG:**

```typescript
export interface CreateDeviceDto {
  deviceId: string;
  vehicleId?: number;
  deviceType?: string; // ✅ Optional, default: 'tracker'
  firmwareVersion?: string;
  hardwareVersion?: string; // ✅ Cần thêm
  imei?: string; // ✅ Cần thêm
  simCardNumber?: string; // ✅ Cần thêm
  status?: DeviceStatus; // ✅ Optional, default: 'active'
}
```

**Lý do**: Backend `CreateDeviceDto` có các fields này

---

### 7. Task 1.5: Customer Types - Sai Field Name

**File**: `types/customer.ts`

**❌ SAI:**

```typescript
export interface Customer extends BaseEntity {
  name: string; // ❌ Backend dùng "fullName" không phải "name"
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean; // ❌ Backend dùng "status" không phải "isActive"
  vehicleCount?: number; // ❌ KHÔNG TỒN TẠI
}
```

**✅ ĐÚNG:**

```typescript
export type CustomerStatus = "active" | "suspended" | "blacklisted";
export type VerificationStatus = "pending" | "verified" | "rejected";

export interface Customer extends BaseEntity {
  userId?: number;
  fullName: string; // ✅ Đúng - backend có field "fullName"
  email?: string;
  phone: string; // ✅ Required trong backend
  dateOfBirth?: string;
  idCardNumber?: string; // ✅ Cần thêm
  idCardIssueDate?: string; // ✅ Cần thêm
  idCardIssuePlace?: string; // ✅ Cần thêm
  address?: string;
  licenseNumber?: string; // ✅ Cần thêm
  licenseType?: string; // ✅ Cần thêm
  licenseIssueDate?: string; // ✅ Cần thêm
  licenseExpiryDate?: string; // ✅ Cần thêm
  licenseIssuePlace?: string; // ✅ Cần thêm
  status: CustomerStatus; // ✅ Đúng - backend có field "status"
  verificationStatus: VerificationStatus; // ✅ Cần thêm
  verifiedBy?: number; // ✅ Cần thêm
  verifiedAt?: string; // ✅ Cần thêm
  totalRentals?: number; // ✅ Cần thêm (default: 0)
  totalSpent?: number; // ✅ Cần thêm (default: 0)
  ratingAverage?: number; // ✅ Cần thêm (default: 0)
}
```

**Lý do**: Backend Customer entity có rất nhiều fields mà plan thiếu

---

### 8. Task 1.5: Customer Types - CreateCustomerDto SAI

**File**: `types/customer.ts`

**❌ SAI:**

```typescript
export interface CreateCustomerDto {
  name: string; // ❌ SAI
  email?: string;
  phone?: string;
  address?: string;
}
```

**✅ ĐÚNG:**

```typescript
export interface CreateCustomerDto {
  fullName: string; // ✅ Đúng
  email?: string;
  phone: string; // ✅ Required
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
  status?: CustomerStatus; // Optional, default: 'active'
  userId?: number;
}
```

---

### 9. Task 1.1: Common Types - API Response Structure

**File**: `types/common.ts`

**❌ THIẾU:**

```typescript
export interface ApiResponse<T> {
  data: T;
  message?: string; // ❌ Backend không có "message" trong response
}
```

**✅ ĐÚNG:**

```typescript
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string; // ✅ Backend TransformInterceptor luôn thêm timestamp
    [key: string]: any; // ✅ Có thể có thêm fields khác
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    timestamp: string; // ✅ Cần thêm
  };
}
```

**Lý do**: Backend `TransformInterceptor` luôn wrap response trong `{ data, meta: { timestamp } }`

---

## 🟡 MEDIUM FIXES

### 10. Task 2.1: API Endpoints - Commands SAI

**File**: `lib/api/endpoints.ts`

**❌ SAI:**

```typescript
COMMANDS: {
  LIST: '/commands',
  SEND: '/commands',  // ❌ SAI
  STATUS: (id: number | string) => `/commands/${id}/status`,
},
```

**✅ ĐÚNG:**

```typescript
COMMANDS: {
  LIST: '/commands',
  DETAILS: (id: number | string) => `/commands/${id}`,
  SEND: (deviceId: string) => `/commands/${deviceId}`,  // ✅ Backend route: POST /commands/:deviceId
},
```

**Lý do**: Backend `CommandsController` có route `@Post(':deviceId')` không phải `@Post()`

---

### 11. Task 2.1: API Endpoints - Notifications SAI

**File**: `lib/api/endpoints.ts`

**❌ SAI:**

```typescript
NOTIFICATIONS: {
  LIST: '/notifications',
  MARK_READ: '/notifications/read',  // ❌ KHÔNG TỒN TẠI
  MARK_ALL_READ: '/notifications/read-all',  // ❌ KHÔNG TỒN TẠI
},
```

**✅ ĐÚNG:**

```typescript
NOTIFICATIONS: {
  LIST: '/notifications',
  DETAILS: (id: number | string) => `/notifications/${id}`,
  MARK_DELIVERED: (id: number | string) => `/notifications/${id}/delivered`,  // ✅ Backend có PATCH /:id/delivered
  RETRY: (id: number | string) => `/notifications/${id}/retry`,  // ✅ Backend có POST /:id/retry
},
```

**Lý do**: Backend `NotificationsController` không có `/read` và `/read-all`, chỉ có `/delivered` và `/retry`

---

### 12. Task 2.1: API Endpoints - Dashboard KHÔNG TỒN TẠI

**File**: `lib/api/endpoints.ts`

**❌ SAI:**

```typescript
DASHBOARD: {
  STATS: '/dashboard/stats',  // ❌ KHÔNG TỒN TẠI
  RECENT_ALERTS: '/dashboard/recent-alerts',  // ❌ KHÔNG TỒN TẠI
  ACTIVE_VEHICLES: '/dashboard/active-vehicles',  // ❌ KHÔNG TỒN TẠI
},
```

**✅ ĐÚNG:**

```typescript
// ❌ XÓA toàn bộ DASHBOARD endpoints - chưa implement trong backend
// Frontend sẽ tự aggregate data từ các endpoints khác:
// - Stats: aggregate từ vehicles, trips, alerts
// - Recent alerts: GET /alerts?limit=10
// - Active vehicles: GET /vehicles?status=active
```

**Lý do**: Backend chưa có dashboard endpoints, cần aggregate từ các endpoints khác

---

### 13. Task 2.2: HTTP Client - Response Parsing

**File**: `lib/api/http.ts`

**⚠️ CẦN KIỂM TRA:**

Backend luôn trả về `{ data, meta }` wrapper. Cần quyết định:

- Option 1: Unwrap `data` trong http client
- Option 2: Giữ nguyên structure, unwrap ở hooks

**✅ RECOMMENDED (Option 1 - Unwrap trong http client):**

```typescript
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // ... fetch code ...

  const json = await response.json();

  // Backend luôn trả về { data, meta }
  // Unwrap để hooks nhận được data trực tiếp
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}
```

**Lý do**: Giúp hooks đơn giản hơn, không cần `.data.data`

---

### 14. Task 2.13: Auth API Service - LoginDto SAI

**File**: `lib/api/auth.ts`

**❌ SAI:**

```typescript
export const authServices = {
  login: async (data: LoginDto): Promise<LoginResponse> => {
    return http.post<LoginResponse>(API.AUTH.LOGIN, data);
  },
  // ...
};
```

**✅ ĐÚNG:**

```typescript
export interface LoginDto {
  username: string; // ✅ Đúng - không phải "email"
  password: string; // ✅ Frontend đã hash SHA-256
}

export const authServices = {
  login: async (data: LoginDto): Promise<LoginResponse> => {
    return http.post<LoginResponse>(API.AUTH.LOGIN, data);
  },
  // ...
};
```

---

### 15. Task 3.1: Auth Store - State Structure SAI

**File**: `lib/store/auth-store.ts`

**❌ SAI:**

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null; // ❌ SAI
  refreshToken: string | null;
  isAuthenticated: boolean;
}
```

**✅ ĐÚNG:**

```typescript
interface AuthState {
  user: User | null;
  token: string | null; // ✅ Đúng - backend trả về "token" không phải "accessToken"
  refreshToken: string | null;
  expiresAt: string | null; // ✅ Cần thêm để check expiration
  isAuthenticated: boolean;
}

interface AuthActions {
  setUser: (user: User) => void;
  setSession: (token: string, refreshToken: string, expiresAt: string) => void; // ✅ Đúng
  logout: () => void;
  hydrate: () => void;
  isTokenExpired: () => boolean; // ✅ Helper để check expiration
}
```

**Lý do**:

- Backend trả về `session.token` không phải `accessToken`
- Cần `expiresAt` để check token expiration

---

### 16. Task 4.1: Query Keys - Dashboard Keys KHÔNG CẦN

**File**: `lib/constants/query-keys.ts`

**❌ SAI:**

```typescript
export const QUERY_KEYS = {
  // ...
  DASHBOARD_STATS: ["dashboard", "stats"] as const,
  DASHBOARD_RECENT_ALERTS: ["dashboard", "recent-alerts"] as const,
  DASHBOARD_ACTIVE_VEHICLES: ["dashboard", "active-vehicles"] as const,
} as const;
```

**✅ ĐÚNG:**

```typescript
export const QUERY_KEYS = {
  // ...
  // ❌ XÓA dashboard keys - backend chưa có endpoints
  // Frontend sẽ dùng:
  // - QUERY_KEYS.ALERTS với limit=10 cho recent alerts
  // - QUERY_KEYS.VEHICLES với status='active' cho active vehicles
} as const;
```

---

### 17. Task 5.15: Login Form - Field Name SAI

**File**: `features/auth/components/login-form.tsx`

**❌ SAI:**

```typescript
<FormField
  control={form.control}
  name="email"  // ❌ SAI
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input type="email" placeholder="admin@example.com" {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

**✅ ĐÚNG:**

```typescript
<FormField
  control={form.control}
  name="username"  // ✅ Đúng
  render={({ field }) => (
    <FormItem>
      <FormLabel>Username or Email</FormLabel>  // ✅ Update label
      <FormControl>
        <Input type="text" placeholder="username or email" {...field} />
      </FormControl>
    </FormItem>
  )}
/>
```

**Lý do**: Backend nhận `username` field (có thể là email hoặc username)

---

### 18. Task 5.16: Login Schema - Field Name SAI

**File**: `features/auth/schemas/login.schema.ts`

**❌ SAI:**

```typescript
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"), // ❌ SAI
  password: z.string().min(6, "Password must be at least 6 characters"),
});
```

**✅ ĐÚNG:**

```typescript
export const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required"), // ✅ Đúng
  password: z.string().min(1, "Password is required"), // ✅ Backend chỉ check not empty
});
```

**Lý do**:

- Backend nhận `username` field
- Backend không validate email format (vì có thể là username)
- Backend chỉ check password not empty (vì đã hash SHA-256)

---

## 📝 Summary Checklist

### Type Definitions (Phase 1)

- [ ] ✅ Fix UserRole: thêm `'manager' | 'staff'`
- [ ] ✅ Fix LoginResponse: dùng `session.token` thay vì `tokens.accessToken`
- [ ] ✅ Fix User entity: thêm `status: UserStatus`, sửa `lastLogin`
- [ ] ✅ Fix LoginDto: dùng `username` thay vì `email`
- [ ] ✅ Fix Device: xóa `serialNumber`, thêm `deviceType`, `imei`, `simCardNumber`, `hardwareVersion`
- [ ] ✅ Fix DeviceStatus: dùng `'active' | 'inactive' | 'offline' | 'error'`
- [ ] ✅ Fix Customer: dùng `fullName` thay vì `name`, thêm tất cả missing fields
- [ ] ✅ Fix ApiResponse: thêm `meta.timestamp`

### API Layer (Phase 2)

- [ ] ✅ Fix Commands endpoint: `/commands/:deviceId`
- [ ] ✅ Fix Notifications endpoints: xóa `/read`, `/read-all`, thêm `/delivered`, `/retry`
- [ ] ✅ Fix Dashboard endpoints: XÓA (chưa có trong backend)
- [ ] ✅ Fix HTTP client: handle `{ data, meta }` wrapper
- [ ] ✅ Fix Auth service: dùng `username` field

### Stores (Phase 3)

- [ ] ✅ Fix Auth store: dùng `token` thay vì `accessToken`, thêm `expiresAt`

### Hooks (Phase 4)

- [ ] ✅ Fix Query keys: xóa dashboard keys

### UI Components (Phase 5)

- [ ] ✅ Fix Login form: dùng `username` field
- [ ] ✅ Fix Login schema: validate `username` không phải `email`

---

## 🎯 Action Items

1. **Update AGENT_IMPLEMENTATION_GUIDE.md** với tất cả corrections trên
2. **Test API integration** sau khi fix để đảm bảo match với backend
3. **Update examples** trong guide để reflect correct structure

---

**Last Updated**: 2026-01-01  
**Reviewed By**: AI Agent  
**Status**: ✅ Ready for implementation after corrections
