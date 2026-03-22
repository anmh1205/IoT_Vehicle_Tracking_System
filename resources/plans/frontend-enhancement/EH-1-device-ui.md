# EH-1 — Device UI Overhaul

> Nâng cấp Device Detail Modal và Device List lên chuẩn IVM26.
> **Deps**: EH-0 (shared hooks/utils)

---

## CRITICAL RULES

```
1. Device Detail PHẢI dùng Dialog (KHÔNG Sheet) — fullscreen 90vw × 90vh
2. Tabs: Tổng quan, Phiên chạy, Mã lỗi, Biểu đồ thời gian, Biểu đồ rung, Cài đặt
3. RBAC: "Biểu đồ rung" chỉ hiện khi canViewSystemInfo, "Cài đặt" chỉ khi canEditDevice  
4. Realtime: subscribe device.status.changed + device.sessions.updated
5. Export: dropdown menu với options (tải toàn bộ, xuất theo thời gian, sessions, error codes)
6. Charts: recharts ONLY
7. Ref IVM26: E:\anmh1205\ivm26\IVM26_Frontend\frontend_v2\src\features\devices\
```

---

## Part A: Device Detail Modal Rewrite

### Task List

| ID       | Description                                                | Files (trong src/features/devices/)                                 | Ref IVM26 (bytes) |
| -------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | ----------------- |
| EH-1A-01 | Tạo thư mục `device-detail-modal/` + barrel `index.tsx`    | `components/device-detail-modal/index.tsx`                          | 23,858            |
| EH-1A-02 | Context provider — tất cả data/handlers cho tabs           | `components/device-detail-modal/modal-context.tsx`                  | 2,431             |
| EH-1A-03 | Container — data fetching layer wrapping context           | `components/device-detail-modal/modal-container.tsx`                | 3,168             |
| EH-1A-04 | Overview tab — device info, runtime stats, realtime data   | `components/device-detail-modal/overview-tab.tsx`                   | 11,049            |
| EH-1A-05 | Sessions tab — session list, load more, vibration dialog   | `components/device-detail-modal/sessions-tab.tsx`                   | 13,061            |
| EH-1A-06 | Error codes tab — table + filter status/type + pagination  | `components/device-detail-modal/error-codes-tab.tsx`                | 8,036             |
| EH-1A-07 | Runtime tab — recharts bar chart with range selector       | `components/device-detail-modal/runtime-tab.tsx`                    | 2,137             |
| EH-1A-08 | Vibration tab — recharts line chart with period selector   | `components/device-detail-modal/vibration-tab.tsx`                  | 2,213             |
| EH-1A-09 | Settings tab — form chỉnh device name, interval, threshold | `components/device-detail-modal/settings-tab.tsx`                   | 15,967            |
| EH-1A-10 | Session vibration chart dialog — xem chi tiết rung 1 phiên | `components/device-detail-modal/session-vibration-chart-dialog.tsx` | 9,142             |
| EH-1A-11 | Empty state component                                      | `components/device-detail-modal/empty-state.tsx`                    | 1,046             |
| EH-1A-12 | Export modal — dialog xuất dữ liệu theo period             | `components/export-modal.tsx`                                       | 3,463             |
| EH-1A-13 | Design constants — gradients, shadows, animations          | `components/device-design-constants.ts`                             | 6,301             |
| EH-1A-14 | Skeletons — loading states                                 | `components/device-skeletons.tsx`                                   | 1,256             |
| EH-1A-15 | Error box — error display                                  | `components/error-box.tsx`                                          | 230               |

### Architecture Pattern (từ IVM26)

```
DeviceDetailModal (Dialog)
├── DialogHeader
│   ├── Status Icon (gradient background)
│   ├── Device Name + Status Badge  
│   └── Export Dropdown Menu
├── Tabs
│   ├── "Tổng quan" → OverviewTab
│   │   ├── Device info grid (IMEI, firmware, customer, etc.)
│   │   ├── Runtime stats cards (today/week/month/quarter/year/total)
│   │   └── Realtime data (vibration, battery, temperature)
│   ├── "Phiên chạy" → SessionsTab
│   │   ├── Session cards list (infinite scroll)
│   │   └── Each card: start/end time, duration, vibration stats
│   │       └── Click → SessionVibrationChartDialog
│   ├── "Mã lỗi" → ErrorCodesTab  
│   │   ├── Filter bar (status: active/resolved, type: all/critical/warning)
│   │   ├── DataTable with pagination
│   │   └── Error code name + description + count + last occurred
│   ├── "Biểu đồ thời gian" → RuntimeTab
│   │   ├── Range selector (7d/30d/90d/1y)
│   │   └── Bar chart (recharts) — runtime hours per day/week
│   ├── "Biểu đồ rung" → VibrationTab (RBAC: canViewSystemInfo)
│   │   ├── Period selector (1h/6h/24h/7d)
│   │   └── Line chart (recharts) — vibration values + threshold line  
│   └── "Cài đặt" → SettingsTab (RBAC: canEditDevice)
│       ├── Name/ID form section
│       ├── Settings form (interval, threshold, etc.)
│       └── Danger zone (delete device)
└── ExportModal (nested dialog)
```

### Key Implementation Notes

**EH-1A-02 modal-context.tsx:**
```typescript
// Tạo React Context chứa tất cả data + handlers
interface DeviceDetailModalContextValue {
  // Data
  detail: DeviceDetail | null;
  loading: boolean;
  error: Error | null;
  
  // Sessions
  sessions: DeviceSession[];
  sessionsLoading: boolean;
  sessionsHasMore: boolean;
  onSessionsLoadMore: () => void;
  
  // Error codes
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

**EH-1A-01 index.tsx — Realtime subscriptions:**
```typescript
// Subscribe to device.status.changed
useRealtimeSubscription<DeviceStatusPayload>({
  event: 'device.status.changed',
  enabled: open && !!deviceId,
  handler: (payload) => {
    if (payload.device_id !== deviceId) return;
    // Update local state for instant UI feedback
    setLocalRealtimeData(/* merge payload */);
    setLocalRuntimeStats(/* merge runtime stats */);
    // Invalidate queries for background refresh
    queryInvalidation.device.all(queryClient, deviceId);
  }
});

