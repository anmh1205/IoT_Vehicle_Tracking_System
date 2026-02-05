# Frontend Detailed Implementation Plan

> Kế hoạch chi tiết để implement frontend - ĐÁNH GIÁ THỰC TẾ sau khi đọc kỹ code

---

## 1. ĐÁNH GIÁ THỰC TẾ (Sau Audit Chi Tiết)

### 1.1 Tổng Quan

| Metric | Kết Quả THỰC TẾ |
|--------|-----------------|
| **Tổng thể hoạt động** | 🔴 **~40%** (không phải 87% như đánh giá sơ bộ) |
| **Pages có API thực** | ⚠️ 8/16 pages (nhưng nhiều page có bug/thiếu logic) |
| **Pages 100% non-functional** | ❌ 4 pages (settings, firmware, users, notifications) |
| **Real-time integration** | ❌ Hook có nhưng KHÔNG được sử dụng |
| **GPS/Location** | ❌ 100% FAKE (random coordinates) |

### 1.2 Phân Tích Chi Tiết Từng Page

| Page | API | Logic | Real Data | Đánh giá |
|------|-----|-------|-----------|----------|
| `dashboard/page.tsx` | ✅ | ⚠️ | ❌ Chart hardcoded | **70%** |
| `dashboard/map/page.tsx` | ✅ | ⚠️ | ❌ GPS fake/random | **10%** |
| `vehicles/page.tsx` | ✅ | ✅ | ✅ | **85%** |
| `vehicles/[id]/page.tsx` | ✅ | ❌ Bug | ❌ Không load data | **40%** |
| `devices/page.tsx` | ✅ | ✅ | ✅ | **75%** |
| `devices/[id]/page.tsx` | ✅ | ⚠️ | ⚠️ Thiếu telemetry | **50%** |
| `customers/page.tsx` | ✅ | ✅ | ✅ | **80%** |
| `customers/[id]/page.tsx` | ✅ | ⚠️ | ⚠️ Tương tự vehicles | **50%** |
| `trips/page.tsx` | ✅ | ⚠️ | ⚠️ Không có map route | **50%** |
| `alerts/page.tsx` | ✅ | ⚠️ | ✅ | **70%** |
| `violations/page.tsx` | ✅ | ⚠️ | ⚠️ Read-only | **60%** |
| `geofences/page.tsx` | ✅ | ✅ | ✅ | **75%** |
| `geofences/[id]/page.tsx` | ✅ | ⚠️ | ⚠️ Không có map editor | **40%** |
| `maintenance/page.tsx` | ✅ | ✅ | ✅ | **75%** |
| `maintenance/[id]/page.tsx` | ✅ | ⚠️ | ⚠️ Tương tự vehicles | **50%** |
| `settings/page.tsx` | ❌ | ❌ | ❌ 100% UI skeleton | **0%** |

### 1.3 Pages KHÔNG TỒN TẠI

| Page | Priority | Cần implement |
|------|----------|---------------|
| `/dashboard/firmware` | 🟡 High | Upload, assign, list versions |
| `/dashboard/users` | 🟡 High | User management (admin) |
| `/dashboard/notifications` | 🟢 Medium | Notification center |
| `/dashboard/system-admin` | 🟢 Medium | Metrics, logs viewer |

---

## 2. VẤN ĐỀ CRITICAL PHÁT HIỆN

### 2.1 Map Page - GPS Data 100% FAKE

```typescript
// ❌ CURRENT CODE (map/page.tsx line 129-139):
latitude: 10.762622 + (Math.random() - 0.5) * 0.05,  // RANDOM!
longitude: 106.660172 + (Math.random() - 0.5) * 0.05, // RANDOM!
speed: Math.floor(Math.random() * 80),                // RANDOM!
status: Math.random() > 0.3 ? 'moving' : 'stopped',   // RANDOM!
```

**Cần làm:**
- ❌ Xóa hoàn toàn `mockVehicles` và `mockGeofences`
- ✅ Tạo API endpoint `/api/v1/dashboard/device-locations` trả về GPS thực từ VictoriaMetrics
- ✅ Integrate WebSocket cho real-time location updates
- ✅ Hiển thị timestamp "last seen" thực

