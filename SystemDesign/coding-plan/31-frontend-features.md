# Frontend Features Specification

> Complete feature specifications for every module of the IoT Vehicle Tracking System frontend.
> Each section defines UI components, API hooks, Zod schemas, states, and business logic.
> Agents MUST implement every feature described here. NO placeholders, NO "Coming Soon", NO "TODO".

---

## Feature Modules Overview

| # | Feature | Route | Priority | Real-time |
|---|---------|-------|----------|-----------|
| 1 | auth | `/login` | P0 | No |
| 2 | dashboard | `/dashboard` | P0 | Yes (`/dashboard` namespace) |
| 3 | vehicles | `/vehicles` | P0 | No |
| 4 | devices | `/devices` | P0 | Yes (`/devices` namespace) |
| 5 | customers | `/customers` | P1 | No |
| 6 | trips | `/trips`, `/trips/[id]` | P1 | No |
| 7 | alerts | `/alerts` | P1 | Yes (`/dashboard` namespace) |
| 8 | geofences | `/geofences` | P2 | No |
| 9 | maintenance | `/maintenance` | P2 | No |
| 10 | map | `/map` | P0 | Yes (`/devices` namespace) |
| 11 | firmware | `/firmware` | P2 | Yes (`/firmware` namespace) |
| 12 | exports | `/exports` | P2 | Yes (`/exports` namespace) |
| 13 | notifications | `/notifications` | P1 | Yes (`/notifications` namespace) |
| 14 | settings | `/settings` | P1 | No |
| 15 | users | `/admin/users` | P1 | No |
| 16 | admin | `/admin/system` | P2 | No |

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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | `/auth/login` | `{ username, password }` | `{ user, token, expiresAt }` |
| POST | `/auth/logout` | - | `{ success: true }` |
| GET | `/auth/me` | - | `{ user }` |

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
- ECharts AreaChart showing vehicle activity over last 7 days
- X-axis: dates, Y-axis: active vehicle count
- Tooltip with date and count

**DeviceStatusChart** (`features/dashboard/components/device-status-chart.tsx`)
- ECharts PieChart/DonutChart showing device distribution: running (green), stopped (gray), error (red), offline (yellow)
- Legend below chart with counts

**AlertsSeverityChart** (`features/dashboard/components/alerts-severity-chart.tsx`)
- ECharts BarChart showing alert count by severity over last 7 days
- Stacked bars: critical (red), high (orange), medium (yellow), low (blue)

**ActivityFeed** (`features/dashboard/components/activity-feed.tsx`)
- Scrollable list of recent events (max 20)
- Each item: icon (by event type), description text, relative timestamp (date-fns `formatDistanceToNow`)
- Event types: device online/offline, alert triggered, trip started/ended
- Real-time: new events prepended via Socket

**QuickActions** (`features/dashboard/components/quick-actions.tsx`)
- Row of action buttons: "Xem bản đồ" (link to `/map`), "Thêm phương tiện" (link to `/vehicles`), "Xem cảnh báo" (link to `/alerts`)

