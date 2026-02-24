# EH-5 — Remaining Modules: System Status, Notifications, Simulator, Statistics

> Các module bổ sung chưa có hoặc chỉ có skeleton trong Tracking_Frontend.
> **Deps**: EH-0 (shared hooks/utils)
> Có thể chạy SONG SONG với EH-1 ~ EH-4 sau khi hoàn thành EH-0.

---

## CRITICAL RULES

```
1. ZERO PLACEHOLDER — tất cả components PHẢI functional
2. recharts CHO CHARTS
3. shadcn/ui CHO UI
4. Ref IVM26: E:\anmh1205\ivm26\IVM26_Frontend\frontend_v2\src\features\
```

---

## Part A: System Status & Monitoring

> Trang trạng thái hệ thống: hiển thị health check, metrics, service status.

### Task List

| ID       | Description                            | Files                                                   | Ref IVM26                     |
| -------- | -------------------------------------- | ------------------------------------------------------- | ----------------------------- |
| EH-5A-01 | System status page                     | `app/dashboard/admin/system-status/page.tsx`            | `system-status/`              |
| EH-5A-02 | Health card — service health indicator | `features/system-status/components/health-card.tsx`     | `health-card.tsx` (3,014)     |
| EH-5A-03 | Metric card — system metric display    | `features/system-status/components/metric-card.tsx`     | `metric-card.tsx` (1,834)     |
| EH-5A-04 | Status progress — circular progress    | `features/system-status/components/status-progress.tsx` | `status-progress.tsx` (1,547) |
| EH-5A-05 | Status badge — up/down/degraded        | `features/system-status/components/status-badge.tsx`    | `status-badge.tsx` (778)      |
| EH-5A-06 | System status hooks                    | `features/system-status/hooks/use-system-status.ts`     | —                             |

### Architecture

```
SystemStatusPage
├── PageContainer (pageTitle="Trạng thái hệ thống", RBAC: admin/root)
├── Overview Section
│   ├── HealthCard (API Server — up/down/degraded)
│   ├── HealthCard (MQTT Bridge — up/down)
│   ├── HealthCard (Database — up/down)
│   └── HealthCard (VictoriaMetrics — up/down)
├── Metrics Section (grid-cols-2 md:4)
│   ├── MetricCard (CPU Usage — percentage + progress)
│   ├── MetricCard (Memory Usage — percentage + progress)
│   ├── MetricCard (Disk Usage — percentage + progress)
│   └── MetricCard (Active Connections — count)
└── Service Details (expandable cards)
```

### Backend API

| Endpoint                     | Purpose                         |
| ---------------------------- | ------------------------------- |
| `GET /api/v1/system/health`  | Service health checks           |
| `GET /api/v1/system/metrics` | System metrics (CPU, mem, disk) |

---

## Part B: Notifications Enhancement

> Nâng cấp notification center: thêm filters, stats, mark all read.

### Task List

| ID       | Description                                          | Files                                                        | Ref IVM26                  |
| -------- | ---------------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| EH-5B-01 | Upgrade notification list — add filter, stats header | `features/notifications/components/notification-list.tsx`    | `notification-list.tsx`    |
| EH-5B-02 | Notification filters — type, read/unread, date range | `features/notifications/components/notification-filters.tsx` | `notification-filters.tsx` |
| EH-5B-03 | Notification stats — unread count, by type counts    | `features/notifications/components/notification-stats.tsx`   | `notification-stats.tsx`   |
| EH-5B-04 | Mark all read action                                 | `features/notifications/hooks/use-mark-all-read.ts`          | —                          |
| EH-5B-05 | Notification bell indicator (in header)              | `components/layout/notification-bell.tsx`                    | —                          |

### Backend API

| Endpoint                             | Purpose                |
| ------------------------------------ | ---------------------- |
| `GET /api/v1/notifications`          | Paginated + filterable |
| `PUT /api/v1/notifications/read-all` | Mark all as read       |
| `GET /api/v1/notifications/stats`    | Unread count + by type |

---

## Part C: Simulator Module

> Device simulator: tạo dữ liệu giả lập để test hệ thống.

### Task List