### 2.2 Vehicle/Device Edit - Bug Không Load Data

```typescript
// ❌ CURRENT CODE (vehicles/[id]/page.tsx line 41-45):
const { isLoading: loadingVehicle } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => api.get(`/vehicles/${vehicleId}`),
    enabled: isEdit && !!vehicleId,
});
// BUG: Fetch data nhưng KHÔNG setFormData!

// ✅ CẦN SỬA:
const { data: vehicleData, isLoading: loadingVehicle } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => api.get(`/vehicles/${vehicleId}`),
    enabled: isEdit && !!vehicleId,
});

useEffect(() => {
    if (vehicleData) {
        setFormData({
            vehicleId: vehicleData.vehicleId,
            plateNumber: vehicleData.plateNumber,
            brand: vehicleData.brand,
            // ... populate all fields
        });
    }
}, [vehicleData]);
```

### 2.3 Dashboard Charts - Data Hardcoded

```typescript
// ❌ CURRENT CODE (dashboard/page.tsx line 88-98):
data: [120, 132, 101, 134, 90, 230, 210], // HARDCODED!

// ✅ CẦN:
const { data: chartData } = useQuery({
    queryKey: ['dashboard', 'activity-chart'],
    queryFn: () => api.get('/dashboard/activity-chart'),
});
```

### 2.4 Settings Page - 100% Non-Functional

```typescript
// ❌ CURRENT: Tất cả buttons/switches không có handler
<Button>Lưu thay đổi</Button>           // No onClick
<Switch />                               // No onChange
<Button>Đổi mật khẩu</Button>           // No onClick
<Input value={...} disabled />           // Cannot edit

// ✅ CẦN: Full implementation với API calls
```

### 2.5 Real-time - Hook Có Nhưng Không Sử Dụng

```typescript
// ❌ CURRENT: use-websocket.ts tồn tại nhưng:
// - Không import vào dashboard
// - Không import vào devices
// - Không import vào alerts
// - Map page import nhưng data vẫn fake

// ✅ CẦN: Integrate WebSocket vào tất cả pages cần real-time
```

---

## 3. KẾ HOẠCH IMPLEMENTATION CHI TIẾT

### Phase 1: CRITICAL FIXES (Ngày 1-3) 🔴

#### 1.1 Fix Vehicle/Device/Customer Edit Pages

| Task | File | Work |
|------|------|------|
| Fix vehicle edit không load data | `vehicles/[id]/page.tsx` | Add useEffect to populate form |
| Fix device edit không load data | `devices/[id]/page.tsx` | Add useEffect to populate form |
| Fix customer edit không load data | `customers/[id]/page.tsx` | Add useEffect to populate form |
| Fix geofence edit không load data | `geofences/[id]/page.tsx` | Add useEffect to populate form |
| Fix maintenance edit không load data | `maintenance/[id]/page.tsx` | Add useEffect to populate form |

**Template fix:**
```typescript
// Add after useQuery:
useEffect(() => {
    if (data) {
        setFormData({
            field1: data.field1 ?? '',
            field2: data.field2 ?? '',
            // ... all fields
        });
    }
}, [data]);
```

#### 1.2 Fix Dashboard Charts

| Task | File | Work |
|------|------|------|
| Create chart data API | Backend | `GET /dashboard/activity-chart` |
| Replace hardcoded data | `dashboard/page.tsx` | useQuery for chart data |
| Add loading state for charts | `dashboard/page.tsx` | Chart skeleton |

#### 1.3 Fix Alerts Error Handling

| Task | File | Work |
|------|------|------|
| Add try/catch to acknowledge | `alerts/page.tsx` | Error handling |
| Add toast feedback | `alerts/page.tsx` | Success/error toast |
| Add useMutation | `alerts/page.tsx` | Proper mutation pattern |

```typescript
// ✅ FIXED:
const acknowledgeMutation = useMutation({
    mutationFn: (id: number) => api.put(`/alerts/${id}/acknowledge`, {}),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
        toast.success('Đã xác nhận cảnh báo');
    },
    onError: (error: any) => {
        toast.error('Không thể xác nhận', { description: error.message });
    },
});
```