// Subscribe to device.sessions.updated  
useRealtimeSubscription<DeviceSessionPayload>({
  event: 'device.sessions.updated',
  enabled: open && !!deviceId,
  handler: (payload) => {
    if (payload.device_id !== deviceId) return;
    queryInvalidation.device.sessions(queryClient, deviceId);
    queryInvalidation.device.detail(queryClient, deviceId);
  }
});
```

---

## Part B: Device List Enhancement

### Task List

| ID       | Description                                                    | Files                                                                                         | Ref IVM26 (bytes) |
| -------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------- |
| EH-1B-01 | Device card — status gradient, runtime, battery info           | `components/device-card.tsx`                                                                  | 6,469             |
| EH-1B-02 | Device grid — responsive grid layout                           | `components/device-grid.tsx`                                                                  | 2,042             |
| EH-1B-03 | Device stats bar — summary counts (total/online/offline/error) | `components/device-stats-bar.tsx`                                                             | 1,213             |
| EH-1B-04 | Upgrade device filters — thêm status, search, sort             | `components/device-filters.tsx`                                                               | 3,333             |
| EH-1B-05 | Stat card — reusable metric card                               | `components/stat-card.tsx`                                                                    | 1,925             |
| EH-1B-06 | Device runtime chart — bar chart for list view                 | `components/device-runtime-chart.tsx`                                                         | 6,061             |
| EH-1B-07 | Device vibration chart — line chart for list view              | `components/device-vibration-chart.tsx`                                                       | 7,641             |
| EH-1B-08 | Mobile device components                                       | `components/mobile-device-content.tsx`, `mobile-device-header.tsx`, `mobile-tab-selector.tsx` | 12,533            |
| EH-1B-09 | Device create modal                                            | `components/device-create-modal.tsx`                                                          | 2,464             |
| EH-1B-10 | Device edit modal                                              | `components/device-edit-modal.tsx`                                                            | 1,829             |
| EH-1B-11 | Device constants — status labels, variants, tab enums          | `components/device-constants.ts`                                                              | 540               |
| EH-1B-12 | Device utils — helper functions                                | `components/device-utils.ts`                                                                  | 151               |
| EH-1B-13 | Index barrel export                                            | `components/index.ts`                                                                         | ~600              |
| EH-1B-14 | Update device page to use new components                       | `app/dashboard/devices/page.tsx`                                                              | —                 |

### Hooks to Create/Update

| Hook                      | File                                  | Purpose                                                     |
| ------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `useDeviceDetail`         | `hooks/use-device-detail.ts`          | Aggregate device detail query (device + runtime + realtime) |
| `useDeviceSessions`       | `hooks/use-device-sessions.ts`        | Paginated sessions query with load-more                     |
| `useDeviceErrorCodes`     | `hooks/use-device-error-codes.ts`     | Paginated error codes with status/type filter               |
| `useDeviceRuntimeChart`   | `hooks/use-device-runtime-chart.ts`   | Runtime chart data by range                                 |
| `useDeviceVibrationChart` | `hooks/use-device-vibration-chart.ts` | Vibration chart data by period                              |
| `useUpdateDeviceNameId`   | `hooks/use-update-device.ts`          | Mutation: update name/ID                                    |
| `useUpdateDeviceSettings` | `hooks/use-update-device-settings.ts` | Mutation: update settings                                   |
| `useDeleteDevice`         | `hooks/use-delete-device.ts`          | Mutation: delete device                                     |

---

## Backend API Requirements

Kiểm tra các endpoints sau tồn tại trong Tracking_Backend:

| Endpoint                                 | Purpose                                        | Cần tạo mới? |
| ---------------------------------------- | ---------------------------------------------- | ------------ |
| `GET /api/v1/device/:id/detail`          | Aggregate detail (device + runtime + realtime) | Kiểm tra     |
| `GET /api/v1/device/:id/sessions`        | Paginated sessions                             | Đã có        |
| `GET /api/v1/device/:id/error-codes`     | Paginated error codes + filter                 | Kiểm tra     |
| `GET /api/v1/device/:id/runtime-chart`   | Runtime chart data by range                    | Kiểm tra     |
| `GET /api/v1/device/:id/vibration-chart` | Vibration chart data by period                 | Kiểm tra     |
| `PUT /api/v1/device/:id/settings`        | Update device settings                         | Kiểm tra     |
| `POST /api/v1/exports`                   | Create export job                              | Kiểm tra     |

---

## Verification Checklist

- [ ] Device Detail Modal mở bằng Dialog (KHÔNG Sheet)
- [ ] Tất cả 6 tabs hiển thị đúng
- [ ] RBAC: viewer KHÔNG thấy tab "Biểu đồ rung" và "Cài đặt"
- [ ] Realtime: status cập nhật khi backend emit event
- [ ] Sessions: load more hoạt động
- [ ] Error codes: filter + pagination hoạt động
- [ ] Runtime chart: thay đổi range cập nhật chart
- [ ] Vibration chart: thay đổi period cập nhật chart
- [ ] Settings: form submit cập nhật backend
- [ ] Export modal: xuất file thành công
- [ ] Device cards: hiển thị status, runtime, battery đúng
- [ ] Mobile: responsive trên màn hình nhỏ