### API Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/dashboard/stats` | - | `{ totalVehicles, activeDevices, activeAlerts, tripsToday, trends }` |
| GET | `/dashboard/vehicle-activity` | `?days=7` | `{ data: [{ date, count }] }` |
| GET | `/dashboard/device-status` | - | `{ running, stopped, error, offline }` |
| GET | `/dashboard/alerts-summary` | `?days=7` | `{ data: [{ date, critical, high, medium, low }] }` |
| GET | `/dashboard/activity-feed` | `?limit=20` | `{ data: [{ id, type, message, timestamp }] }` |

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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/vehicles` | `?search&status&page&limit` | `{ vehicles: [...], pagination }` |
| GET | `/vehicles/:id` | - | `{ vehicle }` |
| POST | `/vehicles` | `VehicleFormValues` | `{ vehicle }` |
| PUT | `/vehicles/:id` | `VehicleFormValues` | `{ vehicle }` |
| DELETE | `/vehicles/:id` | - | `{ success }` |

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

**User Story:** As a technician, I want to manage IoT devices, send commands, view telemetry, and update firmware remotely.

### UI Components

**DeviceColumns** (`features/devices/components/device-columns.tsx`)
- Columns: `deviceId`, `deviceName`, `deviceType` (Badge), `imei`, `currentStatus` (Badge: running=green, stopped=gray, error=red, disconnected=yellow), vehicle plate (link or "-"), `lastSeenAt` (relative time), Actions dropdown (View, Edit, Delete)

**DeviceForm** (`features/devices/components/device-form.tsx`)
- Dialog with fields: `deviceId` (Input, disabled on edit), `deviceName` (Input), `deviceType` (Select: gps_tracker/obd2/hybrid), `imei` (Input), `simNumber` (Input), `firmwareVersion` (Input readonly), `config` (JSON editor textarea), `notes` (Textarea)

**DeviceDetailModal** (`features/devices/components/device-detail-modal.tsx`)
- Sheet with Tabs component (5 tabs):
  - **Tab "Thong tin":** All device fields displayed as label-value pairs
  - **Tab "Telemetry":** Real-time ECharts line charts for speed, fuel level, RPM. Data from VictoriaMetrics via `GET /telemetry/history`
  - **Tab "Phien":** DataTable of `device_sessions` (start, end, uptime, data points)
  - **Tab "Lenh":** Terminal-like command console. Dropdown to select command (REBOOT, SET_INTERVAL, GET_CONFIG, LOCK_ENGINE, UNLOCK_ENGINE). Params input. Send button. Response log area showing command history with status badges (sent/received/executed/failed)
  - **Tab "Loi":** DataTable of error logs from `event_logs` filtered by device

**DeviceSessionTable** (`features/devices/components/device-session-table.tsx`)
- Columns: Session ID, Status, Start Time, End Time, Uptime, Data Points, Avg Vibration

**DeviceTelemetryTab** (`features/devices/components/device-telemetry-tab.tsx`)
- Date range picker (last 1h / 6h / 24h / 7d / custom)
- ECharts multi-line chart: speed, fuel, RPM on dual Y-axes
- Auto-refresh toggle when viewing recent data

**DeviceCommandsTab** (`features/devices/components/device-commands-tab.tsx`)
- Command selector (Select), params editor (JSON Input), Send button
- Command history list with: command name, timestamp, status badge, response payload
- Optimistic UI: show "Pending" immediately, update on Socket `command:ack`

### Zod Schema (`lib/validations/device.schema.ts`)

```typescript
export const deviceSchema = z.object({
  deviceId: z.string().min(1, 'Ma thiet bi khong duoc de trong')
    .max(50).regex(/^[A-Z0-9_]+$/, 'Chi cho phep ky tu in hoa, so va dau gach duoi'),
  deviceName: z.string().min(1, 'Ten thiet bi khong duoc de trong').max(100),
  deviceType: z.enum(['gps_tracker', 'obd2', 'hybrid'], {
    required_error: 'Vui long chon loai thiet bi',
  }),
  imei: z.string().max(20).optional(),
  simNumber: z.string().max(20).optional(),
  config: z.record(z.unknown()).optional(),
  notes: z.string().max(500).optional(),
});

export const commandSchema = z.object({
  command: z.enum(['REBOOT', 'SET_INTERVAL', 'GET_CONFIG', 'LOCK_ENGINE', 'UNLOCK_ENGINE']),
  params: z.record(z.unknown()).optional(),
  timeout: z.number().min(5000).max(60000).default(30000),
});
```

### API Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/device` | `?search&status&page&limit` | `{ devices: [...], pagination }` |
| GET | `/device/:id` | - | `{ device }` |
| POST | `/device` | `DeviceFormValues` | `{ device }` |
| PUT | `/device/:id` | `DeviceFormValues` | `{ device }` |
| DELETE | `/device/:id` | - | `{ success }` |
| GET | `/device/:id/sessions` | `?page&limit` | `{ sessions: [...], pagination }` |
| POST | `/devices/:id/command` | `{ command, params, timeout }` | `{ commandId, status }` |
| GET | `/telemetry/history` | `?deviceId&from&to&fields` | `{ points: [...] }` |