---

### Phase 2: MAP & GPS REAL DATA (Ngày 4-6) 🔴

#### 2.1 Backend API cho Device Locations

| Endpoint | Method | Response |
|----------|--------|----------|
| `/dashboard/device-locations` | GET | Array of device với GPS thực |

```typescript
// Response format:
interface DeviceLocation {
    deviceId: string;
    vehicleId: string;
    plateNumber: string;
    latitude: number;      // Từ VictoriaMetrics
    longitude: number;     // Từ VictoriaMetrics
    speed: number;         // Từ VictoriaMetrics
    heading: number;       // Từ VictoriaMetrics
    status: 'running' | 'stopped' | 'disconnected';
    lastSeen: string;      // ISO timestamp
    batteryLevel?: number;
}
```

#### 2.2 Fix Map Page

| Task | Work |
|------|------|
| Xóa mockVehicles | Remove lines 27-87 |
| Xóa mockGeofences | Remove lines 89-106 |
| Xóa random coordinate generation | Remove lines 129-139 |
| Thay API endpoint | `/dashboard/device-locations` |
| Add WebSocket subscription | `useDeviceLocations()` hook |
| Fix geofences query | Use real geofences from API |

#### 2.3 Real-time Location Updates

```typescript
// hooks/realtime/use-device-locations.ts
export function useDeviceLocations() {
    const { socket, isConnected } = useSocket();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.emit('join', 'dashboard');

        socket.on('device.location.updated', (data: DeviceLocation) => {
            queryClient.setQueryData(['device-locations'], (old: DeviceLocation[]) => {
                if (!old) return [data];
                return old.map(d => d.deviceId === data.deviceId ? data : d);
            });
        });

        socket.on('device.status.changed', (data) => {
            queryClient.invalidateQueries({ queryKey: ['device-locations'] });
        });

        return () => {
            socket.emit('leave', 'dashboard');
            socket.off('device.location.updated');
            socket.off('device.status.changed');
        };
    }, [socket, isConnected, queryClient]);
}
```

---

### Phase 3: SETTINGS PAGE (Ngày 7-8) 🔴

#### 3.1 Profile Update

| Feature | API | Work |
|---------|-----|------|
| Edit profile form | `PUT /users/profile` | Enable inputs, add mutation |
| Avatar upload | `POST /users/avatar` | File upload with preview |
| Form validation | Zod | Validate before submit |

```typescript
// Cần implement:
const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileInput) => api.put('/users/profile', data),
    onSuccess: (data) => {
        setUser(data);
        toast.success('Cập nhật thông tin thành công');
    },
});
```

#### 3.2 Password Change

| Feature | API | Work |
|---------|-----|------|
| Change password dialog | `PUT /auth/change-password` | Modal with form |
| Current password verify | Backend | Verify before change |
| Password strength check | Frontend | Real-time validation |

```typescript
// Password change schema:
const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Mật khẩu mới ít nhất 8 ký tự'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu không khớp',
    path: ['confirmPassword'],
});
```

#### 3.3 Notification Settings

| Feature | API | Work |
|---------|-----|------|
| Get current settings | `GET /users/notification-settings` | Load on mount |
| Update settings | `PUT /users/notification-settings` | Save on change |
| Toggle handlers | - | Add onChange to each Switch |

```typescript
// Notification settings type:
interface NotificationSettings {
    emailAlerts: boolean;
    telegramAlerts: boolean;
    smsAlerts: boolean;
    criticalOnly: boolean;
}
```

#### 3.4 Theme Toggle

| Feature | Work |
|---------|------|
| Use next-themes | Already installed |
| Connect buttons to theme | `useTheme()` hook |
| Persist preference | LocalStorage (automatic) |

```typescript
// Theme toggle:
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();

<Button
    variant={theme === 'light' ? 'default' : 'outline'}
    onClick={() => setTheme('light')}
>
    Sáng
</Button>
<Button
    variant={theme === 'dark' ? 'default' : 'outline'}
    onClick={() => setTheme('dark')}
>
    Tối
</Button>
```

