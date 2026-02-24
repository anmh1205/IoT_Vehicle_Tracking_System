# Frontend Features Specification

> Complete feature specifications for every module of the IoT Vehicle Tracking System frontend.
> Each section defines UI components, API hooks, Zod schemas, states, and business logic.
> Agents MUST implement every feature described here. NO placeholders, NO "Coming Soon", NO "TODO".

---

## Feature Modules Overview

| #   | Feature       | Route                   | Priority | Real-time                        |
| --- | ------------- | ----------------------- | -------- | -------------------------------- |
| 1   | auth          | `/login`                | P0       | No                               |
| 2   | dashboard     | `/dashboard`            | P0       | Yes (`/dashboard` namespace)     |
| 3   | vehicles      | `/vehicles`             | P0       | No                               |
| 4   | devices       | `/devices`              | P0       | Yes (`/devices` namespace)       |
| 5   | customers     | `/customers`            | P1       | No                               |
| 6   | trips         | `/trips`, `/trips/[id]` | P1       | No                               |
| 7   | alerts        | `/alerts`               | P1       | Yes (`/dashboard` namespace)     |
| 8   | geofences     | `/geofences`            | P2       | No                               |
| 9   | maintenance   | `/maintenance`          | P2       | No                               |
| 10  | map           | `/map`                  | P0       | Yes (`/devices` namespace)       |
| 11  | firmware      | `/firmware`             | P2       | Yes (`/firmware` namespace)      |
| 12  | exports       | `/exports`              | P2       | Yes (`/exports` namespace)       |
| 13  | notifications | `/notifications`        | P1       | Yes (`/notifications` namespace) |
| 14  | settings      | `/settings`             | P1       | No                               |
| 15  | users         | `/admin/users`          | P1       | No                               |
| 16  | admin         | `/admin/system`         | P2       | No                               |
| 17  | system-status | `/system-status`        | P2       | Yes (polling 15s)                |
| 18  | simulator     | `/simulator`            | P2       | Yes (Socket.IO)                  |
| 19  | statistics    | `/statistics`           | P1       | No                               |

---

## 1. Auth Module (`features/auth`)

**User Story:** As a user, I want to log in with my credentials so that I can access the system securely.

### UI Components

**LoginForm** (`features/auth/components/login-form.tsx`)
- Fields: `username` (Input), `password` (Input type=password), `rememberMe` (Checkbox)
- Submit button with loading spinner when `isPending`
- Error alert banner below form for invalid credentials
- Password visibility toggle (eye icon)
- Keyboard: Enter key submits form

**LogoutButton** (`features/auth/components/logout-button.tsx`)
- Triggers `POST /auth/logout`, clears Zustand store (token + user), deletes `auth-token` cookie, redirects to `/login`

### Zod Schema (`lib/validations/auth.schema.ts`)

```typescript
export const loginSchema = z.object({
  username: z.string().min(1, 'Tên đăng nhập không được để trống'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
  rememberMe: z.boolean().optional().default(false),
});
```

### API Endpoints

| Method | Path           | Request                  | Response                     |
| ------ | -------------- | ------------------------ | ---------------------------- |
| POST   | `/auth/login`  | `{ username, password }` | `{ user, token, expiresAt }` |
| POST   | `/auth/logout` | -                        | `{ success: true }`          |
| GET    | `/auth/me`     | -                        | `{ user }`                   |

### Hooks

- `useLogin()` -- `useMutation` calling `POST /auth/login`. On success: store token in Zustand (memory only), set `auth-token` cookie for middleware, redirect to `/dashboard`.
- `useLogout()` -- `useMutation` calling `POST /auth/logout`. On success: clear Zustand store, delete cookie, redirect to `/login`.
- `useCurrentUser()` -- `useQuery(['auth', 'me'])` calling `GET /auth/me`. Used by `AuthProvider` on mount to restore session.

### Session Management

- `AuthProvider` calls `GET /auth/me` on mount. If 401, redirect to `/login`.
- Axios response interceptor: on 401, call `logout()` and redirect.
- Token stored in Zustand memory only. Cookie is for Next.js middleware route protection only.

### States

- **Loading:** Spinner on submit button, form inputs disabled
- **Error:** Red alert banner: "Tên đăng nhập hoặc mật khẩu không đúng"

---

## 2. Dashboard Module (`features/dashboard`)

**User Story:** As a fleet manager, I want an overview of fleet health, alerts, and activity so I can make decisions quickly.

### UI Components

**StatCards** (`features/dashboard/components/stat-cards.tsx`)
- 4 cards in responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
- Each card: icon, title, value, trend indicator (percentage + arrow up/down + color)
- Cards: Total Vehicles, Active Devices, Active Alerts (critical count), Trips Today

**VehicleActivityChart** (`features/dashboard/components/vehicle-activity-chart.tsx`)
- recharts AreaChart showing vehicle activity over last 7 days
- X-axis: dates, Y-axis: active vehicle count
- Tooltip with date and count

**DeviceStatusChart** (`features/dashboard/components/device-status-chart.tsx`)
- recharts PieChart/DonutChart showing device distribution: running (green), stopped (gray), error (red), offline (yellow)
- Legend below chart with counts

**AlertsSeverityChart** (`features/dashboard/components/alerts-severity-chart.tsx`)
- recharts BarChart showing alert count by severity over last 7 days
- Stacked bars: critical (red), high (orange), medium (yellow), low (blue)

**ActivityFeed** (`features/dashboard/components/activity-feed.tsx`)
- Scrollable list of recent events (max 20)
- Each item: icon (by event type), description text, relative timestamp (date-fns `formatDistanceToNow`)
- Event types: device online/offline, alert triggered, trip started/ended
- Real-time: new events prepended via Socket

**QuickActions** (`features/dashboard/components/quick-actions.tsx`)
- Row of action buttons: "Xem bản đồ" (link to `/map`), "Thêm phương tiện" (link to `/vehicles`), "Xem cảnh báo" (link to `/alerts`)

### API Endpoints

| Method | Path                          | Request     | Response                                                             |
| ------ | ----------------------------- | ----------- | -------------------------------------------------------------------- |
| GET    | `/dashboard/stats`            | -           | `{ totalVehicles, activeDevices, activeAlerts, tripsToday, trends }` |
| GET    | `/dashboard/vehicle-activity` | `?days=7`   | `{ data: [{ date, count }] }`                                        |
| GET    | `/dashboard/device-status`    | -           | `{ running, stopped, error, offline }`                               |
| GET    | `/dashboard/alerts-summary`   | `?days=7`   | `{ data: [{ date, critical, high, medium, low }] }`                  |
| GET    | `/dashboard/activity-feed`    | `?limit=20` | `{ data: [{ id, type, message, timestamp }] }`                       |

### Hooks

- `useDashboardStats()` -- `useQuery(['dashboard', 'stats'])`, refetchInterval: 60000 (1 min)
- `useVehicleActivity(days)` -- `useQuery(['dashboard', 'vehicle-activity', days])`
- `useDeviceStatusDistribution()` -- `useQuery(['dashboard', 'device-status'])`
- `useAlertsSummary(days)` -- `useQuery(['dashboard', 'alerts-summary', days])`
- `useActivityFeed()` -- `useQuery(['dashboard', 'activity-feed'])`
- `useDashboardRealtime()` -- Socket listener on `/dashboard` namespace for `stats:update` and `alert:new`. On `stats:update`: `setQueryData(['dashboard', 'stats'])`. On `alert:new`: prepend to activity feed + show toast.

### States

- **Loading:** 4 Skeleton cards + ChartSkeleton components
- **Error:** Error alert banner with retry button
- **Empty (activity feed):** Clock icon + "Chưa có hoạt động nào"

---

## 3. Vehicle Management (`features/vehicles`)

**User Story:** As a fleet manager, I want to manage vehicles, assign devices, and track fleet composition.

### UI Components

**VehicleColumns** (`features/vehicles/components/vehicle-columns.tsx`)
- Columns: `vehicleId`, `plateNumber`, `brand` + `model` (combined), `vehicleType` (Badge), `deviceId` (link or "Chưa gắn"), `customerName`, `status` (Badge: active=green, inactive=gray, maintenance=orange), Actions dropdown

**VehicleForm** (`features/vehicles/components/vehicle-form.tsx`)
- Dialog with react-hook-form + zod
- Fields: `vehicleId` (Input), `plateNumber` (Input), `brand` (Input), `model` (Input), `vehicleType` (Select: car/truck/motorcycle/bus/van), `year` (Input number), `color` (Input), `fuelType` (Select: gasoline/diesel/electric/hybrid), `customerId` (Combobox from customer list), `deviceId` (Combobox from available devices), `notes` (Textarea)
- Edit mode: pre-fill all fields, `vehicleId` disabled

**VehicleDetailModal** (`features/vehicles/components/vehicle-detail-modal.tsx`)
- Sheet (side panel) with vehicle info sections:
  - Vehicle Info: plate, brand, model, type, year, color, fuel
  - Assigned Device: device name, status, last seen (or "Chưa gắn thiết bị")
  - Customer Info: name, contact (or "Chưa gán khách hàng")
  - Trip Summary: total trips, total distance, last trip date
  - Maintenance Summary: last service, next service due

**VehicleAssignDevice** (`features/vehicles/components/vehicle-assign-device.tsx`)
- Combobox searching available devices (status=stopped, no vehicle assigned)
- If vehicle already has a device, show warning: "Thiết bị hiện tại sẽ được gỡ bỏ"

### Zod Schema (`lib/validations/vehicle.schema.ts`)

```typescript
export const vehicleSchema = z.object({
  vehicleId: z.string().min(1, 'Mã phương tiện không được để trống').max(50),
  plateNumber: z.string().min(1, 'Biển số không được để trống').max(20),
  brand: z.string().min(1, 'Hãng xe không được để trống').max(50),
  model: z.string().min(1, 'Dòng xe không được để trống').max(50),
  vehicleType: z.enum(['car', 'truck', 'motorcycle', 'bus', 'van'], {
    required_error: 'Vui lòng chọn loại phương tiện',
  }),
  year: z.coerce.number().min(1990, 'Năm sản xuất không hợp lệ').max(new Date().getFullYear() + 1).optional(),
  color: z.string().max(30).optional(),
  fuelType: z.enum(['gasoline', 'diesel', 'electric', 'hybrid']).optional(),
  customerId: z.coerce.number().positive().optional().nullable(),
  deviceId: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional(),
});
```