### Hooks

- `useDevices(filters)` -- `useQuery(['devices', filters])`
- `useDeviceDetail(id)` -- `useQuery(['devices', id], { enabled: !!id })`
- `useCreateDevice()` -- `useMutation`, invalidates `['devices']`
- `useUpdateDevice()` -- `useMutation`, invalidates `['devices']` + `['devices', id]`
- `useDeleteDevice()` -- `useMutation`, invalidates `['devices']`
- `useDeviceSessions(deviceId, filters)` -- `useQuery(['device-sessions', deviceId, filters])`
- `useSendCommand()` -- `useMutation` calling `POST /devices/:id/command`
- `useTelemetryHistory(deviceId, from, to, fields)` -- `useQuery(['telemetry', deviceId, from, to])`
- `useDeviceRealtime()` -- Socket `/devices` namespace. Listens to `device:status`, `device:position`. Updates query cache.

### States

- **Loading:** DataTable skeleton (5 rows)
- **Empty:** Cpu icon + "Chua co thiet bi nao" + Button "Them thiet bi"
- **Error:** Alert banner with retry
- **Command pending:** Spinner + "Dang gui lenh..." badge
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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/customers` | `?search&status&page&limit` | `{ customers: [...], pagination }` |
| GET | `/customers/:id` | - | `{ customer, vehicles: [...], users: [...] }` |
| POST | `/customers` | `CustomerFormValues` | `{ customer }` |
| PUT | `/customers/:id` | `CustomerFormValues` | `{ customer }` |
| DELETE | `/customers/:id` | - | `{ success }` |

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
- **Telemetry Chart:** ECharts synced with map. Lines for speed, fuel, RPM. Brush selection syncs with map view.
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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/trips` | `?vehicleId&status&from&to&page&limit` | `{ trips: [...], pagination }` |
| GET | `/trips/:id` | - | `{ trip, summary }` |
| POST | `/trips` | `TripFormValues` | `{ trip }` |
| GET | `/trips/:id/telemetry` | `?resolution&fields` | `{ points: [...], events: [...] }` |

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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/alerts` | `?severity&status&type&vehicleId&from&to&page&limit` | `{ alerts: [...], pagination }` |
| GET | `/alerts/:id` | - | `{ alert }` |
| PUT | `/alerts/:id/acknowledge` | - | `{ alert }` |
| PUT | `/alerts/:id/resolve` | `{ resolutionNotes }` | `{ alert }` |
| PUT | `/alerts/:id/dismiss` | - | `{ alert }` |

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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/geofences` | `?search&isActive&page&limit` | `{ geofences: [...], pagination }` |
| GET | `/geofences/:id` | - | `{ geofence, vehicles: [...] }` |
| POST | `/geofences` | `GeofenceFormValues` | `{ geofence }` |
| PUT | `/geofences/:id` | `GeofenceFormValues` | `{ geofence }` |
| DELETE | `/geofences/:id` | - | `{ success }` |
| PUT | `/geofences/:id/toggle` | `{ isActive }` | `{ geofence }` |
| PUT | `/geofences/:id/vehicles` | `{ vehicleIds: number[] }` | `{ success }` |

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
- ECharts line chart projecting when vehicle reaches next service mileage
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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/maintenance` | `?vehicleId&status&from&to&page&limit` | `{ records: [...], pagination }` |
| GET | `/maintenance/:id` | - | `{ record }` |
| POST | `/maintenance` | `MaintenanceFormValues` | `{ record }` |
| PUT | `/maintenance/:id` | `MaintenanceFormValues` | `{ record }` |
| DELETE | `/maintenance/:id` | - | `{ success }` |
| GET | `/stats/maintenance` | - | `{ overdue, dueSoon, upcoming, vehicles: [...] }` |

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

**User Story:** As a monitor, I want to see all vehicles on a real-time map with clustering, geofence overlays, and vehicle details.

### UI Components

**MapPage** -- Full-height layout (`h-[calc(100dvh-52px)]`) with sidebar + map. No PageContainer header (map is fullscreen).

**MapView** (`components/map/map-view.tsx`)
- Leaflet MapContainer with TileLayer (OpenStreetMap)
- Dynamic import with `{ ssr: false }`
- Layer switcher: Street / Satellite toggle (TileLayer swap)

**VehicleMarker** (`components/map/vehicle-marker.tsx`)
- Custom `L.divIcon` with vehicle icon, rotated by heading
- Color by status: green (running), gray (stopped), red (error), yellow (offline)
- Popup: vehicle plate, speed, last update time, "Xem chi tiet" link
- Click: sets `selectedVehicleId` in Zustand map store

**GeofenceLayer** (`components/map/geofence-layer.tsx`)
- Renders Circle and Polygon layers from geofence data
- Semi-transparent fill with colored border (green=active, gray=inactive)
- Tooltip with geofence name
- Visibility toggled from sidebar

**MapSidebar** (`components/map/map-sidebar.tsx`)
- **Vehicle List Tab:** Searchable list of vehicles with status badge. Click to `flyTo` marker.
- **Geofence Tab:** List with toggle switches for visibility on map.
- **Selected Vehicle Card:** When a vehicle is selected, shows: plate, speed, heading (compass), coordinates, last update time, "Ghost trail" toggle, link to vehicle detail page.

**MapToolbar** -- Floating buttons on map: Follow Mode (auto-pan to selected vehicle), Show/Hide Geofences, Fit All Bounds

### Zustand Map Store (`lib/store/map-store.ts`)

```typescript
interface MapState {
  selectedVehicleId: string | null;
  showGeofences: boolean;
  followMode: boolean;
  setSelectedVehicle: (id: string | null) => void;
  toggleGeofences: () => void;
  toggleFollowMode: () => void;
}
```

### API Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/devices/positions` | `?status` | `{ data: [{ id, lat, lon, spd, hdg, ts, s }] }` |
| GET | `/geofences` | `?isActive=true` | `{ geofences: [...] }` |