---

### Phase 4: DEVICE DETAIL & TELEMETRY (Ngày 9-10) 🟡

#### 4.1 Device Detail Page Enhancements

| Feature | Current | Need |
|---------|---------|------|
| Device info | ✅ Basic form | ✅ OK |
| Device sessions | ❌ Không có | Tab hiển thị session history |
| Device telemetry | ❌ Không có | Real-time telemetry chart |
| Device errors | ❌ Không có | Error log list |
| Device commands | ❌ Không có | Send command UI |

#### 4.2 Telemetry Tab

```typescript
// features/devices/components/device-detail/telemetry-tab.tsx
export function TelemetryTab({ deviceId }: { deviceId: string }) {
    const { telemetry, history } = useDeviceTelemetry(deviceId);

    return (
        <div className="space-y-4">
            {/* Current values */}
            <div className="grid grid-cols-4 gap-4">
                <StatCard label="Tốc độ" value={`${telemetry?.speed ?? 0} km/h`} />
                <StatCard label="Pin trên" value={`${telemetry?.batteryTop ?? 0}V`} />
                <StatCard label="Pin dưới" value={`${telemetry?.batteryBot ?? 0}V`} />
                <StatCard label="Vệ tinh" value={telemetry?.satellites ?? 0} />
            </div>

            {/* History chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Lịch sử telemetry (1 giờ)</CardTitle>
                </CardHeader>
                <CardContent>
                    <TelemetryChart data={history} />
                </CardContent>
            </Card>
        </div>
    );
}
```

#### 4.3 Sessions Tab

```typescript
// API: GET /devices/{id}/sessions
// Hiển thị: Start time, end time, duration, distance, events count
```

#### 4.4 Error Codes Tab

```typescript
// API: GET /devices/{id}/errors
// Hiển thị: Error code, description, timestamp, resolved status
```

---

### Phase 5: TRIPS PAGE ENHANCEMENT (Ngày 11-12) 🟡

#### 5.1 Trip Detail với Route Map

| Feature | Current | Need |
|---------|---------|------|
| Trip list | ✅ Basic | ✅ OK |
| Trip detail | ❌ Không có | Page với route map |
| Route visualization | ❌ Không có | Polyline on map |
| Trip replay | ❌ Không có | Playback animation |
| Stop points | ❌ Không có | Markers cho stops |

#### 5.2 Trip Detail Page

```typescript
// app/dashboard/trips/[id]/page.tsx
export default function TripDetailPage({ params }: { params: { id: string } }) {
    const { data: trip } = useQuery({
        queryKey: ['trip', params.id],
        queryFn: () => api.get(`/trips/${params.id}`),
    });

    const { data: route } = useQuery({
        queryKey: ['trip', params.id, 'route'],
        queryFn: () => api.get(`/trips/${params.id}/route`), // GPS points
    });

    return (
        <div className="grid grid-cols-3 gap-4">
            {/* Trip info */}
            <Card className="col-span-1">
                <TripInfo trip={trip} />
            </Card>

            {/* Route map */}
            <Card className="col-span-2">
                <TripRouteMap route={route} />
            </Card>
        </div>
    );
}
```

---

### Phase 6: GEOFENCE MAP EDITOR (Ngày 13-14) 🟡

#### 6.1 Current vs Needed

| Feature | Current | Need |
|---------|---------|------|
| Create form | ✅ Basic inputs | ❌ Map để vẽ |
| Circle geofence | ❌ Nhập lat/lng | ✅ Click on map + drag radius |
| Polygon geofence | ❌ Không có | ✅ Draw polygon on map |
| Preview | ❌ Không có | ✅ Real-time preview |

#### 6.2 Geofence Map Editor Component