### API Endpoints

| Method | Path            | Request                     | Response                          |
| ------ | --------------- | --------------------------- | --------------------------------- |
| GET    | `/vehicles`     | `?search&status&page&limit` | `{ vehicles: [...], pagination }` |
| GET    | `/vehicles/:id` | -                           | `{ vehicle }`                     |
| POST   | `/vehicles`     | `VehicleFormValues`         | `{ vehicle }`                     |
| PUT    | `/vehicles/:id` | `VehicleFormValues`         | `{ vehicle }`                     |
| DELETE | `/vehicles/:id` | -                           | `{ success }`                     |

### Hooks

- `useVehicles(filters)` -- `useQuery(['vehicles', filters])` with pagination
- `useVehicleDetail(id)` -- `useQuery(['vehicles', id], { enabled: !!id })`
- `useCreateVehicle()` -- `useMutation`, invalidates `['vehicles']` on success, toast "Thêm phương tiện thành công"
- `useUpdateVehicle()` -- `useMutation`, invalidates `['vehicles']` + `['vehicles', id]`, toast "Cập nhật thành công"
- `useDeleteVehicle()` -- `useMutation`, invalidates `['vehicles']`, toast "Xóa phương tiện thành công"

### States

- **Loading:** DataTable skeleton (5 rows)
- **Empty:** Car icon + "Chưa có phương tiện nào" + Button "Thêm phương tiện"
- **Error:** Alert banner with retry
- **Delete confirmation:** ConfirmDialog "Bạn có chắc chắn muốn xóa phương tiện [plateNumber]?"

---

## 4. Device Management (`features/devices`)

**User Story:** As a technician, I want to manage IoT devices, view comprehensive device details with real-time data, runtime charts, vibration analysis, session history, and configure device settings — all from a production-quality modal matching IVM26 standard.

### UI Components — Device List

**DeviceColumns** (`features/devices/components/device-columns.tsx`)
- Columns: `deviceId`, `deviceName`, `deviceType` (Badge), `imei`, `currentStatus` (Badge: running=green, stopped=gray, error=red, disconnected=yellow), vehicle plate (link or "—"), `lastSeenAt` (relative time), Actions dropdown (View, Edit, Delete)

**DeviceCard** (`features/devices/components/device-card.tsx`)
- Card display per device: status gradient background (green→emerald for running, gray for stopped, red for error, yellow for disconnected)
- Info: deviceName, deviceId, status badge, runtime today, battery voltage
- Click → opens DeviceDetailModal
- Ref IVM26: `device-card.tsx` (6.5KB)

**DeviceGrid** (`features/devices/components/device-grid.tsx`)
- Responsive grid layout: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Toggle between DataTable and Grid view

**DeviceStatsBar** (`features/devices/components/device-stats-bar.tsx`)
- Summary bar above list: Tổng thiết bị | Đang chạy (green) | Dừng (gray) | Lỗi (red) | Mất kết nối (yellow)

**DeviceForm** (`features/devices/components/device-form.tsx`)
- Dialog with fields: `deviceId` (Input, disabled on edit), `deviceName` (Input), `deviceType` (Select: gps_tracker/obd2/hybrid), `imei` (Input), `simNumber` (Input), `config` (JSON editor textarea), `notes` (Textarea)

**DeviceFilters** (`features/devices/components/device-filters.tsx`)
- Status filter (Select: all/running/stopped/disconnected), search input, sort select, customer filter
- Reset filters button when any filter active

### UI Components — Device Detail Modal (IVM26 Pattern)

> **CRITICAL**: Dùng `Dialog` (KHÔNG `Sheet`), kích thước 90vw × 90vh.
> Tham khảo IVM26: `features/devices/components/device-detail-modal/`

**DeviceDetailModal** — Thư mục `features/devices/components/device-detail-modal/`

**Structure:**
```
device-detail-modal/
├── index.tsx              ← Main Dialog component (23KB ref)
├── modal-context.tsx      ← React Context provider for all data/handlers
├── modal-container.tsx    ← Data fetching wrapper wrapping context
├── overview-tab.tsx       ← Tab "Tổng quan" (11KB ref)
├── sessions-tab.tsx       ← Tab "Phiên chạy" (13KB ref)
├── error-codes-tab.tsx    ← Tab "Mã lỗi" (8KB ref)
├── runtime-tab.tsx        ← Tab "Biểu đồ thời gian" (2KB ref)
├── vibration-tab.tsx      ← Tab "Biểu đồ rung" (2KB ref) — RBAC: canViewSystemInfo
├── settings-tab.tsx       ← Tab "Cài đặt" (16KB ref) — RBAC: canEditDevice
├── session-vibration-chart-dialog.tsx ← Nested dialog for session detail (9KB ref)
├── empty-state.tsx        ← Empty state component
└── spec.tsx               ← Storybook/test spec
```

**index.tsx** — Main modal:
- `Dialog` component with `DialogContent` set to `className="max-w-[90vw] max-h-[90vh]"`
- Header: Status icon (gradient background), device name + status Badge, export DropdownMenu
- Tabs (6): Tổng quan, Phiên chạy, Mã lỗi, Biểu đồ thời gian, Biểu đồ rung, Cài đặt
- **Tab visibility (RBAC):**
  - "Biểu đồ rung" — only if `canViewSystemInfo` (admin/root)
  - "Cài đặt" — only if `canEditDevice` (admin/root/operator)
- **Realtime subscriptions:**
  - `device.status.changed` → update local state for instant UI + invalidate queries
  - `device.sessions.updated` → invalidate session/detail queries

**modal-context.tsx** — Context provider:
```typescript
interface DeviceDetailModalContextValue {
  // Data
  detail: DeviceDetail | null;
  loading: boolean;
  error: Error | null;
  
  // Sessions (paginated, load-more)
  sessions: DeviceSession[];
  sessionsLoading: boolean;
  sessionsHasMore: boolean;
  onSessionsLoadMore: () => void;
  
  // Error codes (paginated, filtered)
  errorCodes: ErrorCode[];
  errorCodesPagination: Pagination;
  errorCodesStatus: string;
  errorCodesType: string;
  onErrorCodesPageChange: (page: number) => void;
  onErrorCodesStatusChange: (status: string) => void;
  onErrorCodesTypeChange: (type: string) => void;
  
  // Charts
  runtimeChart: RuntimeChartData | null;
  runtimeRange: '7d' | '30d' | '90d' | '1y';
  onRuntimeRangeChange: (range: string) => void;
  vibrationChart: VibrationChartData | null;
  vibrationPeriod: '1h' | '6h' | '24h' | '7d';
  onVibrationPeriodChange: (period: string) => void;
  
  // Actions
  onUpdateNameId: (data: any) => Promise<void>;
  onUpdateSettings: (data: any) => Promise<void>;
  onDeleteDevice: (data: any) => Promise<void>;
  
  // Tab
  activeTab: string;
  onTabChange: (tab: string) => void;
}
```

**overview-tab.tsx** — Tab "Tổng quan":
- Device info grid: IMEI, firmware, customer, vehicle, created date, last seen
- Runtime stats cards: today / week / month / quarter / year / total (runtime hours)
- Realtime data section: current vibration, battery voltage, temperature

**sessions-tab.tsx** — Tab "Phiên chạy":
- Session cards list with infinite scroll (load more button)
- Each card: start time, end time, duration, vibration stats (avg/max/rms)
- Click card → opens `SessionVibrationChartDialog` showing vibration detail for that session

**error-codes-tab.tsx** — Tab "Mã lỗi":
- Filter bar: status (active/resolved), type (all/critical/warning)
- DataTable with pagination: error code, name, description, count, last occurred, status Badge

**runtime-tab.tsx** — Tab "Biểu đồ thời gian":
- Range selector: 7d / 30d / 90d / 1y
- recharts BarChart — runtime hours per day/week

**vibration-tab.tsx** — Tab "Biểu đồ rung" (RBAC: canViewSystemInfo):
- Period selector: 1h / 6h / 24h / 7d
- recharts LineChart — vibration values over time + threshold dashed line

**settings-tab.tsx** — Tab "Cài đặt" (RBAC: canEditDevice):
- Name/ID form section (React Hook Form + Zod)
- Settings form: request_interval, vibration_threshold, etc.
- Danger zone: delete device (ConfirmDialog)

**ExportModal** (`features/devices/components/export-modal.tsx`):
- Nested Dialog for exporting device data
- Fields: date range (DateRangePicker), export type (sessions/errors/telemetry), format (CSV/Excel)
- Triggers `POST /exports` job

### Zod Schema (`lib/validations/device.schema.ts`)

```typescript
export const deviceSchema = z.object({
  deviceId: z.string().min(1, 'Mã thiết bị không được để trống')
    .max(50).regex(/^[A-Z0-9_]+$/, 'Chỉ cho phép ký tự in hoa, số và dấu gạch dưới'),
  deviceName: z.string().min(1, 'Tên thiết bị không được để trống').max(100),
  deviceType: z.enum(['gps_tracker', 'obd2', 'hybrid'], {
    required_error: 'Vui lòng chọn loại thiết bị',
  }),
  imei: z.string().max(20).optional(),
  simNumber: z.string().max(20).optional(),
  config: z.record(z.unknown()).optional(),
  notes: z.string().max(500).optional(),
});

export const deviceSettingsSchema = z.object({
  deviceName: z.string().min(1).max(100),
  requestInterval: z.coerce.number().min(1).max(3600),
  vibrationThreshold: z.coerce.number().min(0).max(100),
});

export const commandSchema = z.object({
  command: z.enum(['REBOOT', 'SET_INTERVAL', 'GET_CONFIG', 'LOCK_ENGINE', 'UNLOCK_ENGINE']),
  params: z.record(z.unknown()).optional(),
  timeout: z.number().min(5000).max(60000).default(30000),
});
```