### Hooks

- `useDevicePositions()` -- `useQuery(['device-positions'])`, refetchInterval: 30000 (fallback polling). Disabled when Socket is connected.
- `useMapRealtime()` -- Socket `/devices` namespace. On `device:position`: throttle updates to 500ms, update positions via `setQueryData(['device-positions'])`. On `device:status`: update status badge.

### Advanced Logic

- **List-Map Sync:** `selectedVehicleId` in Zustand. List click calls `map.flyTo(lat, lon, 16)`. Marker click scrolls sidebar list to row and highlights it.
- **Clustering:** `react-leaflet-cluster`. Custom cluster icon: count badge + color (red if any vehicle in cluster has error, green otherwise). Disabled at zoom >= 14.
- **Ghost Trail:** When vehicle is selected and ghost trail enabled, show last 5 positions as fading polyline with direction arrows.
- **Canvas Rendering:** For history trails > 1000 points, use `L.canvas()` renderer.
- **Throttling:** Buffer incoming Socket events. Flush to React state at max 2Hz (every 500ms) to prevent UI thread blocking.
- **Follow Mode:** When enabled, map auto-pans to selected vehicle on every position update.

### States

- **Loading:** Map skeleton (gray rectangle) + sidebar skeleton
- **Empty (no vehicles):** Map rendered but empty. Sidebar shows "Khong co phuong tien nao"
- **Error (socket):** Floating banner "Mat ket noi real-time. Dang thu ket noi lai..."

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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/firmware` | `?type&version` | `{ data: [...] }` |
| GET | `/firmware/:id` | - | `{ firmware }` |
| POST | `/firmware` | Multipart (file + version + description) | `{ firmware }` |
| DELETE | `/firmware/:id` | - | `{ success }` |
| PUT | `/firmware/:id/activate` | - | `{ firmware }` |
| POST | `/firmware/:id/assign` | `{ deviceIds, strategy, batchSize }` | `{ jobId }` |
| GET | `/firmware/:id/devices` | - | `{ devices: [{ deviceId, status, progress }] }` |

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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/exports` | `?status&page&limit` | `{ exports: [...], pagination }` |
| POST | `/exports` | `ExportFormValues` | `{ export: { id, status: 'pending' } }` |
| GET | `/exports/:id/download` | - | Binary file stream |

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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/notifications` | `?read&type&page&limit` | `{ notifications: [...], pagination, unreadCount }` |
| PUT | `/notifications/:id/read` | - | `{ success }` |
| PUT | `/notifications/read-all` | - | `{ success }` |

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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/auth/me` | - | `{ user }` |
| PUT | `/users/profile` | `{ fullName, email, phone }` | `{ user }` |
| PUT | `/auth/change-password` | `{ currentPassword, newPassword }` | `{ success }` |
| GET | `/users/notification-settings` | - | `{ preferences }` |
| PUT | `/users/notification-settings` | `NotificationPrefsValues` | `{ preferences }` |

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

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/users` | `?search&role&status&page&limit` | `{ users: [...], pagination }` |
| GET | `/users/:id` | - | `{ user }` |
| POST | `/users` | `UserFormValues` | `{ user }` |
| PUT | `/users/:id` | `UserFormValues` | `{ user }` |
| DELETE | `/users/:id` | - | `{ success }` |
| POST | `/users/:id/reset-password` | - | `{ temporaryPassword }` |

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

## 16. System Admin (`features/admin`) -- Admin Only

**User Story:** As a system admin, I want to monitor system health, view metrics, and query logs.

### UI Components

**SystemHealthCards** -- Grid of cards showing service status:
- Backend API: health endpoint status + response time
- PostgreSQL: connection pool status
- EMQX: broker status + connected devices count
- VictoriaMetrics: ingestion rate + storage used
- Each card: service name, status indicator (green dot / red dot), key metric

**VictoriaMetricsViewer** (`features/admin/components/vm-query-viewer.tsx`)
- Query input (Input), time range selector, Execute button
- Results displayed as ECharts line chart or raw JSON table
- Predefined query templates dropdown

**VictoriaLogsViewer** (`features/admin/components/vl-log-viewer.tsx`)
- Search input with query syntax
- Log entries displayed in monospace font, color-coded by severity
- Time range filter, auto-refresh toggle (5s interval)
- Click log entry to expand details (JSON context)

**SystemSettingsEditor** (`features/admin/components/system-settings-editor.tsx`)
- Key-value list from `system_settings` table
- Inline edit: click value to edit, Enter to save
- JSON values shown in collapsible code block

### API Endpoints

| Method | Path | Request | Response |
|--------|------|---------|----------|
| GET | `/system-admin/health` | - | `{ services: [{ name, status, latency, details }] }` |
| GET | `/system-admin/settings` | - | `{ settings: [{ key, value, description }] }` |
| PUT | `/system-admin/settings/:key` | `{ value }` | `{ setting }` |
| POST | `/victoria/query` | `{ query, start, end, step }` | `{ data: [...] }` |
| POST | `/victoria/logs` | `{ query, start, end, limit }` | `{ logs: [...] }` |

### Hooks

- `useSystemHealth()` -- `useQuery(['system-health'])`, refetchInterval: 30000
- `useSystemSettings()` -- `useQuery(['system-settings'])`
- `useUpdateSystemSetting()` -- `useMutation`, invalidates `['system-settings']`
- `useVMQuery()` -- `useMutation` (not cached, query is ad-hoc)
- `useVLLogs(query, range)` -- `useQuery(['vl-logs', query, range])`, refetchInterval when auto-refresh enabled

### States

- **Loading:** Skeleton cards + skeleton list
- **Error (service down):** Red status card with error message
- **Forbidden:** Same as User Management

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