```typescript
// features/geofences/components/geofence-map-editor.tsx
export function GeofenceMapEditor({
    type,
    value,
    onChange
}: {
    type: 'circle' | 'polygon';
    value: GeofenceShape;
    onChange: (value: GeofenceShape) => void;
}) {
    // Leaflet.Draw integration
    return (
        <MapContainer>
            <TileLayer />
            <FeatureGroup>
                <EditControl
                    position="topright"
                    draw={{
                        circle: type === 'circle',
                        polygon: type === 'polygon',
                        marker: false,
                        polyline: false,
                        rectangle: false,
                        circlemarker: false,
                    }}
                    onCreated={(e) => {
                        const layer = e.layer;
                        if (type === 'circle') {
                            onChange({
                                center: layer.getLatLng(),
                                radius: layer.getRadius(),
                            });
                        } else {
                            onChange({
                                coordinates: layer.getLatLngs(),
                            });
                        }
                    }}
                />
            </FeatureGroup>
        </MapContainer>
    );
}
```

---

### Phase 7: NEW PAGES (Ngày 15-20) 🟡

#### 7.1 Firmware Management Page

| Feature | API | Work |
|---------|-----|------|
| Firmware list | `GET /firmware` | Table với versions |
| Upload firmware | `POST /firmware/upload` | File upload |
| Activate version | `PUT /firmware/{id}/activate` | Toggle active |
| Assign to devices | `POST /firmware/assign` | Multi-select devices |
| Delete version | `DELETE /firmware/{id}` | Confirm dialog |
| Progress tracking | WebSocket | Real-time progress bar |

```typescript
// app/dashboard/firmware/page.tsx
export default function FirmwarePage() {
    const { data: firmwareList } = useQuery({
        queryKey: ['firmware'],
        queryFn: () => api.get('/firmware'),
    });

    return (
        <PageContainer>
            <div className="flex justify-between">
                <Heading title="Firmware" />
                <FirmwareUploadDialog />
            </div>

            <FirmwareTable data={firmwareList} />
        </PageContainer>
    );
}
```

#### 7.2 User Management Page (Admin)

| Feature | API | Work |
|---------|-----|------|
| User list | `GET /users` | Table với roles |
| Create user | `POST /users` | Form dialog |
| Edit user | `PUT /users/{id}` | Form dialog |
| Delete user | `DELETE /users/{id}` | Confirm dialog |
| Reset password | `POST /users/{id}/reset-password` | Admin action |
| Role management | - | Dropdown select |

#### 7.3 Notifications Page

| Feature | API | Work |
|---------|-----|------|
| Notification list | `GET /notifications` | List với pagination |
| Mark as read | `PUT /notifications/{id}/read` | Click handler |
| Mark all read | `PUT /notifications/read-all` | Bulk action |
| Delete notification | `DELETE /notifications/{id}` | Swipe to delete |
| Filter by type | Query param | Tab/filter UI |
| Real-time updates | WebSocket | Auto-add new |

#### 7.4 System Admin Page

| Feature | API | Work |
|---------|-----|------|
| VictoriaMetrics query | `GET /system-admin/metrics` | PromQL input + chart |
| VictoriaLogs viewer | `GET /system-admin/logs` | LogsQL input + list |
| System health | `GET /system-admin/health` | Status cards |
| Database stats | `GET /system-admin/db-stats` | Table sizes |
| MQTT stats | `GET /system-admin/mqtt-stats` | Connection info |

---

### Phase 8: REAL-TIME INTEGRATION (Ngày 21-23) 🟡

#### 8.1 Socket Provider Setup

```typescript
// components/providers/socket-provider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/auth-store';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const { token } = useAuthStore();

    useEffect(() => {
        if (!token) return;

        const newSocket = io(process.env.NEXT_PUBLIC_WS_URL!, {
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            auth: { token },
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [token]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
```

#### 8.2 Pages Cần Real-time Integration

| Page | Events | Action |
|------|--------|--------|
| Dashboard | `stats.updated` | Refresh stats cards |
| Map | `device.location.updated` | Update marker position |
| Map | `device.status.changed` | Update marker color |
| Devices | `device.status.changed` | Update status badge |
| Alerts | `alert.new` | Add to list + toast |
| Alerts | `alert.resolved` | Update list |
| Firmware | `firmware.progress` | Update progress bar |
| Notifications | `notification.new` | Add to list + badge |

#### 8.3 Hooks Implementation

