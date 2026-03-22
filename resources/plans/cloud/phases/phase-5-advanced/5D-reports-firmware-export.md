# Phase 5D — Reports, Firmware, Export, System Status, Simulator & System Admin

> Statistics/Reports (NEW backend endpoints), Firmware management, Export jobs, System Status health, Data Simulator, System Admin.
> FSD: `features/statistics/`, `features/firmware/`, `features/exports/`, `features/system-status/`, `features/simulator/`, `features/system-admin/`

---

## CRITICAL RULES

```
1. Statistics: recharts charts + DateRangePicker + export PDF/CSV. Backend endpoints cần thêm (spec below)
2. Firmware: drag-drop upload .bin, deploy to devices (rolling/all-at-once)
3. Export: create job → poll/socket progress → download
4. System Status: health cards + real-time refresh
5. Simulator: non-production feature, useful cho demo/testing
6. System Admin: admin-only. PromQL/LogsQL query, audit logs
7. All charts: recharts. All tables: DataTable. All text: Vietnamese
```

---

## Task List

| ID     | Description              | Files                                                         |
| ------ | ------------------------ | ------------------------------------------------------------- |
| FE-150 | Statistics page          | `app/dashboard/statistics/page.tsx`                           |
| FE-151 | FleetUsageChart          | `features/statistics/components/fleet-usage-chart.tsx`        |
| FE-152 | DeviceUptimeChart        | `features/statistics/components/device-uptime-chart.tsx`      |
| FE-153 | AlertFrequencyChart      | `features/statistics/components/alert-frequency-chart.tsx`    |
| FE-154 | TripSummaryChart         | `features/statistics/components/trip-summary-chart.tsx`       |
| FE-155 | Statistics API + hooks   | `lib/api/statistics.ts`, `features/statistics/hooks/*.ts`     |
| FE-156 | Report export (PDF/CSV)  | `features/statistics/components/report-export.tsx`            |
| FE-160 | Firmware types           | `features/firmware/types/index.ts`                            |
| FE-161 | Firmware API             | `lib/api/firmware.ts`                                         |
| FE-162 | Firmware hooks           | `features/firmware/hooks/*.ts`                                |
| FE-163 | Firmware page            | `app/dashboard/firmware/page.tsx`                             |
| FE-164 | Firmware columns         | `features/firmware/components/firmware-columns.tsx`           |
| FE-165 | FirmwareUploadForm       | `features/firmware/components/firmware-upload-form.tsx`       |
| FE-166 | FirmwareAssignDialog     | `features/firmware/components/firmware-assign-dialog.tsx`     |
| FE-167 | FirmwareDeployDashboard  | `features/firmware/components/firmware-deploy-dashboard.tsx`  |
| FE-170 | Export types             | `features/exports/types/index.ts`                             |
| FE-171 | Export API               | `lib/api/exports.ts`                                          |
| FE-172 | Export hooks             | `features/exports/hooks/*.ts`                                 |
| FE-173 | Export page              | `app/dashboard/exports/page.tsx`                              |
| FE-174 | Export columns           | `features/exports/components/export-columns.tsx`              |
| FE-175 | ExportForm               | `features/exports/components/export-form.tsx`                 |
| FE-180 | System Status page       | `app/dashboard/system-status/page.tsx`                        |
| FE-181 | ComponentHealthCard      | `features/system-status/components/component-health-card.tsx` |
| FE-182 | System Status API        | `lib/api/system-status.ts`                                    |
| FE-183 | MetricCard (sparkline)   | `features/system-status/components/metric-card.tsx`           |
| FE-184 | StatusProgress (CPU/mem) | `features/system-status/components/status-progress.tsx`       |
| FE-185 | UptimeTimeline           | `features/system-status/components/uptime-timeline.tsx`       |
| FE-186 | System Status hooks (3)  | `features/system-status/hooks/*.ts`                           |
| FE-190 | Simulator page           | `app/dashboard/simulator/page.tsx`                            |
| FE-191 | DeviceSelector           | `features/simulator/components/device-selector.tsx`           |
| FE-192 | DataConfigurator         | `features/simulator/components/data-configurator.tsx`         |
| FE-193 | SimulationControls       | `features/simulator/components/simulation-controls.tsx`       |
| FE-194 | SimulationPreview        | `features/simulator/components/simulation-preview.tsx`        |
| FE-195 | Simulator hooks + API    | `features/simulator/hooks/*.ts`, `lib/api/simulator.ts`       |
| FE-195 | System Admin page        | `app/dashboard/system-admin/page.tsx`                         |
| FE-196 | HealthDashboard          | `features/system-admin/components/health-dashboard.tsx`       |
| FE-197 | MetricsQuery             | `features/system-admin/components/metrics-query.tsx`          |
| FE-198 | LogsQuery                | `features/system-admin/components/logs-query.tsx`             |
| FE-199 | AuditLogViewer           | `features/system-admin/components/audit-log-viewer.tsx`       |