### API Endpoints

| Method | Path                          | Request                                      | Response                            |
| ------ | ----------------------------- | -------------------------------------------- | ----------------------------------- |
| GET    | `/device`                     | `?search&status&page&limit`                  | `{ devices: [...], pagination }`    |
| GET    | `/device/:id`                 | -                                            | `{ device }`                        |
| POST   | `/device`                     | `DeviceFormValues`                           | `{ device }`                        |
| PUT    | `/device/:id`                 | `DeviceFormValues`                           | `{ device }`                        |
| DELETE | `/device/:id`                 | -                                            | `{ success }`                       |
| GET    | `/device/:id/sessions`        | `?page&limit`                                | `{ sessions: [...], pagination }`   |
| GET    | `/device/:id/error-codes`     | `?status&type&page&limit`                    | `{ errorCodes: [...], pagination }` |
| GET    | `/device/:id/runtime-chart`   | `?range=7d\|30d\|90d\|1y`                    | `{ data: [{ date, hours }] }`       |
| GET    | `/device/:id/vibration-chart` | `?period=1h\|6h\|24h\|7d`                    | `{ data: [{ timestamp, value }] }`  |
| PUT    | `/device/:id/settings`        | `{ requestInterval, vibrationThreshold }`    | `{ device }`                        |
| POST   | `/devices/:id/command`        | `{ command, params, timeout }`               | `{ commandId, status }`             |
| POST   | `/exports`                    | `{ entityType, deviceId, from, to, format }` | `{ export: { id, status } }`        |

### Hooks

- `useDevices(filters)` — `useQuery(['devices', filters])`
- `useDeviceDetail(id)` — `useQuery(['device-detail', id], { enabled: !!id })`. Returns aggregate: device + runtime stats + realtime data
- `useDeviceSessions(deviceId, page)` — `useQuery(['device-sessions', deviceId, page])`
- `useDeviceErrorCodes(deviceId, { status, type, page })` — `useQuery(['device-errors', deviceId, ...filters])`
- `useDeviceRuntimeChart(deviceId, range)` — `useQuery(['device-runtime-chart', deviceId, range])`
- `useDeviceVibrationChart(deviceId, period)` — `useQuery(['device-vibration-chart', deviceId, period])`
- `useCreateDevice()` — `useMutation`, invalidates `['devices']`
- `useUpdateDevice()` — `useMutation`, invalidates `['devices']` + `['device-detail', id]`
- `useUpdateDeviceSettings(deviceId)` — `useMutation`, invalidates `['device-detail', deviceId]`
- `useDeleteDevice()` — `useMutation`, invalidates `['devices']`
- `useSendCommand(deviceId)` — `useMutation` calling `POST /devices/:id/command`
- `useCreateExport()` — `useMutation`, invalidates `['exports']`, toast "Đang tạo báo cáo..."
- `useDeviceRealtime()` — Socket listener: `device:status` (update query cache optimistic), `device:position` (update coordinates)

### Advanced Logic

- **RBAC in modal tabs:** Use `useRoleAccess()` hook. Hide "Biểu đồ rung" tab if `!canViewSystemInfo`. Hide "Cài đặt" tab if `!canEditDevice`.
- **Realtime subscriptions in modal:** When modal opens, subscribe `device.status.changed` and `device.sessions.updated`. On status event: merge into local state for instant feedback, then invalidate queries. On session event: invalidate session queries.
- **Context provider pattern:** `modal-container.tsx` fetches all data, wraps children in `ModalContext.Provider`. Each tab consumes context via `useModalContext()`. This avoids prop drilling and duplicate queries.
- **Infinite scroll sessions:** Use `useInfiniteQuery` or manual page tracking with "Tải thêm" button.
- **Export dropdown menu:** In modal header, DropdownMenu with options: "Xuất toàn bộ", "Xuất phiên chạy", "Xuất mã lỗi" → opens ExportModal with pre-filled entity type.

### States

- **Loading:** Skeleton cards for overview, skeleton table for sessions/errors, skeleton chart for charts
- **Empty (sessions):** Clock icon + "Chưa có phiên chạy nào"
- **Empty (errors):** CheckCircle icon + "Không có mã lỗi"
- **Error:** Alert banner with retry button
- **Command pending:** Spinner + "Đang gửi lệnh..." badge
- **Command failed:** Red badge + error message

---

## 5. Customer Management (`features/customers`)

**User Story:** As an admin, I want to manage B2B customer profiles and their associated vehicle fleets.

### UI Components