```typescript
// hooks/realtime/use-alert-stream.ts
export function useAlertStream() {
    const { socket, isConnected } = useSocket();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.emit('join', 'alerts');

        socket.on('alert.new', (alert: Alert) => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

            toast.warning(alert.title, {
                description: alert.message,
                action: {
                    label: 'Xem',
                    onClick: () => window.location.href = '/dashboard/alerts',
                },
            });
        });

        return () => {
            socket.emit('leave', 'alerts');
            socket.off('alert.new');
        };
    }, [socket, isConnected, queryClient]);
}
```

---

### Phase 9: POLISH & VALIDATION (Ngày 24-26) 🟢

#### 9.1 Form Validation với Zod

| Form | Schema |
|------|--------|
| Vehicle form | vehicleSchema |
| Device form | deviceSchema |
| Customer form | customerSchema |
| Geofence form | geofenceSchema |
| Maintenance form | maintenanceSchema |
| User form | userSchema |
| Profile form | profileSchema |
| Password form | passwordSchema |

```typescript
// lib/validations/vehicle.ts
export const vehicleSchema = z.object({
    vehicleId: z.string()
        .min(1, 'Mã xe là bắt buộc')
        .max(50, 'Mã xe tối đa 50 ký tự')
        .regex(/^[A-Za-z0-9_-]+$/, 'Mã xe chỉ chứa chữ, số, gạch ngang'),
    plateNumber: z.string()
        .min(1, 'Biển số là bắt buộc')
        .max(20, 'Biển số tối đa 20 ký tự'),
    brand: z.string().min(1, 'Hãng xe là bắt buộc'),
    model: z.string().optional(),
    vehicleType: z.enum(['car', 'truck', 'motorcycle', 'bus', 'van']),
    color: z.string().optional(),
    year: z.number().min(1990).max(new Date().getFullYear() + 1).optional(),
    status: z.enum(['active', 'inactive', 'maintenance']),
    notes: z.string().optional(),
});
```

#### 9.2 Loading States

| Component | Loading State |
|-----------|---------------|
| Tables | Skeleton rows |
| Cards | Skeleton cards |
| Forms | Disabled inputs + spinner |
| Charts | Skeleton + shimmer |
| Map | Centered spinner |

#### 9.3 Error Handling

| Error Type | Handler |
|------------|---------|
| 401 Unauthorized | Auto logout + redirect |
| 403 Forbidden | Toast + stay on page |
| 404 Not Found | Not found page |
| 500 Server Error | Error boundary + retry |
| Network Error | Toast + retry button |

#### 9.4 Empty States

| Page | Empty State |
|------|-------------|
| Vehicles | Icon + "Chưa có phương tiện" + Add button |
| Devices | Icon + "Chưa có thiết bị" + Add button |
| Alerts | Icon + "Không có cảnh báo" |
| Trips | Icon + "Chưa có chuyến đi" |

---

## 4. TIMELINE TỔNG HỢP

| Phase | Ngày | Priority | Công việc chính |
|-------|------|----------|-----------------|
| **Phase 1** | 1-3 | 🔴 Critical | Fix edit bugs, charts, error handling |
| **Phase 2** | 4-6 | 🔴 Critical | Map GPS real data, WebSocket |
| **Phase 3** | 7-8 | 🔴 Critical | Settings page full implementation |
| **Phase 4** | 9-10 | 🟡 High | Device detail: telemetry, sessions, errors |
| **Phase 5** | 11-12 | 🟡 High | Trip detail với route map |
| **Phase 6** | 13-14 | 🟡 High | Geofence map editor |
| **Phase 7** | 15-20 | 🟡 High | New pages: firmware, users, notifications, admin |
| **Phase 8** | 21-23 | 🟡 High | Real-time integration toàn bộ |
| **Phase 9** | 24-26 | 🟢 Medium | Validation, loading states, polish |

**Tổng: 26 ngày làm việc (~5 tuần)**

---

## 5. FILE COUNTS