---

## Backend API Contract

```
# Statistics (NEW — cần implement)
GET /api/v1/statistics/fleet-usage       ?from&to&interval=day|week|month → { labels, activeVehicles, inactiveVehicles }
GET /api/v1/statistics/device-uptime     ?from&to → { devices: [{ deviceId, uptimePercent, totalHours, downHours }] }
GET /api/v1/statistics/alert-frequency   ?from&to&interval=day|week → { labels, series: { speeding, geofence, offline, ... } }
GET /api/v1/statistics/trip-summary      ?from&to&interval=day|week → { labels, totalTrips, totalDistanceKm, avgDuration }

# Firmware
GET    /api/v1/firmware              ?page&limit
GET    /api/v1/firmware/:id
POST   /api/v1/firmware/upload       FormData (file + version + releaseNotes)
DELETE /api/v1/firmware/:id
POST   /api/v1/firmware/:id/deploy   { deviceIds, strategy: 'rolling' | 'all_at_once' }
GET    /api/v1/firmware/:id/deployments → deployment status per device

# Export
GET    /api/v1/export                ?page&limit
POST   /api/v1/export                { entity, format, from, to, filters? }
GET    /api/v1/export/:id/download   → file stream

# Health
GET    /api/v1/health                → { components: [{ name, status, latency, details }] }
GET    /api/v1/metrics/query         ?query=<PromQL>&start&end&step → metrics data

# System Admin
GET    /api/v1/system-admin/tables/:table ?page&limit&search&from&to → DB table rows
GET    /api/v1/system-admin/tables   → available table names
```

---

## STATISTICS MODULE

### FE-150: Statistics Page

```tsx
// app/dashboard/statistics/page.tsx
'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { FleetUsageChart } from '@/features/statistics/components/fleet-usage-chart';
import { DeviceUptimeChart } from '@/features/statistics/components/device-uptime-chart';
import { AlertFrequencyChart } from '@/features/statistics/components/alert-frequency-chart';
import { TripSummaryChart } from '@/features/statistics/components/trip-summary-chart';
import { ReportExport } from '@/features/statistics/components/report-export';
import { DateRangePicker } from '@/components/common/date-range-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StatisticsPage() {
  const [dateRange, setDateRange] = useState({ from: new Date(Date.now() - 30 * 86400000), to: new Date() });
  const [interval, setInterval] = useState('day');

  return (
    <PageContainer
      pageTitle="Báo cáo & Thống kê"
      pageDescription="Phân tích dữ liệu hoạt động hệ thống"
      pageHeaderAction={<ReportExport dateRange={dateRange} />}
    >
      {/* Filters */}
      <div className="flex items-center gap-4">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <Select value={interval} onValueChange={setInterval}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Theo ngày</SelectItem>
            <SelectItem value="week">Theo tuần</SelectItem>
            <SelectItem value="month">Theo tháng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <FleetUsageChart dateRange={dateRange} interval={interval} />
        <DeviceUptimeChart dateRange={dateRange} />
        <AlertFrequencyChart dateRange={dateRange} interval={interval} />
        <TripSummaryChart dateRange={dateRange} interval={interval} />
      </div>
    </PageContainer>
  );
}
```

### Chart Components (all follow same pattern):
- Card with CardTitle
- useQuery with API params
- recharts chart (AreaChart/BarChart/LineChart) inside ResponsiveContainer
- Skeleton loading state
- Empty state if no data

### FE-156: Report Export
Dropdown with: "Xuất PDF" and "Xuất CSV". Client-side generation using existing API data + jspdf / papaparse.

---

## FIRMWARE MODULE

### FE-163: Firmware Page

PageContainer with Tabs: "Firmware Files" (DataTable) + "Deployments" (Deployment dashboard)