**CustomerColumns** -- Columns: `customerCode`, `name`, `email`, `phone`, `taxCode`, vehicle count (number badge), `status` (Badge), Actions
**CustomerForm** -- Dialog: `customerCode`, `name`, `email`, `phone`, `taxCode`, `address` (Textarea), `contactPerson`, `notes`
**CustomerDetailModal** -- Sheet: Customer info, Fleet overview (list of assigned vehicles with status), User access list (users who can see this customer's data)

### Zod Schema (`lib/validations/customer.schema.ts`)

```typescript
export const customerSchema = z.object({
  customerCode: z.string().min(1, 'Ma khach hang khong duoc de trong').max(20),
  name: z.string().min(1, 'Ten khach hang khong duoc de trong').max(100),
  email: z.string().email('Email khong hop le').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  taxCode: z.string().max(20).optional(),
  address: z.string().max(255).optional(),
  contactPerson: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});
```

### API Endpoints

| Method | Path             | Request                     | Response                                      |
| ------ | ---------------- | --------------------------- | --------------------------------------------- |
| GET    | `/customers`     | `?search&status&page&limit` | `{ customers: [...], pagination }`            |
| GET    | `/customers/:id` | -                           | `{ customer, vehicles: [...], users: [...] }` |
| POST   | `/customers`     | `CustomerFormValues`        | `{ customer }`                                |
| PUT    | `/customers/:id` | `CustomerFormValues`        | `{ customer }`                                |
| DELETE | `/customers/:id` | -                           | `{ success }`                                 |

### Hooks

- `useCustomers(filters)` -- `useQuery(['customers', filters])`
- `useCustomerDetail(id)` -- `useQuery(['customers', id])`
- `useCreateCustomer()` -- `useMutation`, invalidates `['customers']`
- `useUpdateCustomer()` -- `useMutation`, invalidates `['customers']` + `['customers', id]`
- `useDeleteCustomer()` -- `useMutation`, invalidates `['customers']`

### Advanced Logic

- **Cascading Suspension:** When toggling customer status to `inactive`, show ConfirmDialog: "Bạn có muốn tạm ngưng tất cả [N] phương tiện của khách hàng này?" If confirmed, backend disables all vehicles.

### States

- **Loading:** DataTable skeleton
- **Empty:** Users icon + "Chua co khach hang nao" + Button "Them khach hang"
- **Error:** Alert banner with retry

---

## 6. Trip Management (`features/trips`)

**User Story:** As a monitor, I want to view trip history, replay routes, and analyze driving behavior.

### UI Components

**TripColumns** (`features/trips/components/trip-columns.tsx`)
- Columns: `tripCode`, vehicle plate, driver name, `startTime` (formatted), `endTime` (formatted or "Dang di"), distance (km), fuel used (L), `status` (Badge: active=green, completed=blue, cancelled=gray), Actions (View detail)

**TripForm** (`features/trips/components/trip-form.tsx`)
- Dialog: `tripCode` (auto-generated), `vehicleId` (Combobox), `driverId` (optional), `startTime` (DateTimePicker), `notes`

**TripDetail** (`features/trips/components/trip-detail.tsx`) -- Full page `/trips/[id]`
- **Route Map:** Leaflet map with Polyline. Segments color-coded by speed: green (<50 km/h), yellow (50-80), orange (80-100), red (>100). Start marker (green), end marker (red). Alert event markers (harsh braking, speeding) as warning icons.
- **Telemetry Chart:** recharts synced with map. Lines for speed, fuel, RPM. Brush selection syncs with map view.
- **Replay Controls:** Play/Pause button, speed selector (1x/2x/4x), progress scrubber slider, current position time display. Moving marker on map during playback.
- **Trip Summary Card:** Distance, duration, avg speed, max speed, fuel consumption, idle time, alert count.

**TripReplayControls** (`features/trips/components/trip-replay-controls.tsx`)
- Slider (progress bar), Play/Pause toggle, Speed selector (1x/2x/4x), Time display (current / total)
- Uses `requestAnimationFrame` for smooth marker interpolation between GPS points

### Zod Schema (`lib/validations/trip.schema.ts`)

```typescript
export const tripSchema = z.object({
  tripCode: z.string().optional(),
  vehicleId: z.coerce.number().positive('Vui long chon phuong tien'),
  driverId: z.coerce.number().positive().optional().nullable(),
  startTime: z.coerce.date({ required_error: 'Vui long chon thoi gian bat dau' }),
  notes: z.string().max(500).optional(),
});
```

### API Endpoints

| Method | Path                   | Request                                | Response                           |
| ------ | ---------------------- | -------------------------------------- | ---------------------------------- |
| GET    | `/trips`               | `?vehicleId&status&from&to&page&limit` | `{ trips: [...], pagination }`     |
| GET    | `/trips/:id`           | -                                      | `{ trip, summary }`                |
| POST   | `/trips`               | `TripFormValues`                       | `{ trip }`                         |
| GET    | `/trips/:id/telemetry` | `?resolution&fields`                   | `{ points: [...], events: [...] }` |

### Hooks

- `useTrips(filters)` -- `useQuery(['trips', filters])`
- `useTripDetail(id)` -- `useQuery(['trips', id])`
- `useTripTelemetry(id, resolution)` -- `useQuery(['trip-telemetry', id, resolution])`
- `useCreateTrip()` -- `useMutation`, invalidates `['trips']`

### Advanced Logic

- **Path Interpolation:** Between GPS pings (e.g., every 10s), interpolate intermediate positions using linear interpolation for smooth marker movement during replay.
- **Speed-colored Segments:** Split polyline into segments. Each segment color determined by speed value at that point.
- **Chart-Map Sync:** Hovering chart shows corresponding position on map. Scrubber position updates both chart cursor and map marker.

### States

- **Loading (list):** DataTable skeleton
- **Loading (detail):** Map skeleton + chart skeleton + summary skeleton
- **Empty:** Route icon + "Chua co chuyen di nao" + Button "Tao chuyen di"
- **Error:** Alert banner with retry

---

## 7. Alert Management (`features/alerts`)

**User Story:** As a fleet manager, I want to see, acknowledge, and resolve alerts in real-time to respond to incidents quickly.

### UI Components

**AlertColumns** (`features/alerts/components/alert-columns.tsx`)
- Columns: `type` (icon + text), `severity` (Badge: critical=red, high=orange, medium=yellow, low=blue, info=gray), vehicle plate, device ID, `message` (truncated), `createdAt` (relative time), `status` (Badge: active=red-outline, acknowledged=yellow-outline, resolved=green-outline, dismissed=gray), Actions

**AlertDetailModal** (`features/alerts/components/alert-detail-modal.tsx`)
- Sheet with sections:
  - Alert info: type, severity, message, timestamp
  - Location: Mini Leaflet map showing alert position
  - Context: speed at time, threshold value, device info
  - Vehicle/Driver info
  - Resolution: acknowledged_by, acknowledged_at, resolved_at, resolution_notes
  - Action buttons: Acknowledge, Resolve (with notes textarea), Dismiss

**AlertFilters** (`features/alerts/components/alert-filters.tsx`)
- Filter bar: severity multi-select, status multi-select, type select, vehicle select, date range picker
- Active filter badges with clear button

### Zod Schema (`lib/validations/alert.schema.ts`)

```typescript
export const alertResolveSchema = z.object({
  resolutionNotes: z.string().min(1, 'Vui long nhap ghi chu xu ly').max(500),
});
```

### API Endpoints

| Method | Path                      | Request                                              | Response                        |
| ------ | ------------------------- | ---------------------------------------------------- | ------------------------------- |
| GET    | `/alerts`                 | `?severity&status&type&vehicleId&from&to&page&limit` | `{ alerts: [...], pagination }` |
| GET    | `/alerts/:id`             | -                                                    | `{ alert }`                     |
| PUT    | `/alerts/:id/acknowledge` | -                                                    | `{ alert }`                     |
| PUT    | `/alerts/:id/resolve`     | `{ resolutionNotes }`                                | `{ alert }`                     |
| PUT    | `/alerts/:id/dismiss`     | -                                                    | `{ alert }`                     |

### Hooks

- `useAlerts(filters)` -- `useQuery(['alerts', filters])`
- `useAlertDetail(id)` -- `useQuery(['alerts', id])`
- `useAcknowledgeAlert()` -- `useMutation`, invalidates `['alerts']`
- `useResolveAlert()` -- `useMutation`, invalidates `['alerts']`
- `useDismissAlert()` -- `useMutation`, invalidates `['alerts']`
- `useAlertRealtime()` -- Socket `/dashboard` namespace. On `alert:new`: show toast notification (Sonner) with severity color, prepend to alert list via `setQueryData`, play notification sound for critical alerts.

### Advanced Logic

- **Alert Grouping:** Backend groups repeated alerts (e.g., 50 speeding alerts in 1 minute = 1 incident with count). UI displays "x50" badge on grouped alerts.
- **Real-time Toast:** Critical alerts show persistent toast (no auto-dismiss). High alerts auto-dismiss after 10s. Medium/low dismissed after 5s.
- **Bulk Actions:** Select multiple alerts with checkboxes, bulk acknowledge or bulk dismiss.

### States

- **Loading:** DataTable skeleton
- **Empty:** Bell icon + "Khong co canh bao nao" (with active filters: "Khong tim thay canh bao phu hop")
- **Error:** Alert banner with retry

---

## 8. Geofence Management (`features/geofences`)

**User Story:** As a dispatcher, I want to draw geographic zones on a map and get alerted when vehicles enter or exit these zones.

### UI Components

**GeofenceColumns** (`features/geofences/components/geofence-columns.tsx`)
- Columns: `name`, `type` (Badge: circle=blue, polygon=green), radius (for circle, meters) or area (for polygon, sq km), vehicle count (number), `isActive` (Switch toggle), Actions (Edit, Delete)

**GeofenceForm** (`features/geofences/components/geofence-form.tsx`)
- Split layout Dialog (large, `max-w-4xl`):
  - **Left panel (40%):** Form fields
    - `name` (Input, required)
    - `description` (Textarea)
    - `type` (Select: circle/polygon, changes map draw tool)
    - `alertOnEntry` (Switch, default true)
    - `alertOnExit` (Switch, default true)
    - `vehicles` (Multi-select Combobox, search vehicles by plate)
    - `isActive` (Switch, default true)
  - **Right panel (60%):** Leaflet map with drawing tools
    - Circle tool: click center, drag to set radius. Radius displayed in real-time
    - Polygon tool: click vertices to draw shape. Area displayed in real-time
    - Edit mode: drag vertices, resize circle
    - Delete tool: remove shape
    - Only ONE shape allowed per geofence. Drawing a new shape replaces the old one
    - On save: convert Leaflet shape to GeoJSON coordinates

**GeofenceMapEditor** (`features/geofences/components/geofence-map-editor.tsx`)
- Leaflet map with `leaflet-draw` plugin
- Props: `type: 'circle' | 'polygon'`, `initialCoordinates?: GeoJSON`, `onChange: (coords, radius?) => void`
- Shows area/radius label overlay while drawing
- Edit mode: load existing shape, allow modifications
- Validation: prevent self-intersecting polygons (check on submit)

**GeofenceVehicleBinder** (`features/geofences/components/geofence-vehicle-binder.tsx`)
- Multi-select Combobox searching vehicles by plate number
- Selected vehicles shown as removable badges below input
- On save: bulk update `geofence_vehicles` join table

### Zod Schema (`lib/validations/geofence.schema.ts`)

```typescript
export const geofenceSchema = z.object({
  name: z.string().min(1, 'Ten vung dia ly khong duoc de trong').max(100),
  description: z.string().max(255).optional(),
  type: z.enum(['circle', 'polygon'], {
    required_error: 'Vui long chon loai vung',
  }),
  coordinates: z.any().refine((val) => val !== null && val !== undefined, {
    message: 'Vui long ve vung dia ly tren ban do',
  }),
  radiusMeters: z.number().positive().optional(),
  alertOnEntry: z.boolean().default(true),
  alertOnExit: z.boolean().default(true),
  isActive: z.boolean().default(true),
  vehicleIds: z.array(z.number()).optional().default([]),
});
```

### API Endpoints

| Method | Path                      | Request                       | Response                           |
| ------ | ------------------------- | ----------------------------- | ---------------------------------- |
| GET    | `/geofences`              | `?search&isActive&page&limit` | `{ geofences: [...], pagination }` |
| GET    | `/geofences/:id`          | -                             | `{ geofence, vehicles: [...] }`    |
| POST   | `/geofences`              | `GeofenceFormValues`          | `{ geofence }`                     |
| PUT    | `/geofences/:id`          | `GeofenceFormValues`          | `{ geofence }`                     |
| DELETE | `/geofences/:id`          | -                             | `{ success }`                      |
| PUT    | `/geofences/:id/toggle`   | `{ isActive }`                | `{ geofence }`                     |
| PUT    | `/geofences/:id/vehicles` | `{ vehicleIds: number[] }`    | `{ success }`                      |

### Hooks

- `useGeofences(filters)` -- `useQuery(['geofences', filters])`
- `useGeofenceDetail(id)` -- `useQuery(['geofences', id])`
- `useCreateGeofence()` -- `useMutation`, invalidates `['geofences']`, toast "Tao vung dia ly thanh cong"
- `useUpdateGeofence()` -- `useMutation`, invalidates `['geofences']` + `['geofences', id]`
- `useDeleteGeofence()` -- `useMutation`, invalidates `['geofences']`
- `useToggleGeofence()` -- `useMutation` calling `PUT /geofences/:id/toggle`
- `useUpdateGeofenceVehicles()` -- `useMutation` calling `PUT /geofences/:id/vehicles`

### Advanced Logic

- **Polygon Validation:** Before submit, check for self-intersecting edges. If invalid, show error: "Da giac khong hop le, cac canh khong duoc cat nhau"
- **Minimum Area:** Circles must have radius >= 50m. Polygons must have area >= 2500 sq m.
- **Active Toggle:** Inline Switch in DataTable row. Optimistic update via `setQueryData`.
- **GeoJSON Conversion:** Circle stored as `{ type: 'Point', coordinates: [lon, lat] }` + `radiusMeters`. Polygon stored as `{ type: 'Polygon', coordinates: [[lon, lat], ...] }`.

### States

- **Loading:** DataTable skeleton
- **Empty:** MapPin icon + "Chua co vung dia ly nao" + Button "Tao vung moi"
- **Error:** Alert banner with retry
- **Delete confirmation:** ConfirmDialog "Xoa vung dia ly [name]? Tat ca canh bao lien quan se bi huy."

---

## 9. Maintenance Management (`features/maintenance`)

**User Story:** As a fleet manager, I want to schedule and track vehicle maintenance to prevent breakdowns and stay compliant.

### UI Components

**MaintenanceColumns** -- Columns: vehicle plate, `maintenanceType` (Badge), `title`, `status` (Badge: scheduled=blue, in_progress=orange, completed=green, overdue=red), `scheduledDate`, `completedDate`, `cost` (formatted VND), Actions
**MaintenanceForm** -- Dialog: `vehicleId` (Combobox), `maintenanceType` (Select: oil_change/tire_rotation/brake_inspection/general/custom), `title`, `description` (Textarea), `scheduledDate` (DatePicker), `completedDate` (DatePicker), `cost` (Input number), `serviceProvider`, `mileageAtService` (Input number), `nextServiceMileage` (Input number), `notes`
**MaintenanceCalendar** (`features/maintenance/components/maintenance-calendar.tsx`)
- Calendar component (shadcn Calendar or custom) showing:
  - Green dots: completed services
  - Orange dots: upcoming (within 7 days)
  - Red dots: overdue services
- Click a date to see maintenance records for that day
**MileageForecaster** (`features/maintenance/components/mileage-forecaster.tsx`)
- recharts line chart projecting when vehicle reaches next service mileage
- Based on: `Daily Avg Km = Total Km / Days Active`, `Days to Service = (nextServiceMileage - currentMileage) / dailyAvg`

### Zod Schema (`lib/validations/maintenance.schema.ts`)

```typescript
export const maintenanceSchema = z.object({
  vehicleId: z.coerce.number().positive('Vui long chon phuong tien'),
  maintenanceType: z.enum(['oil_change', 'tire_rotation', 'brake_inspection', 'general', 'custom'], {
    required_error: 'Vui long chon loai bao tri',
  }),
  title: z.string().min(1, 'Tieu de khong duoc de trong').max(100),
  description: z.string().max(500).optional(),
  scheduledDate: z.coerce.date({ required_error: 'Vui long chon ngay hen' }),
  completedDate: z.coerce.date().optional().nullable(),
  cost: z.coerce.number().min(0, 'Chi phi khong hop le').optional(),
  serviceProvider: z.string().max(100).optional(),
  mileageAtService: z.coerce.number().min(0).optional(),
  nextServiceMileage: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});
```

### API Endpoints

| Method | Path                 | Request                                | Response                                          |
| ------ | -------------------- | -------------------------------------- | ------------------------------------------------- |
| GET    | `/maintenance`       | `?vehicleId&status&from&to&page&limit` | `{ records: [...], pagination }`                  |
| GET    | `/maintenance/:id`   | -                                      | `{ record }`                                      |
| POST   | `/maintenance`       | `MaintenanceFormValues`                | `{ record }`                                      |
| PUT    | `/maintenance/:id`   | `MaintenanceFormValues`                | `{ record }`                                      |
| DELETE | `/maintenance/:id`   | -                                      | `{ success }`                                     |
| GET    | `/stats/maintenance` | -                                      | `{ overdue, dueSoon, upcoming, vehicles: [...] }` |

### Hooks

- `useMaintenance(filters)` -- `useQuery(['maintenance', filters])`
- `useMaintenanceDetail(id)` -- `useQuery(['maintenance', id])`
- `useCreateMaintenance()` -- `useMutation`, invalidates `['maintenance']`
- `useUpdateMaintenance()` -- `useMutation`, invalidates `['maintenance']` + `['maintenance', id]`
- `useDeleteMaintenance()` -- `useMutation`, invalidates `['maintenance']`
- `useMaintenanceStats()` -- `useQuery(['maintenance-stats'])`

### Advanced Logic

- **Auto-Status:** When a maintenance record with `completedDate = null` exists for a vehicle, the vehicle status badge shows "Bao tri" (maintenance).
- **Overdue Highlight:** If `scheduledDate < today && completedDate === null`, row is highlighted red.
- **Mileage Prediction:** `Daily Avg = totalKm / daysActive`. Chart shows projected line from current mileage to next service mileage.

### States

- **Loading:** DataTable skeleton
- **Empty:** Wrench icon + "Chua co lich bao tri nao" + Button "Tao lich bao tri"
- **Error:** Alert banner with retry

---

## 10. Map / Live Tracking (`features/map`)

**User Story:** As a monitor, I want to see all vehicles on a real-time map with clustering, device panels, search, geofence overlays, and mobile-responsive drawer.

### UI Components

**MapPage** -- Full-height layout (`h-[calc(100dvh-52px)]`) with sidebar + map. No PageContainer header (map is fullscreen).

**TrackingMap** (`features/map/components/tracking-map.tsx`)
- Leaflet MapContainer with TileLayer (OpenStreetMap)
- Dynamic import with `{ ssr: false }`
- Contains: TileLayer, DeviceCluster, DeviceMarker[], MapControls, SelectedDeviceCard
- Ref IVM26: `tracking-map.tsx` (16KB)

**DeviceListPanel** (`features/map/components/device-list-panel.tsx`)
- Sidebar left (320px width on desktop), contains:
  - DeviceSearch (search input)
  - DeviceFilter (status/type filter)
  - DeviceListItem[] (scrollable list)
- Click item → set selectedDeviceId + flyTo marker
- Ref IVM26: `device-list-panel.tsx` (8KB)

**DeviceListItem** (`features/map/components/device-list-item.tsx`)
- Each device in panel: status color dot, name, status label, last seen time
- Highlighted when selected
- Ref IVM26: `device-list-item.tsx` (6.5KB)

**DeviceSearch** (`features/map/components/device-search.tsx`)
- Search input with debounce 300ms, filters device list panel
- Ref IVM26: `device-search.tsx` (1.7KB)

**DeviceFilter** (`features/map/components/device-filter.tsx`)
- Filter by status: all/running/stopped/disconnected/error
- Desktop: horizontal buttons row
- Ref IVM26: `device-filter.tsx` (5.7KB)

**DeviceFilterCompact** (`features/map/components/device-filter-compact.tsx`)
- Mobile version: compact Select dropdown
- Ref IVM26: `device-filter-compact.tsx` (5.6KB)

**SelectedDeviceCard** (`features/map/components/selected-device-card.tsx`)
- Floating card when a device marker is clicked
- Shows: plate, speed, heading (compass), coordinates, last update, runtime
- Buttons: "Xem chi tiết" (opens DeviceDetailModal), "Theo dõi" (follow mode)
- Ref IVM26: `selected-device-card.tsx` (9.5KB)

**DeviceCluster** (`features/map/components/device-cluster.tsx`)
- `react-leaflet-cluster` wrapper
- Custom cluster icon: count badge + color (red if any device in cluster has error, green otherwise)
- Disabled at zoom >= 14
- Ref IVM26: `device-cluster.tsx` (1.9KB)

**DeviceMarker** (`features/map/components/device-marker.tsx`)
- Custom `L.divIcon` with device icon, rotated by heading
- Color by status: green (running), gray (stopped), red (error), yellow (offline)
- Popup: device name, status, last update time
- Click: set `selectedDeviceId` in Zustand map store

**MarkerIconFactory** (`features/map/components/marker-icon.ts`)
- `createDeviceMarkerIcon(status, heading?)` → `L.DivIcon`
- Status colors: running=#22c55e, stopped=#6b7280, error=#ef4444, disconnected=#eab308
- SVG icon with rotation transform for heading
- Ref IVM26: `marker-icon.ts` (6.5KB)

**MapControls** (`features/map/components/map-controls.tsx`)
- Floating top-right buttons: Zoom in/out, MapLayerSwitcher, Fullscreen toggle, Fit all bounds
- Ref IVM26: `map-controls.tsx` (5.5KB)

**MapLayerSwitcher** (`features/map/components/map-layer-switcher.tsx`)
- Toggle between Street and Satellite tile layers
- Ref IVM26: `map-layer-switcher.tsx` (2.7KB)

**MobileDeviceDrawer** (`features/map/components/mobile-device-drawer.tsx`)
- Bottom sheet for mobile screens (< md breakpoint)
- Replaces sidebar on mobile
- Contains: DeviceFilterCompact, DeviceSearch, DeviceListItem[], SelectedDeviceCard
- Drag to expand/collapse
- Ref IVM26: `mobile-device-drawer.tsx` (7.5KB)

**GeofenceLayer** (`components/map/geofence-layer.tsx`)
- Renders Circle and Polygon layers from geofence data
- Semi-transparent fill with colored border (green=active, gray=inactive)
- Tooltip with geofence name
- Visibility toggled from sidebar

### Zustand Map Store (`lib/store/map-store.ts`)

```typescript
interface MapState {
  selectedDeviceId: string | null;
  showGeofences: boolean;
  followMode: boolean;
  mapViewport: { center: [number, number]; zoom: number };

  // Actions
  setSelectedDevice: (id: string | null) => void;
  toggleGeofences: () => void;
  toggleFollowMode: () => void;
  setMapViewport: (viewport: { center: [number, number]; zoom: number }) => void;
}
```

### API Endpoints

| Method | Path                 | Request          | Response                                        |
| ------ | -------------------- | ---------------- | ----------------------------------------------- |
| GET    | `/devices/positions` | `?status`        | `{ data: [{ id, lat, lon, spd, hdg, ts, s }] }` |
| GET    | `/geofences`         | `?isActive=true` | `{ geofences: [...] }`                          |

### Hooks

- `useDevicePositions()` — `useQuery(['device-positions'])`, refetchInterval: 30000 (fallback polling). Disabled when Socket is connected.
- `useMapRealtime()` — Socket listener: `device:position` (throttled 500ms), `device:status` (update badge)

### Advanced Logic

- **List-Map Sync:** `selectedDeviceId` in Zustand. Panel click calls `map.flyTo(lat, lon, 16)`. Marker click scrolls panel to item and highlights it.
- **Clustering:** `react-leaflet-cluster`. Custom cluster icon: count badge + color. Disabled at zoom >= 14.
- **Ghost Trail:** When device is selected and ghost trail enabled, show last 5 positions as fading polyline with direction arrows.
- **Canvas Rendering:** For history trails > 1000 points, use `L.canvas()` renderer.
- **Throttling:** Buffer incoming Socket events in ref. Flush to React state at max 2Hz (every 500ms) via `setInterval`. Pattern:
  ```typescript
  const positionBufferRef = useRef(new Map<string, DevicePosition>());
  useRealtimeSubscription({ event: 'device:position', handler: (p) => positionBufferRef.current.set(p.device_id, p) });
  useEffect(() => {
    const interval = setInterval(() => {
      if (positionBufferRef.current.size === 0) return;
      queryClient.setQueryData(['device-positions'], (old) => /* merge buffer */);
      positionBufferRef.current.clear();
    }, 500);
    return () => clearInterval(interval);
  }, [queryClient]);
  ```
- **Follow Mode:** When enabled, map auto-pans to selected device on every position update.
- **Mobile responsive:** On screens < md, hide DeviceListPanel, show MobileDeviceDrawer instead.
- **Marker Icon Factory:** Use `createDeviceMarkerIcon(status, heading?)` to create DivIcons. Icon includes SVG with `transform: rotate(${heading}deg)`.

### States

- **Loading:** Map skeleton (gray rectangle) + sidebar skeleton
- **Empty (no devices):** Map rendered but empty. Panel shows "Không có thiết bị nào"
- **Error (socket):** Floating banner "Mất kết nối real-time. Đang thử kết nối lại..."




---

## 11. Firmware Management (`features/firmware`)

**User Story:** As a technician, I want to upload firmware versions and deploy OTA updates to device groups.

### UI Components

**FirmwareColumns** -- Columns: `version`, file size (formatted), upload date, device count (assigned), `status` (Badge: active=green, draft=gray), Actions (Activate, Assign, Delete)
**FirmwareUploadForm** -- Dialog: `version` (Input, SemVer validation), file upload (drag-drop zone, `.bin` only), `description` (Textarea)
**FirmwareAssignDialog** -- Dialog: device multi-select with filter ("All devices with version < X.Y.Z"), strategy select (rolling/all-at-once), batch size input. Confirmation step showing affected device count.
**FirmwareDeploymentDashboard** -- Section below table showing: active deployments, per-device progress bars, success/failure counters, overall progress percentage.

### Zod Schema (`lib/validations/firmware.schema.ts`)

```typescript
export const firmwareUploadSchema = z.object({
  version: z.string()
    .min(1, 'Phien ban khong duoc de trong')
    .regex(/^\d+\.\d+\.\d+$/, 'Phien ban phai theo dinh dang SemVer (VD: 1.2.0)'),
  description: z.string().max(500).optional(),
  file: z.instanceof(File, { message: 'Vui long chon file firmware' })
    .refine((f) => f.name.endsWith('.bin'), 'Chi chap nhan file .bin')
    .refine((f) => f.size <= 10 * 1024 * 1024, 'File khong duoc vuot qua 10MB'),
});

export const firmwareAssignSchema = z.object({
  deviceIds: z.array(z.string()).min(1, 'Vui long chon it nhat 1 thiet bi'),
  strategy: z.enum(['rolling', 'all_at_once']).default('rolling'),
  batchSize: z.coerce.number().min(1).max(100).default(10),
});
```

### API Endpoints

| Method | Path                     | Request                                  | Response                                        |
| ------ | ------------------------ | ---------------------------------------- | ----------------------------------------------- |
| GET    | `/firmware`              | `?type&version`                          | `{ data: [...] }`                               |
| GET    | `/firmware/:id`          | -                                        | `{ firmware }`                                  |
| POST   | `/firmware`              | Multipart (file + version + description) | `{ firmware }`                                  |
| DELETE | `/firmware/:id`          | -                                        | `{ success }`                                   |
| PUT    | `/firmware/:id/activate` | -                                        | `{ firmware }`                                  |
| POST   | `/firmware/:id/assign`   | `{ deviceIds, strategy, batchSize }`     | `{ jobId }`                                     |
| GET    | `/firmware/:id/devices`  | -                                        | `{ devices: [{ deviceId, status, progress }] }` |

### Hooks

- `useFirmwareList()` -- `useQuery(['firmware'])`
- `useUploadFirmware()` -- `useMutation`, multipart upload
- `useDeleteFirmware()` -- `useMutation`
- `useActivateFirmware()` -- `useMutation`
- `useAssignFirmware()` -- `useMutation`
- `useFirmwareDevices(firmwareId)` -- `useQuery(['firmware-devices', firmwareId])`, refetchInterval: 5000 during active deployment
- `useFirmwareRealtime()` -- Socket `/firmware` namespace. On `firmware:progress`: update progress bar. On `firmware:complete`: show toast.

### Advanced Logic

- **Safety Check:** If assigning to >10 devices, show ConfirmDialog: "Ban sap cap nhat firmware cho [N] thiet bi. Ban co chac chan?"
- **SemVer Validation:** Version must match `X.Y.Z` pattern. Upload rejected if version already exists.

### States

- **Loading:** DataTable skeleton
- **Empty:** HardDrive icon + "Chua co firmware nao" + Button "Tai len firmware"
- **Upload progress:** Progress bar during file upload

---

## 12. Export Management (`features/exports`)

**User Story:** As a manager, I want to export fleet data (vehicles, trips, alerts) as CSV/Excel files.

### UI Components

**ExportForm** -- Dialog: entity type (Select: vehicles/trips/alerts/devices), format (Select: CSV/Excel), date range (DateRangePicker), additional filters per entity type
**ExportColumns** -- Columns: entity type, format, date range, status (Badge: pending=gray, processing=blue with spinner, completed=green, failed=red), file size, created date, Actions (Download for completed)

### Zod Schema (`lib/validations/export.schema.ts`)

```typescript
export const exportSchema = z.object({
  entityType: z.enum(['vehicles', 'trips', 'alerts', 'devices'], {
    required_error: 'Vui long chon loai du lieu',
  }),
  format: z.enum(['csv', 'excel']).default('csv'),
  from: z.coerce.date({ required_error: 'Vui long chon ngay bat dau' }),
  to: z.coerce.date({ required_error: 'Vui long chon ngay ket thuc' }),
}).refine((data) => data.to > data.from, {
  message: 'Ngay ket thuc phai sau ngay bat dau',
  path: ['to'],
});
```

### API Endpoints

| Method | Path                    | Request              | Response                                |
| ------ | ----------------------- | -------------------- | --------------------------------------- |
| GET    | `/exports`              | `?status&page&limit` | `{ exports: [...], pagination }`        |
| POST   | `/exports`              | `ExportFormValues`   | `{ export: { id, status: 'pending' } }` |
| GET    | `/exports/:id/download` | -                    | Binary file stream                      |

### Hooks

- `useExports(filters)` -- `useQuery(['exports', filters])`
- `useCreateExport()` -- `useMutation`, invalidates `['exports']`, toast "Dang tao bao cao..."
- `useDownloadExport(id)` -- triggers file download via `window.open` or `<a download>`
- `useExportRealtime()` -- Socket `/exports` namespace. On `export:progress`: update status. On `export:ready`: toast "Bao cao da san sang" with download link.

### States

- **Loading:** DataTable skeleton
- **Empty:** FileDown icon + "Chua co bao cao nao" + Button "Tao bao cao"
- **Processing:** Spinner animation in status cell

---

## 13. Notification Center (`features/notifications`)

**User Story:** As a user, I want a central place to view all system notifications and manage read status.

### UI Components

**NotificationList** -- List of notification items. Each item: type icon (Bell for alert, Cpu for device, Route for trip, Settings for system), title (bold if unread), message, relative timestamp. Click marks as read and navigates to relevant page.
**NotificationFilters** -- Tabs: All / Unread / By type (alert, device, trip, system)
**NotificationBadge** -- In SiteHeader, Bell icon with unread count badge. Opens dropdown with latest 5 notifications + "Xem tat ca" link to `/notifications`.

### API Endpoints

| Method | Path                      | Request                 | Response                                            |
| ------ | ------------------------- | ----------------------- | --------------------------------------------------- |
| GET    | `/notifications`          | `?read&type&page&limit` | `{ notifications: [...], pagination, unreadCount }` |
| PUT    | `/notifications/:id/read` | -                       | `{ success }`                                       |
| PUT    | `/notifications/read-all` | -                       | `{ success }`                                       |

### Hooks

- `useNotifications(filters)` -- `useQuery(['notifications', filters])`
- `useUnreadCount()` -- `useQuery(['notifications', 'unread-count'])`, lightweight query for badge
- `useMarkAsRead()` -- `useMutation`, optimistic update via `setQueryData`
- `useMarkAllAsRead()` -- `useMutation`, invalidates `['notifications']`
- `useNotificationRealtime()` -- Socket `/notifications` namespace. On `notification:new`: prepend to list, increment unread count, show toast. On `notification:count`: update badge count.

### States

- **Loading:** Skeleton list (5 items)
- **Empty:** BellRing icon + "Khong co thong bao nao"
- **Empty (filtered):** "Khong co thong bao phu hop voi bo loc"

---

## 14. Settings (`features/settings`)

**User Story:** As a user, I want to manage my profile, change my password, configure notification preferences, and set my preferred theme.

### UI Components

**SettingsPage** -- Tabs component with 4 tabs:

**Tab 1: Profile** (`features/settings/components/profile-form.tsx`)
- Display section: Avatar (Avatar component), full name, email, phone, role (readonly Badge)
- Editable fields: `fullName` (Input), `email` (Input), `phone` (Input)
- Save button with loading state

**Tab 2: Password** (`features/settings/components/password-form.tsx`)
- Fields: `currentPassword`, `newPassword`, `confirmPassword` (all Input type=password with toggle)
- Password strength indicator: bar that fills green as requirements met (min 8, uppercase, lowercase, number, special char)
- Requirements checklist below input with check/cross icons
- Save button

**Tab 3: Notifications** (`features/settings/components/notification-prefs.tsx`)
- Grid of toggle switches organized by notification type and channel:
  - Rows: Critical Alerts, High Alerts, Medium/Low Alerts, Device Status Changes, Trip Events, Maintenance Reminders, System Updates
  - Columns: Push, Email, SMS
- Each cell is a Switch component
- Auto-save on toggle change (debounced 500ms)

**Tab 4: Appearance** (`features/settings/components/theme-selector.tsx`)
- Theme cards: click to select (bordered card with preview colors)
- Dark / Light / System toggle (uses `next-themes` `setTheme`)

### Zod Schemas (`lib/validations/settings.schema.ts`)

```typescript
export const profileSchema = z.object({
  fullName: z.string().min(1, 'Ho ten khong duoc de trong').max(100),
  email: z.string().email('Email khong hop le').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui long nhap mat khau hien tai'),
  newPassword: z.string()
    .min(8, 'Mat khau phai co it nhat 8 ky tu')
    .regex(/[A-Z]/, 'Phai co it nhat 1 chu in hoa')
    .regex(/[a-z]/, 'Phai co it nhat 1 chu thuong')
    .regex(/[0-9]/, 'Phai co it nhat 1 chu so')
    .regex(/[^A-Za-z0-9]/, 'Phai co it nhat 1 ky tu dac biet'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mat khau xac nhan khong khop',
  path: ['confirmPassword'],
});

export const notificationPrefsSchema = z.object({
  criticalAlerts: z.object({ push: z.boolean(), email: z.boolean(), sms: z.boolean() }),
  highAlerts: z.object({ push: z.boolean(), email: z.boolean(), sms: z.boolean() }),
  mediumLowAlerts: z.object({ push: z.boolean(), email: z.boolean(), sms: z.boolean() }),
  deviceStatus: z.object({ push: z.boolean(), email: z.boolean(), sms: z.boolean() }),
  tripEvents: z.object({ push: z.boolean(), email: z.boolean(), sms: z.boolean() }),
  maintenanceReminders: z.object({ push: z.boolean(), email: z.boolean(), sms: z.boolean() }),
  systemUpdates: z.object({ push: z.boolean(), email: z.boolean(), sms: z.boolean() }),
});
```

### API Endpoints

| Method | Path                           | Request                            | Response          |
| ------ | ------------------------------ | ---------------------------------- | ----------------- |
| GET    | `/auth/me`                     | -                                  | `{ user }`        |
| PUT    | `/users/profile`               | `{ fullName, email, phone }`       | `{ user }`        |
| PUT    | `/auth/change-password`        | `{ currentPassword, newPassword }` | `{ success }`     |
| GET    | `/users/notification-settings` | -                                  | `{ preferences }` |
| PUT    | `/users/notification-settings` | `NotificationPrefsValues`          | `{ preferences }` |

### Hooks

- `useProfile()` -- reuses `useCurrentUser()` from auth
- `useUpdateProfile()` -- `useMutation`, invalidates `['auth', 'me']`, toast "Cap nhat ho so thanh cong"
- `useChangePassword()` -- `useMutation`, toast "Doi mat khau thanh cong", reset form on success
- `useNotificationSettings()` -- `useQuery(['notification-settings'])`
- `useUpdateNotificationSettings()` -- `useMutation`, debounced, invalidates `['notification-settings']`

### States

- **Loading:** Skeleton for each tab content
- **Error (password):** Alert "Mat khau hien tai khong dung"
- **Success (password):** Toast + form reset

---

## 15. User Management (`features/users`) -- Admin Only

**User Story:** As an admin, I want to manage system users, assign roles, and control access.

### UI Components

**UserColumns** -- Columns: `username`, `fullName`, `email`, `role` (Badge: admin=red, operator=blue, viewer=gray), `status` (Badge: active=green, inactive=gray), last login (relative time), Actions (Edit, Reset Password, Deactivate)
**UserForm** -- Dialog: `username` (Input, disabled on edit), `fullName`, `email`, `phone`, `role` (Select: admin/operator/viewer), `status` (Select: active/inactive)
**UserRoleSelect** -- Select component with role descriptions: Admin (full access), Operator (CRUD but no admin), Viewer (read-only)

### Zod Schema (`lib/validations/user.schema.ts`)

```typescript
export const userSchema = z.object({
  username: z.string().min(3, 'Ten dang nhap phai co it nhat 3 ky tu').max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'Chi cho phep chu cai, so va dau gach duoi'),
  fullName: z.string().min(1, 'Ho ten khong duoc de trong').max(100),
  email: z.string().email('Email khong hop le').optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  role: z.enum(['admin', 'operator', 'viewer'], {
    required_error: 'Vui long chon vai tro',
  }),
  status: z.enum(['active', 'inactive']).default('active'),
});
```

### API Endpoints

| Method | Path                        | Request                          | Response                       |
| ------ | --------------------------- | -------------------------------- | ------------------------------ |
| GET    | `/users`                    | `?search&role&status&page&limit` | `{ users: [...], pagination }` |
| GET    | `/users/:id`                | -                                | `{ user }`                     |
| POST   | `/users`                    | `UserFormValues`                 | `{ user }`                     |
| PUT    | `/users/:id`                | `UserFormValues`                 | `{ user }`                     |
| DELETE | `/users/:id`                | -                                | `{ success }`                  |
| POST   | `/users/:id/reset-password` | -                                | `{ temporaryPassword }`        |

### Hooks

- `useUsers(filters)` -- `useQuery(['users', filters])`
- `useCreateUser()` -- `useMutation`, invalidates `['users']`, shows generated password in dialog
- `useUpdateUser()` -- `useMutation`, invalidates `['users']`
- `useDeleteUser()` -- `useMutation`, invalidates `['users']`
- `useResetPassword()` -- `useMutation`, shows temporary password in dialog for admin to share

### Advanced Logic

- **Role-based Access:** Page only accessible by `admin` role. `useRoleAccess('admin')` hook returns redirect if insufficient role.
- **Self-edit Prevention:** Cannot change own role or deactivate own account.
- **Password Reset:** Admin triggers reset, backend generates temp password, shown in modal for admin to communicate to user.

### States

- **Loading:** DataTable skeleton
- **Empty:** UserCog icon + "Chua co nguoi dung nao" + Button "Them nguoi dung"
- **Error:** Alert banner with retry
- **Forbidden:** Redirect to `/dashboard` with toast "Ban khong co quyen truy cap"

---

## 16. System Admin (`features/admin`) — Admin/Root Only

**User Story:** As a system admin, I want to monitor system health, view metrics, query logs with filters, and manage system settings — all in a comprehensive observability dashboard.

### UI Components

**SystemAdminPage** — Layout with sub-navigation tabs: Health, Logs, Metrics, Settings

**SystemHealthCards** (`features/admin/components/system-health-cards.tsx`)
- Grid of cards showing service status:
  - Backend API: health endpoint status + response time
  - PostgreSQL: connection pool status
  - EMQX: broker status + connected devices count
  - VictoriaMetrics: ingestion rate + storage used
- Each card: service name, status indicator (green dot / red dot), key metric, latency ms
- Auto-refresh every 30s

**LogsViewer** (`features/admin/components/logs-viewer.tsx`)
- **Table selector:** dropdown to choose log source: `event_logs`, `validation_errors`, `export_jobs`, `export_audit_log`, `error_code_definitions`
- **Filter bar:** severity multi-select (info/warning/error/critical), time range picker, search input
- **Log entries:** DataTable with columns: timestamp, severity (Badge), source, message (truncated)
- **Expandable rows:** Click row to expand full JSON context in monospace font
- **Auto-refresh toggle:** Checkbox + interval selector (5s/10s/30s)
- **Export button:** Download filtered logs as CSV
- Ref IVM26: `log-viewer.tsx` (15KB)

**QueryBuilder** (`features/admin/components/query-builder.tsx`)
- **Purpose:** Ad-hoc querying of any system table
- **Filter conditions:** Array of `{ field, operator, value }` rows. Add/remove conditions dynamically
- **Operators:** equals, not_equals, contains, greater_than, less_than, in, between
- **Table selector:** Same tables as LogsViewer
- **Execute button:** Runs query, shows results in DataTable below
- **Preset queries dropdown:** Common queries (e.g., "All critical errors today", "Export jobs failed")

```typescript
interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'in' | 'between';
  value: string | number | string[];
}
```

**MetricsExplorer** (`features/admin/components/metrics-explorer.tsx`)
- **Query input:** PromQL-style input for VictoriaMetrics queries
- **Time range selector:** 1h / 6h / 24h / 7d / custom DateRangePicker
- **Preset queries dropdown:** Common metrics (CPU usage, memory, request rate, MQTT messages/sec)
- **Result display:** Toggle between recharts LineChart and raw JSON table
- **recharts chart:** ResponsiveContainer, XAxis (time), YAxis (value), Tooltip, Legend
- **Multiple series support:** Each query result series gets a different color line

**SystemSettingsEditor** (`features/admin/components/system-settings-editor.tsx`)
- Key-value list from `system_settings` table
- Inline edit: click value to edit, Enter to save
- JSON values shown in collapsible code block

### API Endpoints

| Method | Path                          | Request                                     | Response                                             |
| ------ | ----------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| GET    | `/system-admin/health`        | -                                           | `{ services: [{ name, status, latency, details }] }` |
| GET    | `/system-admin/settings`      | -                                           | `{ settings: [{ key, value, description }] }`        |
| PUT    | `/system-admin/settings/:key` | `{ value }`                                 | `{ setting }`                                        |
| POST   | `/system-admin/query`         | `{ table, conditions[], page, limit }`      | `{ data: [...], pagination }`                        |
| POST   | `/victoria/query`             | `{ query, start, end, step }`               | `{ data: [...] }`                                    |
| POST   | `/victoria/logs`              | `{ query, start, end, limit }`              | `{ logs: [...] }`                                    |
| GET    | `/system-admin/logs`          | `?table&severity&from&to&search&page&limit` | `{ logs: [...], pagination }`                        |

### Hooks

- `useSystemHealth()` — `useQuery(['system-health'])`, refetchInterval: 30000
- `useSystemSettings()` — `useQuery(['system-settings'])`
- `useUpdateSystemSetting()` — `useMutation`, invalidates `['system-settings']`
- `useAdminLogs(table, filters)` — `useQuery(['admin-logs', table, filters])`, refetchInterval when auto-refresh enabled
- `useAdminQuery()` — `useMutation` (ad-hoc query execution, returns result directly)
- `useVMQuery()` — `useMutation` (not cached, query is ad-hoc)
- `useVLLogs(query, range)` — `useQuery(['vl-logs', query, range])`, refetchInterval when auto-refresh enabled

### Advanced Logic

- **RBAC:** Page only accessible by admin/root. `useRoleAccess(['admin', 'root'])` hook returns redirect if insufficient role.
- **Query Builder safety:** Limit results to 1000 rows. Show warning if query might be expensive.
- **Logs auto-scroll:** When auto-refresh is enabled and new logs arrive, auto-scroll to bottom if user is at bottom; otherwise show "X new logs" badge.
- **Metrics chart zoom:** User can drag to select time range on chart for zoom. Double-click to reset.

### States

- **Loading:** Skeleton cards + skeleton list
- **Error (service down):** Red status card with error message
- **Forbidden:** Redirect to `/dashboard` with toast "Bạn không có quyền truy cập"

---

## 17. System Status (`features/system-status`) — Admin/Root Only

**User Story:** As an operator, I want to see a real-time dashboard of system health, service status, and key infrastructure metrics at a glance.

### UI Components

**SystemStatusPage** — Dashboard layout with health cards grid + metrics section

**HealthCard** (`features/system-status/components/health-card.tsx`)
- Card showing: service name, status (UP/DOWN/DEGRADED Badge), response time, uptime percentage
- Color: green background (UP), red (DOWN), yellow (DEGRADED)
- Services: Backend API, PostgreSQL, EMQX, VictoriaMetrics, Redis (if applicable)

**MetricCard** (`features/system-status/components/metric-card.tsx`)
- Card showing: metric name, current value, trend indicator (↑↓), sparkline mini-chart (recharts tiny LineChart)
- Metrics: Active Devices, MQTT Messages/sec, API Requests/min, Error Rate, Avg Response Time

**StatusProgress** (`features/system-status/components/status-progress.tsx`)
- Progress bar showing: disk usage, memory usage, CPU usage (percent + colored bar)

**UptimeTimeline** (`features/system-status/components/uptime-timeline.tsx`)
- Horizontal bar per service showing uptime over last 30 days
- Green segments = UP, red = DOWN, yellow = DEGRADED
- Hover for timestamp details

### API Endpoints

| Method | Path              | Request    | Response                                                                   |
| ------ | ----------------- | ---------- | -------------------------------------------------------------------------- |
| GET    | `/system/health`  | -          | `{ services: [{ name, status, latency, uptime }] }`                        |
| GET    | `/system/metrics` | -          | `{ metrics: { activeDevices, mqttRate, apiRate, errorRate, avgLatency } }` |
| GET    | `/system/uptime`  | `?days=30` | `{ uptime: [{ service, segments: [{ from, to, status }] }] }`              |

### Hooks

- `useSystemHealthStatus()` — `useQuery(['system-health-status'])`, refetchInterval: 15000
- `useSystemMetrics()` — `useQuery(['system-metrics'])`, refetchInterval: 10000
- `useSystemUptime(days)` — `useQuery(['system-uptime', days])`

### States

- **Loading:** Skeleton grid (6 cards) + skeleton progress bars
- **All healthy:** All cards green, "Hệ thống hoạt động bình thường" banner
- **Degraded:** Yellow banner "Một số dịch vụ đang chậm"
- **Error:** Red banner "Có dịch vụ đang gặp sự cố"

---

## 18. Simulator (`features/simulator`) — Admin/Root Only

**User Story:** As a developer, I want to simulate device data (GPS coordinates, vibration, speed) to test the system without physical devices.

### UI Components

**SimulatorPage** — Layout with device selector + configuration + controls + preview

**DeviceSelector** (`features/simulator/components/device-selector.tsx`)
- Select existing device or create virtual device
- Shows device status and current data
- Multi-select for batch simulation

**DataConfigurator** (`features/simulator/components/data-configurator.tsx`)
- Form to configure simulation parameters:
  - Route: draw route on mini Leaflet map (waypoints) or select preset route
  - Speed range: min/max (km/h) with slider
  - Vibration pattern: normal/rough/critical with threshold settings
  - Data interval: how often to send data points (1s/5s/10s/30s)
  - Duration: how long to run simulation

**SimulationControls** (`features/simulator/components/simulation-controls.tsx`)
- Start / Pause / Stop / Reset buttons
- Status indicator: Idle / Running (with elapsed time) / Paused / Completed
- Progress bar showing simulation progress

**SimulationPreview** (`features/simulator/components/simulation-preview.tsx`)
- Live preview showing:
  - Mini map with simulated device moving along route
  - Real-time data feed: current position, speed, vibration values
  - recharts LineChart showing generated telemetry data in real-time

### API Endpoints

| Method | Path                 | Request                       | Response                            |
| ------ | -------------------- | ----------------------------- | ----------------------------------- |
| POST   | `/simulator/start`   | `{ deviceId, route, config }` | `{ sessionId, status }`             |
| POST   | `/simulator/stop`    | `{ sessionId }`               | `{ status }`                        |
| POST   | `/simulator/pause`   | `{ sessionId }`               | `{ status }`                        |
| GET    | `/simulator/status`  | `?sessionId`                  | `{ status, elapsed, dataPoints }`   |
| GET    | `/simulator/presets` | -                             | `{ routes: [...], configs: [...] }` |

### Hooks

- `useStartSimulation()` — `useMutation`, toast "Bắt đầu mô phỏng..."
- `useStopSimulation()` — `useMutation`, toast "Dừng mô phỏng"
- `usePauseSimulation()` — `useMutation`
- `useSimulationStatus(sessionId)` — `useQuery(['sim-status', sessionId])`, refetchInterval: 2000 when running
- `useSimulationPresets()` — `useQuery(['sim-presets'])`
- `useSimulationRealtime(sessionId)` — Socket listener for simulated data preview

### States

- **Idle:** Configuration form shown, Start button active
- **Running:** Controls show Pause/Stop, preview shows live data
- **Paused:** Resume button replaces Start
- **Completed:** Summary stats shown, "Chạy lại" button

---

## 19. Statistics & Reports (`features/statistics`)

**User Story:** As a fleet manager, I want to view comprehensive statistics about fleet utilization, device uptime, trip summaries, and alert trends to make data-driven decisions.

### UI Components

**StatisticsPage** — Dashboard layout with summary cards + charts grid

**StatisticsSummary** (`features/statistics/components/statistics-summary.tsx`)
- Summary cards row: Total trips, Total distance (km), Average speed, Total runtime (hours), Alert count, Fleet utilization %

**FleetUtilizationChart** (`features/statistics/components/fleet-utilization-chart.tsx`)
- recharts BarChart: X-axis = vehicles/devices, Y-axis = utilization % (runtime/total time)
- Color gradient: low utilization (gray) → high utilization (green)
- Horizontal reference line at target utilization (e.g., 80%)

**DeviceUptimeChart** (`features/statistics/components/device-uptime-chart.tsx`)
- recharts BarChart: X-axis = devices, Y-axis = uptime hours per period
- Stacked bars: running (green), stopped (gray), error (red)
- Period selector: day/week/month

**TripSummaryChart** (`features/statistics/components/trip-summary-chart.tsx`)
- recharts AreaChart: trips per day over selected period
- Tooltip: date, trip count, total distance

**AlertTrendChart** (`features/statistics/components/alert-trend-chart.tsx`)
- recharts StackedBarChart: alert count by severity per day
- Colors: critical=red, high=orange, medium=yellow, low=blue

**DateRangeFilter** (`features/statistics/components/date-range-filter.tsx`)
- DateRangePicker affecting all charts on page
- Presets: Last 7 days, Last 30 days, Last 90 days, This month, Custom

### API Endpoints

| Method | Path                            | Request                            | Response                                                      |
| ------ | ------------------------------- | ---------------------------------- | ------------------------------------------------------------- |
| GET    | `/statistics/summary`           | `?from&to`                         | `{ trips, distance, avgSpeed, runtime, alerts, utilization }` |
| GET    | `/statistics/fleet-utilization` | `?from&to`                         | `{ data: [{ deviceId, name, utilization }] }`                 |
| GET    | `/statistics/device-uptime`     | `?from&to&period=day\|week\|month` | `{ data: [{ deviceId, name, running, stopped, error }] }`     |
| GET    | `/statistics/trip-summary`      | `?from&to`                         | `{ data: [{ date, count, distance }] }`                       |
| GET    | `/statistics/alert-trend`       | `?from&to`                         | `{ data: [{ date, critical, high, medium, low }] }`           |

### Hooks

- `useStatisticsSummary(from, to)` — `useQuery(['stats-summary', from, to])`
- `useFleetUtilization(from, to)` — `useQuery(['stats-fleet', from, to])`
- `useDeviceUptime(from, to, period)` — `useQuery(['stats-uptime', from, to, period])`
- `useTripSummary(from, to)` — `useQuery(['stats-trips', from, to])`
- `useAlertTrend(from, to)` — `useQuery(['stats-alerts', from, to])`

### States

- **Loading:** Skeleton cards (6) + skeleton charts (4)
- **Empty (no data in range):** BarChart3 icon + "Không có dữ liệu thống kê cho khoảng thời gian này"
- **Error:** Alert banner with retry

---

## Shared Patterns Reference

### Common Types (`types/index.ts`)

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

### Empty State Pattern (`components/common/empty-state.tsx`)

```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### DataTable Filters Pattern

Every list page uses `DataTableToolbar` with:
- Search input (debounced 300ms, searches by `searchKey` column)
- Status filter (FacetedFilter component with checkbox options)
- Date range filter (where applicable)
- Reset filters button (visible when any filter active)

### Mutation Pattern (All CRUD hooks)

```typescript
// Pattern for all create/update/delete mutations
useMutation({
  mutationFn: (data) => apiClient.post('/endpoint', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entity'] });
    toast.success('Thao tac thanh cong');
    onOpenChange(false); // close dialog
  },
  onError: (error: ApiError) => {
    toast.error(error.error?.message || 'Co loi xay ra');
  },
});
```

### Real-time Integration Pattern

```typescript
// Pattern for all Socket.IO hooks
function useEntityRealtime() {
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handler = (data: EventPayload) => {
      queryClient.invalidateQueries({ queryKey: ['entity'] });
      // or optimistic: queryClient.setQueryData(...)
    };

    socket.on('event:name', handler);
    return () => { socket.off('event:name', handler); };
  }, [socket, isConnected, queryClient]);
}
```