```
Cần tạo mới:
├── app/dashboard/trips/[id]/page.tsx
├── app/dashboard/firmware/page.tsx
├── app/dashboard/users/page.tsx
├── app/dashboard/notifications/page.tsx
├── app/dashboard/system-admin/page.tsx
├── app/dashboard/system-admin/metrics/page.tsx
├── app/dashboard/system-admin/logs/page.tsx
│
├── features/devices/components/telemetry-tab.tsx
├── features/devices/components/sessions-tab.tsx
├── features/devices/components/errors-tab.tsx
├── features/trips/components/trip-route-map.tsx
├── features/geofences/components/geofence-map-editor.tsx
├── features/firmware/components/...
├── features/users/components/...
├── features/notifications/components/...
├── features/system-admin/components/...
│
├── hooks/realtime/use-device-locations.ts
├── hooks/realtime/use-device-telemetry.ts
├── hooks/realtime/use-alert-stream.ts
├── hooks/realtime/use-notification-stream.ts
│
├── lib/validations/*.ts (8 files)
├── lib/api/services/*.ts (nếu refactor)
│
└── components/providers/socket-provider.tsx

Cần sửa:
├── app/dashboard/page.tsx (charts)
├── app/dashboard/map/page.tsx (GPS real data)
├── app/dashboard/vehicles/[id]/page.tsx (load data bug)
├── app/dashboard/devices/[id]/page.tsx (load data + tabs)
├── app/dashboard/customers/[id]/page.tsx (load data bug)
├── app/dashboard/geofences/[id]/page.tsx (map editor)
├── app/dashboard/maintenance/[id]/page.tsx (load data bug)
├── app/dashboard/alerts/page.tsx (error handling)
├── app/dashboard/settings/page.tsx (full rewrite)
└── app/dashboard/layout.tsx (add SocketProvider)

Tổng: ~40 files mới + ~10 files sửa = ~50 files
```

---

## 6. BACKEND DEPENDENCIES

### APIs cần có sẵn trước khi implement frontend:

| Phase | API Endpoint | Priority |
|-------|--------------|----------|
| 2 | `GET /dashboard/device-locations` | 🔴 Critical |
| 2 | `GET /dashboard/activity-chart` | 🔴 Critical |
| 3 | `PUT /users/profile` | 🔴 Critical |
| 3 | `PUT /auth/change-password` | 🔴 Critical |
| 3 | `GET/PUT /users/notification-settings` | 🔴 Critical |
| 4 | `GET /devices/{id}/sessions` | 🟡 High |
| 4 | `GET /devices/{id}/telemetry` | 🟡 High |
| 4 | `GET /devices/{id}/errors` | 🟡 High |
| 5 | `GET /trips/{id}/route` | 🟡 High |
| 7 | `GET/POST/PUT/DELETE /firmware/*` | 🟡 High |
| 7 | `GET/POST/PUT/DELETE /users/*` | 🟡 High |
| 7 | `GET/PUT/DELETE /notifications/*` | 🟡 High |
| 7 | `GET /system-admin/*` | 🟢 Medium |

### WebSocket Events cần có:

| Event | Direction | Data |
|-------|-----------|------|
| `device.location.updated` | Server → Client | DeviceLocation |
| `device.status.changed` | Server → Client | { deviceId, status } |
| `alert.new` | Server → Client | Alert |
| `alert.resolved` | Server → Client | { alertId } |
| `notification.new` | Server → Client | Notification |
| `firmware.progress` | Server → Client | { deviceId, progress } |
| `stats.updated` | Server → Client | DashboardStats |

---

## 7. KẾT LUẬN

### Tình trạng thực tế:
- **~40%** code hoạt động đúng (không phải 87%)
- **60%** cần fix bugs hoặc implement mới
- **GPS/Location** hoàn toàn fake
- **Real-time** chưa được integrate
- **4 pages** không tồn tại

### Ưu tiên:
1. 🔴 **Critical**: Fix bugs existing pages + GPS real data
2. 🟡 **High**: New features cho existing pages + new pages
3. 🟢 **Medium**: Polish, validation, UX improvements

### Timeline:
- **Minimal viable**: 2 tuần (Phase 1-3)
- **Full features**: 5 tuần (Phase 1-9)