### FE-164: Firmware Columns
version, fileName, fileSize (formatted), releaseNotes (truncated), uploadedAt, uploadedBy, deviceCount, actions (Deploy/Delete)

### FE-165: FirmwareUploadForm
Dialog with drag-drop zone (using shadcn file-uploader pattern):
- Drop .bin file
- version Input (required, semver)
- releaseNotes Textarea
- Progress bar during upload
- FormData POST to `/firmware/upload`

### FE-166: FirmwareAssignDialog
Dialog with:
- firmware version info
- Device multi-select (Command combobox) — filter by device type
- Strategy: Radio "Lần lượt" (rolling) vs "Tất cả cùng lúc" (all_at_once)
- useMutation `POST /firmware/:id/deploy`

### FE-167: FirmwareDeployDashboard
Card grid showing deployment progress per device:
- Device name, progress bar (0-100%), status Badge (pending/downloading/installing/completed/failed)
- Real-time via Socket `firmware:progress` and `firmware:complete`

---

## EXPORT MODULE

### FE-173: Export Page

PageContainer + DataTable of export jobs.

### FE-174: Export Columns
entity, format (CSV/Excel/PDF), status Badge (pending→processing→completed→failed), progress (Progress bar), createdAt, fileSize, actions (Download — only when completed)

### FE-175: ExportForm
Dialog with:
- entity Select: Thiết bị, Phương tiện, Cảnh báo, Chuyến đi, Bảo trì
- format Select: CSV, Excel, PDF
- DateRangePicker (from/to)
- Additional filters based on entity
- Submit → POST `/export` → job created → real-time progress via Socket

---

## SYSTEM STATUS MODULE

### FE-180: System Status Page

```tsx
// app/dashboard/system-status/page.tsx
'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { ComponentHealthCard } from '@/features/system-status/components/component-health-card';
import { useHealthStatus } from '@/features/system-status/hooks/use-health-status';
import { Skeleton } from '@/components/ui/skeleton';

const COMPONENTS = [
  { key: 'backend', label: 'Backend API', icon: 'Server' },
  { key: 'mqtt', label: 'MQTT Bridge', icon: 'Radio' },
  { key: 'postgresql', label: 'PostgreSQL', icon: 'Database' },
  { key: 'victoriametrics', label: 'VictoriaMetrics', icon: 'BarChart3' },
  { key: 'emqx', label: 'EMQX Broker', icon: 'Wifi' },
];

export default function SystemStatusPage() {
  const { data, isLoading } = useHealthStatus();

  return (
    <PageContainer pageTitle="Sức khỏe hệ thống" pageDescription="Trạng thái các thành phần hệ thống">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {COMPONENTS.map((c) => (
          <ComponentHealthCard
            key={c.key}
            label={c.label}
            icon={c.icon}
            status={data?.components?.find((x: any) => x.name === c.key)}
            isLoading={isLoading}
          />
        ))}
      </div>
    </PageContainer>
  );
}
```

### ComponentHealthCard
Card showing: icon, component name, status Badge (healthy=green, degraded=amber, down=red), latency, uptime, connection count, last check timestamp.

### FE-183: MetricCard (with sparkline)
Compact card showing:
- Metric label + current value (bold)
- Mini recharts AreaChart sparkline (last 24 data points)
- Trend arrow (↑/↓) based on last vs previous value
- Used for: CPU Usage, Memory, Disk, Network I/O

### FE-184: StatusProgress
Circular progress ring (CSS `conic-gradient`):
- Shows percentage (CPU, memory, disk utilization)
- Color transitions: green < 60%, amber 60-80%, red > 80%
- Center: percentage text
- Below: label + absolute values (e.g., "3.2 GB / 8 GB")

### FE-185: UptimeTimeline
30-day horizontal bar:
- Each day = colored segment (green=100%, amber=partial, red=down)
- Tooltip on hover: date + uptime percentage + downtime duration
- Overall uptime percentage displayed above

### System Status Hooks

```typescript
// features/system-status/hooks/use-health-status.ts
export function useHealthStatus() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => apiClient.get('/health').then(r => r.data),
    refetchInterval: 15_000,
  });
}

// features/system-status/hooks/use-system-metrics.ts
export function useSystemMetrics() {
  return useQuery({
    queryKey: ['system-metrics'],
    queryFn: () => apiClient.get('/system/metrics').then(r => r.data),
    refetchInterval: 30_000,
  });
}

// features/system-status/hooks/use-uptime-history.ts
export function useUptimeHistory(days = 30) {
  return useQuery({
    queryKey: ['uptime-history', days],
    queryFn: () => apiClient.get(`/system/uptime?days=${days}`).then(r => r.data),
  });
}
```