| ID       | Description                                                        | Files                                                   | Ref IVM26                         |
| -------- | ------------------------------------------------------------------ | ------------------------------------------------------- | --------------------------------- |
| EH-5C-01 | Simulator page                                                     | `app/dashboard/simulator/page.tsx`                      | `simulator/`                      |
| EH-5C-02 | Device selector — chọn device(s) để simulate                       | `features/simulator/components/device-selector.tsx`     | `device-selector.tsx` (2,455)     |
| EH-5C-03 | Data configurator — cấu hình data mẫu (speed, location, vibration) | `features/simulator/components/data-configurator.tsx`   | `data-configurator.tsx` (5,816)   |
| EH-5C-04 | Simulation controls — start/stop/pause, interval                   | `features/simulator/components/simulation-controls.tsx` | `simulation-controls.tsx` (4,161) |
| EH-5C-05 | Simulation preview — preview data sẽ gửi                           | `features/simulator/components/simulation-preview.tsx`  | `simulation-preview.tsx` (2,820)  |
| EH-5C-06 | Simulator hooks                                                    | `features/simulator/hooks/use-simulator.ts`             | —                                 |

### Architecture

```
SimulatorPage
├── PageContainer (pageTitle="Simulator", RBAC: admin/root)
├── Left Panel (config)
│   ├── DeviceSelector (multi-select devices)
│   ├── DataConfigurator
│   │   ├── Speed range (min/max sliders)
│   │   ├── Location (lat/lon or path)
│   │   ├── Vibration range
│   │   ├── Battery range
│   │   └── Error codes (optional)
│   └── SimulationControls
│       ├── Interval selector (1s/5s/10s/30s/60s)
│       ├── Duration selector (1m/5m/15m/30m/1h)
│       └── Start/Stop/Pause buttons
└── Right Panel (preview)
    └── SimulationPreview
        ├── JSON preview of next payload
        └── Sent history log
```

### Backend API

| Endpoint                       | Purpose                   |
| ------------------------------ | ------------------------- |
| `POST /api/v1/simulator/start` | Start simulation          |
| `POST /api/v1/simulator/stop`  | Stop simulation           |
| `GET /api/v1/simulator/status` | Current simulation status |

---

## Part D: Statistics & Reports

> Module thống kê tổng quan.

### Task List

| ID       | Description                                  | Files                                                        | Ref IVM26                 |
| -------- | -------------------------------------------- | ------------------------------------------------------------ | ------------------------- |
| EH-5D-01 | Statistics page                              | `app/dashboard/statistics/page.tsx`                          | `statistics/`             |
| EH-5D-02 | Statistics overview — summary cards + charts | `features/statistics/components/statistics-overview.tsx`     | `statistics-overview.tsx` |
| EH-5D-03 | Fleet utilization chart — recharts           | `features/statistics/components/fleet-utilization-chart.tsx` | —                         |
| EH-5D-04 | Device uptime chart — recharts               | `features/statistics/components/device-uptime-chart.tsx`     | —                         |
| EH-5D-05 | Statistics hooks                             | `features/statistics/hooks/use-statistics.ts`                | —                         |

### Architecture

```
StatisticsPage
├── PageContainer (pageTitle="Thống kê & Báo cáo")
├── Summary Cards Row
│   ├── Total Runtime (all devices)
│   ├── Average Uptime %
│   ├── Total Sessions
│   └── Total Alerts
├── Charts Section
│   ├── Fleet Utilization (BarChart — devices vs runtime hours)
│   └── Device Uptime (AreaChart — uptime % over time)
└── Export Section
    └── Button "Xuất báo cáo" → trigger export job
```

### Backend API

| Endpoint                                   | Purpose                |
| ------------------------------------------ | ---------------------- |
| `GET /api/v1/statistics/summary`           | Summary stats          |
| `GET /api/v1/statistics/fleet-utilization` | Fleet utilization data |
| `GET /api/v1/statistics/device-uptime`     | Device uptime data     |

---

## Verification Checklist

### System Status
- [ ] Health cards hiển thị trạng thái từng service
- [ ] Metric cards hiển thị CPU, memory, disk
- [ ] RBAC: chỉ admin/root truy cập được

### Notifications
- [ ] Filter by type hoạt động
- [ ] Mark all read hoạt động
- [ ] Stats header hiển thị đúng counts
- [ ] Bell indicator trong header hiển thị unread count

### Simulator
- [ ] Device selector tìm kiếm + chọn devices
- [ ] Data configurator validate inputs
- [ ] Start/stop simulation hoạt động
- [ ] Preview hiển thị JSON payload

### Statistics
- [ ] Summary cards hiển thị dữ liệu
- [ ] Charts hiển thị dữ liệu thật
- [ ] Export button hoạt động