---

## SIMULATOR MODULE

### FE-190: Simulator Page

PageContainer with 2-column layout:

```
SimulatorPage
├── Left Panel (config, 40%)
│   ├── DeviceSelector (Combobox, search + select device)
│   ├── DataConfigurator
│   │   ├── Location: lat/lon Inputs + "Pick on map" button
│   │   ├── Speed: Slider 0-200 km/h + Input override 
│   │   ├── Vibration RMS: Slider 0-50 + Input override
│   │   ├── Heading: Slider 0-360° + compass preview
│   │   ├── Interval: Select (1s, 2s, 5s, 10s)
│   │   └── Presets: DropdownMenu ("Idle", "City Drive", "Highway", "Off-road")
│   └── SimulationControls
│       ├── Start (green) / Stop (red) / Pause (amber) buttons
│       └── Running status badge + elapsed time
└── Right Panel (preview, 60%)
    └── SimulationPreview
        ├── JSON preview of next payload
        ├── Sent history DataTable (last 50 entries)
        └── Mini map showing simulated position
```

### Data Presets

```typescript
// features/simulator/constants/presets.ts
export const SIMULATION_PRESETS = {
  idle: { speed: 0, vibrationRms: 0.5, label: 'Idle' },
  cityDrive: { speed: 40, vibrationRms: 5, label: 'City Drive' },
  highway: { speed: 100, vibrationRms: 8, label: 'Highway' },
  offroad: { speed: 25, vibrationRms: 25, label: 'Off-road' },
};
```

### Simulator Hooks

```typescript
// features/simulator/hooks/use-simulator.ts
export function useStartSimulation() {
  return useMutation({
    mutationFn: (data: SimulationConfig) => apiClient.post('/simulator/start', data).then(r => r.data),
    onSuccess: () => toast.success('Simulation started'),
  });
}

export function useStopSimulation() {
  return useMutation({
    mutationFn: () => apiClient.post('/simulator/stop').then(r => r.data),
    onSuccess: () => toast.info('Simulation stopped'),
  });
}

export function useSimulatorStatus() {
  return useQuery({
    queryKey: ['simulator-status'],
    queryFn: () => apiClient.get('/simulator/status').then(r => r.data),
    refetchInterval: 2_000,
  });
}
```

API: Direct MQTT publish via backend endpoint `POST /simulator/start` with config params.

---

## SYSTEM ADMIN MODULE

### FE-195: System Admin Page

Tabs: "Sức khỏe" | "Metrics" | "Logs" | "Audit Log"

### FE-196: HealthDashboard
Reuse or link to System Status page. Show summary + key metrics.

### FE-197: MetricsQuery
Card with:
- PromQL input (Textarea)
- Time range picker (from/to)
- Step input (15s, 30s, 1m, 5m)
- "Chạy truy vấn" button
- Results: recharts LineChart visualization OR raw JSON table

### FE-198: LogsQuery
Card with:
- LogsQL input (Textarea)
- Time range picker
- Limit input
- Results: scrollable log entries with timestamp + level badge + message

### FE-199: AuditLogViewer
Card with:
- Table selector (Select from available tables via `/system-admin/tables`)
- Search input
- DateRangePicker
- DataTable showing rows with pagination (server-side)
- Column definitions dynamic based on selected table

---

## Verification Checklist

- [ ] Statistics: 4 charts render with date range filter
- [ ] Statistics: interval selector (day/week/month) works
- [ ] Statistics: export PDF/CSV
- [ ] Firmware: upload .bin with drag-drop + progress
- [ ] Firmware: deploy to devices (rolling/all-at-once)
- [ ] Firmware: deployment dashboard with real-time progress
- [ ] Export: create job, see progress, download completed
- [ ] Export: real-time progress via Socket
- [ ] System Status: 5 component health cards with correct status
- [ ] Simulator: select device, configure params, start/stop simulation
- [ ] Simulator: live data preview table
- [ ] System Admin: PromQL query → chart visualization
- [ ] System Admin: LogsQL query → log entries
- [ ] System Admin: Audit log viewer with table selector + pagination
- [ ] All text Vietnamese
