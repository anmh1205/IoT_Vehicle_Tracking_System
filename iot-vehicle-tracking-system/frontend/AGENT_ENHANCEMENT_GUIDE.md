# 🚀 AI Agent Enhancement Guide - Frontend IoT Vehicle Tracking

> **Mục đích**: Tài liệu này hướng dẫn AI Agent implement các tính năng nâng cao dựa trên nghiên cứu best practices từ các hệ thống fleet management hàng đầu (Traccar, OpenGTS, Fleetio).

---

## 📍 Project Context

```
PROJECT_ROOT = e:\1. Phenikaa University\AML\0. Project\12. DATN\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system\frontend
SRC_DIR = {PROJECT_ROOT}\src
```

**Tech Stack**: Next.js 16, React 19, TailwindCSS 4, shadcn/ui, TanStack Query, Zustand, Recharts, Leaflet

---

## 📊 SUMMARY

```
PHASE 1: DASHBOARD ANALYTICS (15 tasks)
├── 1.1  types/dashboard.ts
├── 1.2  lib/api/dashboard.ts
├── 1.3  hooks/queries/use-dashboard.ts
├── 1.4  features/dashboard/components/fleet-overview-card.tsx
├── 1.5  features/dashboard/components/vehicle-status-chart.tsx
├── 1.6  features/dashboard/components/fuel-consumption-chart.tsx
├── 1.7  features/dashboard/components/trip-distance-chart.tsx
├── 1.8  features/dashboard/components/driver-safety-widget.tsx
├── 1.9  features/dashboard/components/upcoming-maintenance.tsx
├── 1.10 features/dashboard/components/live-activity-feed.tsx
├── 1.11 features/dashboard/components/map-overview-widget.tsx
├── 1.12 features/dashboard/components/kpi-card.tsx
├── 1.13 features/dashboard/components/trend-indicator.tsx
├── 1.14 features/dashboard/components/dashboard-grid.tsx
└── 1.15 app/(dashboard)/dashboard/page.tsx (UPDATE)

PHASE 2: ENHANCED REPORTING (12 tasks)
├── 2.1  types/report.ts
├── 2.2  lib/api/reports.ts
├── 2.3  lib/utils/pdf-export.ts
├── 2.4  lib/utils/excel-export.ts
├── 2.5  hooks/queries/use-reports.ts
├── 2.6  hooks/mutations/use-report-mutations.ts
├── 2.7  features/reports/components/report-builder.tsx
├── 2.8  features/reports/components/report-preview.tsx
├── 2.9  features/reports/components/date-range-picker.tsx
├── 2.10 features/reports/components/report-table.tsx
├── 2.11 features/reports/components/report-chart.tsx
└── 2.12 app/(dashboard)/reports/page.tsx (NEW)

PHASE 3: DRIVER BEHAVIOR MODULE (14 tasks)
├── 3.1  types/driver.ts
├── 3.2  lib/api/drivers.ts
├── 3.3  hooks/queries/use-drivers.ts
├── 3.4  hooks/mutations/use-driver-mutations.ts
├── 3.5  features/drivers/components/driver-table.tsx
├── 3.6  features/drivers/components/driver-table-columns.tsx
├── 3.7  features/drivers/components/driver-details.tsx
├── 3.8  features/drivers/components/driver-form.tsx
├── 3.9  features/drivers/components/safety-score-card.tsx
├── 3.10 features/drivers/components/behavior-chart.tsx
├── 3.11 features/drivers/components/violation-history.tsx
├── 3.12 features/drivers/components/driver-leaderboard.tsx
├── 3.13 app/(dashboard)/drivers/page.tsx (NEW)
└── 3.14 app/(dashboard)/drivers/[id]/page.tsx (NEW)

PHASE 4: ADVANCED GEOFENCING (10 tasks)
├── 4.1  types/geofence.ts (UPDATE)
├── 4.2  features/geofences/components/geofence-map-editor.tsx
├── 4.3  features/geofences/components/geofence-rules-form.tsx
├── 4.4  features/geofences/components/geofence-schedule.tsx
├── 4.5  features/geofences/components/geofence-statistics.tsx
├── 4.6  features/geofences/components/geofence-event-log.tsx
├── 4.7  features/geofences/components/speed-limit-zone.tsx
├── 4.8  features/geofences/components/geofence-category-badge.tsx
├── 4.9  hooks/queries/use-geofence-events.ts
└── 4.10 app/(dashboard)/geofences/[id]/page.tsx (UPDATE)

PHASE 5: REAL-TIME ENHANCEMENTS (8 tasks)
├── 5.1  hooks/use-live-telemetry.ts
├── 5.2  hooks/use-live-alerts.ts
├── 5.3  features/tracking/components/live-vehicle-info.tsx
├── 5.4  features/tracking/components/vehicle-trail.tsx
├── 5.5  features/tracking/components/speed-gauge.tsx
├── 5.6  features/tracking/components/engine-status.tsx
├── 5.7  features/tracking/components/fuel-gauge.tsx
└── 5.8  features/tracking/components/tracking-controls.tsx

TOTAL: 59 tasks
```

---

## 🎯 PHASE 1: DASHBOARD ANALYTICS

### Task 1.1: Create `types/dashboard.ts`

**File Path**: `{SRC_DIR}/types/dashboard.ts`

**Instructions**: Tạo types cho dashboard analytics data.

**Code Template**:
```typescript
/**
 * Dashboard Types - Analytics and KPIs
 */

export interface FleetOverview {
  totalVehicles: number;
  activeVehicles: number;
  idleVehicles: number;
  offlineVehicles: number;
  inMaintenanceVehicles: number;
}

export interface VehicleStatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface FuelConsumptionData {
  date: string;
  consumption: number; // liters
  cost: number;
  vehicleId?: number;
}

export interface TripDistanceData {
  date: string;
  distance: number; // km
  tripCount: number;
  avgDuration: number; // minutes
}

export interface DriverSafetyScore {
  driverId: number;
  driverName: string;
  score: number; // 0-100
  harshBrakingCount: number;
  speedingCount: number;
  rank: number;
}

export interface UpcomingMaintenance {
  vehicleId: number;
  vehiclePlate: string;
  maintenanceType: string;
  scheduledDate: string;
  daysUntil: number;
  priority: 'low' | 'medium' | 'high';
}

export interface LiveActivityEvent {
  id: number;
  type: 'trip_start' | 'trip_end' | 'alert' | 'geofence' | 'maintenance';
  vehicleId: number;
  vehiclePlate: string;
  message: string;
  timestamp: string;
}

export interface DashboardStats {
  fleetOverview: FleetOverview;
  todayTrips: number;
  todayDistance: number;
  todayAlerts: number;
  avgFuelEfficiency: number;
  activeAlerts: number;
}

export interface KPIData {
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  icon?: string;
}

export interface DashboardPeriod {
  period: 'today' | 'week' | 'month' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
}
```

---

### Task 1.2: Create `lib/api/dashboard.ts`

**File Path**: `{SRC_DIR}/lib/api/dashboard.ts`

**Dependencies**: Task 1.1

**Instructions**: Tạo API service cho dashboard endpoints.

**Code Template**:
```typescript
/**
 * Dashboard API Service
 */
import { http } from './http';
import type {
  DashboardStats,
  FleetOverview,
  FuelConsumptionData,
  TripDistanceData,
  DriverSafetyScore,
  UpcomingMaintenance,
  LiveActivityEvent,
  VehicleStatusDistribution,
  DashboardPeriod,
} from '@/types';

const DASHBOARD_API = {
  STATS: '/dashboard/stats',
  FLEET_OVERVIEW: '/dashboard/fleet-overview',
  FUEL_CONSUMPTION: '/dashboard/fuel-consumption',
  TRIP_DISTANCE: '/dashboard/trip-distance',
  DRIVER_SAFETY: '/dashboard/driver-safety',
  UPCOMING_MAINTENANCE: '/dashboard/upcoming-maintenance',
  LIVE_ACTIVITY: '/dashboard/live-activity',
  VEHICLE_STATUS: '/dashboard/vehicle-status-distribution',
};

export const dashboardServices = {
  getStats: async (period?: DashboardPeriod): Promise<DashboardStats> => {
    const params = period ? `?period=${period.period}` : '';
    return http.get<DashboardStats>(`${DASHBOARD_API.STATS}${params}`);
  },

  getFleetOverview: async (): Promise<FleetOverview> => {
    return http.get<FleetOverview>(DASHBOARD_API.FLEET_OVERVIEW);
  },

  getFuelConsumption: async (period: DashboardPeriod): Promise<FuelConsumptionData[]> => {
    const params = `?period=${period.period}`;
    return http.get<FuelConsumptionData[]>(`${DASHBOARD_API.FUEL_CONSUMPTION}${params}`);
  },

  getTripDistance: async (period: DashboardPeriod): Promise<TripDistanceData[]> => {
    const params = `?period=${period.period}`;
    return http.get<TripDistanceData[]>(`${DASHBOARD_API.TRIP_DISTANCE}${params}`);
  },

  getDriverSafetyScores: async (limit?: number): Promise<DriverSafetyScore[]> => {
    const params = limit ? `?limit=${limit}` : '';
    return http.get<DriverSafetyScore[]>(`${DASHBOARD_API.DRIVER_SAFETY}${params}`);
  },

  getUpcomingMaintenance: async (days?: number): Promise<UpcomingMaintenance[]> => {
    const params = days ? `?days=${days}` : '';
    return http.get<UpcomingMaintenance[]>(`${DASHBOARD_API.UPCOMING_MAINTENANCE}${params}`);
  },

  getLiveActivity: async (limit?: number): Promise<LiveActivityEvent[]> => {
    const params = limit ? `?limit=${limit}` : '';
    return http.get<LiveActivityEvent[]>(`${DASHBOARD_API.LIVE_ACTIVITY}${params}`);
  },

  getVehicleStatusDistribution: async (): Promise<VehicleStatusDistribution[]> => {
    return http.get<VehicleStatusDistribution[]>(DASHBOARD_API.VEHICLE_STATUS);
  },
};
```

---

### Task 1.3: Create `hooks/queries/use-dashboard.ts`

**File Path**: `{SRC_DIR}/hooks/queries/use-dashboard.ts`

**Dependencies**: Task 1.2

**Instructions**: Tạo React Query hooks cho dashboard data.

**Code Template**:
```typescript
/**
 * Dashboard Query Hooks
 */
import { useQuery } from '@tanstack/react-query';
import { dashboardServices } from '@/lib/api/dashboard';
import type { DashboardPeriod } from '@/types';

export const DASHBOARD_KEYS = {
  all: ['dashboard'] as const,
  stats: (period?: string) => [...DASHBOARD_KEYS.all, 'stats', period] as const,
  fleetOverview: () => [...DASHBOARD_KEYS.all, 'fleet-overview'] as const,
  fuelConsumption: (period: string) => [...DASHBOARD_KEYS.all, 'fuel', period] as const,
  tripDistance: (period: string) => [...DASHBOARD_KEYS.all, 'trips', period] as const,
  driverSafety: () => [...DASHBOARD_KEYS.all, 'driver-safety'] as const,
  upcomingMaintenance: () => [...DASHBOARD_KEYS.all, 'maintenance'] as const,
  liveActivity: () => [...DASHBOARD_KEYS.all, 'activity'] as const,
  vehicleStatus: () => [...DASHBOARD_KEYS.all, 'vehicle-status'] as const,
};

export function useDashboardStats(period?: DashboardPeriod) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.stats(period?.period),
    queryFn: () => dashboardServices.getStats(period),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });
}

export function useFleetOverview() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.fleetOverview(),
    queryFn: () => dashboardServices.getFleetOverview(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useFuelConsumption(period: DashboardPeriod) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.fuelConsumption(period.period),
    queryFn: () => dashboardServices.getFuelConsumption(period),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTripDistance(period: DashboardPeriod) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.tripDistance(period.period),
    queryFn: () => dashboardServices.getTripDistance(period),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDriverSafetyScores(limit: number = 10) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.driverSafety(),
    queryFn: () => dashboardServices.getDriverSafetyScores(limit),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpcomingMaintenance(days: number = 7) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.upcomingMaintenance(),
    queryFn: () => dashboardServices.getUpcomingMaintenance(days),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLiveActivity(limit: number = 20) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.liveActivity(),
    queryFn: () => dashboardServices.getLiveActivity(limit),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 15 * 1000, // 15 seconds
  });
}

export function useVehicleStatusDistribution() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.vehicleStatus(),
    queryFn: () => dashboardServices.getVehicleStatusDistribution(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
```

---

### Task 1.4: Create `features/dashboard/components/fleet-overview-card.tsx`

**File Path**: `{SRC_DIR}/features/dashboard/components/fleet-overview-card.tsx`

**Dependencies**: Task 1.3

**Instructions**: Hiển thị tổng quan fleet với số lượng xe theo status.

**UI Design**:
- Card với 4 mini-cards bên trong
- Màu sắc khác nhau cho mỗi status (green=active, yellow=idle, red=offline, blue=maintenance)
- Icon cho mỗi loại
- Click vào mỗi status để filter vehicles

**Code Template**:
```typescript
/**
 * Fleet Overview Card - Shows vehicle counts by status
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFleetOverview } from '@/hooks/queries/use-dashboard';
import { Car, CirclePause, WifiOff, Wrench } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatusItemProps {
  label: string;
  count: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function StatusItem({ label, count, icon: Icon, color, bgColor }: StatusItemProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${bgColor}`}>
      <div className={`p-2 rounded-full bg-white/80`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold">{count}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function FleetOverviewCard() {
  const { data, isLoading } = useFleetOverview();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          Fleet Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatusItem
            label="Active"
            count={data?.activeVehicles || 0}
            icon={Car}
            color="text-green-600"
            bgColor="bg-green-50"
          />
          <StatusItem
            label="Idle"
            count={data?.idleVehicles || 0}
            icon={CirclePause}
            color="text-yellow-600"
            bgColor="bg-yellow-50"
          />
          <StatusItem
            label="Offline"
            count={data?.offlineVehicles || 0}
            icon={WifiOff}
            color="text-red-600"
            bgColor="bg-red-50"
          />
          <StatusItem
            label="Maintenance"
            count={data?.inMaintenanceVehicles || 0}
            icon={Wrench}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-center text-lg">
            <span className="font-bold text-2xl">{data?.totalVehicles || 0}</span>
            <span className="text-muted-foreground ml-2">Total Vehicles</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Task 1.5: Create `features/dashboard/components/vehicle-status-chart.tsx`

**File Path**: `{SRC_DIR}/features/dashboard/components/vehicle-status-chart.tsx`

**Dependencies**: Task 1.3

**Instructions**: Pie chart hoặc donut chart hiển thị phân bố vehicle status.

**UI Design**:
- Donut chart với legend
- Interactive: hover để xem chi tiết
- Sử dụng Recharts library

**Code Template**:
```typescript
/**
 * Vehicle Status Distribution Chart
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVehicleStatusDistribution } from '@/hooks/queries/use-dashboard';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_COLORS = {
  active: '#22c55e',
  idle: '#eab308',
  offline: '#ef4444',
  maintenance: '#3b82f6',
};

export function VehicleStatusChart() {
  const { data, isLoading } = useVehicleStatusDistribution();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="count"
              nameKey="status"
              label={({ name, percentage }) => `${name}: ${percentage}%`}
            >
              {data?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || STATUS_COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

---

### Task 1.6 - 1.14: Create remaining dashboard components

**Pattern**: Follow Task 1.4 và 1.5 patterns. Các components cần tạo:

| Task | File | Description |
|------|------|-------------|
| 1.6 | `fuel-consumption-chart.tsx` | Line chart fuel theo thời gian |
| 1.7 | `trip-distance-chart.tsx` | Bar chart distance theo ngày/tuần |
| 1.8 | `driver-safety-widget.tsx` | Top 5 drivers với safety score |
| 1.9 | `upcoming-maintenance.tsx` | List maintenance sắp tới |
| 1.10 | `live-activity-feed.tsx` | Real-time activity stream |
| 1.11 | `map-overview-widget.tsx` | Mini map với vehicle markers |
| 1.12 | `kpi-card.tsx` | Reusable KPI display card |
| 1.13 | `trend-indicator.tsx` | Up/down arrow với percentage |
| 1.14 | `dashboard-grid.tsx` | Responsive grid layout |

---

### Task 1.15: Update `app/(dashboard)/dashboard/page.tsx`

**File Path**: `{SRC_DIR}/app/(dashboard)/dashboard/page.tsx`

**Instructions**: Integrate tất cả dashboard components vào main dashboard page.

**Layout**:
```
+------------------+------------------+------------------+
|   Fleet Overview |  Vehicle Status  |   Today's KPIs   |
+------------------+------------------+------------------+
|        Fuel Consumption Chart       |  Trip Distance   |
+-------------------------------------+------------------+
|   Live Activity Feed   |  Upcoming Maintenance        |
+------------------------+-----------------------------+
|            Map Overview Widget (full width)          |
+------------------------------------------------------+
```

---

## 🎯 PHASE 2: ENHANCED REPORTING

### Task 2.1: Create `types/report.ts`

**File Path**: `{SRC_DIR}/types/report.ts`

**Instructions**: Types cho reporting module.

**Code Template**:
```typescript
/**
 * Report Types
 */
import type { DateRange } from './common';

export type ReportType = 
  | 'trip_summary'
  | 'fuel_consumption'
  | 'driver_behavior'
  | 'maintenance_history'
  | 'alert_summary'
  | 'vehicle_utilization'
  | 'geofence_activity';

export type ReportFormat = 'pdf' | 'excel' | 'csv';

export type ReportFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

export interface ReportConfig {
  type: ReportType;
  name: string;
  dateRange: DateRange;
  vehicleIds?: number[];
  driverIds?: number[];
  format: ReportFormat;
  includeCharts?: boolean;
}

export interface ScheduledReport {
  id: number;
  config: ReportConfig;
  frequency: ReportFrequency;
  recipients: string[]; // email addresses
  nextRunAt: string;
  lastRunAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ReportResult {
  id: number;
  type: ReportType;
  name: string;
  generatedAt: string;
  fileUrl: string;
  fileSize: number;
  format: ReportFormat;
}

export interface TripSummaryReport {
  totalTrips: number;
  totalDistance: number;
  totalDuration: number;
  avgTripDistance: number;
  avgTripDuration: number;
  byVehicle: Array<{
    vehicleId: number;
    vehiclePlate: string;
    trips: number;
    distance: number;
    duration: number;
  }>;
  byDay: Array<{
    date: string;
    trips: number;
    distance: number;
  }>;
}

export interface FuelReport {
  totalConsumption: number;
  totalCost: number;
  avgEfficiency: number; // km/L
  byVehicle: Array<{
    vehicleId: number;
    vehiclePlate: string;
    consumption: number;
    cost: number;
    efficiency: number;
  }>;
  trend: Array<{
    date: string;
    consumption: number;
    cost: number;
  }>;
}
```

---

### Task 2.2 - 2.12: Create remaining report components

**Pattern**: Follow similar structure as Phase 1.

| Task | File | Description |
|------|------|-------------|
| 2.2 | `lib/api/reports.ts` | Report API service |
| 2.3 | `lib/utils/pdf-export.ts` | PDF generation với jspdf |
| 2.4 | `lib/utils/excel-export.ts` | Excel export với xlsx |
| 2.5 | `hooks/queries/use-reports.ts` | Query hooks |
| 2.6 | `hooks/mutations/use-report-mutations.ts` | Generate/schedule mutations |
| 2.7 | `report-builder.tsx` | Form để cấu hình report |
| 2.8 | `report-preview.tsx` | Preview trước khi export |
| 2.9 | `date-range-picker.tsx` | Custom date range selector |
| 2.10 | `report-table.tsx` | Data table trong report |
| 2.11 | `report-chart.tsx` | Charts trong report |
| 2.12 | `reports/page.tsx` | Reports listing page |

---

## 🎯 PHASE 3: DRIVER BEHAVIOR MODULE

### Task 3.1: Create `types/driver.ts`

**File Path**: `{SRC_DIR}/types/driver.ts`

**Code Template**:
```typescript
/**
 * Driver Types
 */
import type { BaseEntity, QueryParams } from './common';

export type DriverStatus = 'active' | 'inactive' | 'suspended';
export type LicenseClass = 'A1' | 'A2' | 'B1' | 'B2' | 'C' | 'D' | 'E' | 'F';

export interface Driver extends BaseEntity {
  userId?: number;
  fullName: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseClass: LicenseClass;
  licenseExpiry: string;
  status: DriverStatus;
  // Computed scores
  safetyScore?: number;
  totalTrips?: number;
  totalDistance?: number;
  // Behavior stats
  harshBrakingCount?: number;
  harshAccelerationCount?: number;
  speedingCount?: number;
  // Avatar
  avatarUrl?: string;
}

export interface DriverBehaviorEvent {
  id: number;
  driverId: number;
  vehicleId: number;
  type: 'harsh_braking' | 'harsh_acceleration' | 'speeding' | 'idle_time' | 'fatigue';
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  value?: number; // e.g., speed value for speeding
  threshold?: number; // e.g., speed limit
}

export interface DriverScoreHistory {
  date: string;
  score: number;
  harshBrakingCount: number;
  speedingCount: number;
  tripsCount: number;
}

export interface DriverLeaderboard {
  rank: number;
  driverId: number;
  driverName: string;
  score: number;
  totalTrips: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CreateDriverDto {
  fullName: string;
  phone: string;
  email?: string;
  licenseNumber: string;
  licenseClass: LicenseClass;
  licenseExpiry: string;
  userId?: number;
}

export interface UpdateDriverDto {
  fullName?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  licenseClass?: LicenseClass;
  licenseExpiry?: string;
  status?: DriverStatus;
}

export interface QueryDriverDto extends QueryParams {
  status?: DriverStatus;
  licenseClass?: LicenseClass;
  minScore?: number;
}
```

---

### Task 3.2 - 3.14: Create remaining driver components

| Task | File | Description |
|------|------|-------------|
| 3.2 | `lib/api/drivers.ts` | Driver API service |
| 3.3 | `hooks/queries/use-drivers.ts` | Query hooks |
| 3.4 | `hooks/mutations/use-driver-mutations.ts` | CRUD mutations |
| 3.5 | `driver-table.tsx` | Drivers list table |
| 3.6 | `driver-table-columns.tsx` | Column definitions |
| 3.7 | `driver-details.tsx` | Driver profile view |
| 3.8 | `driver-form.tsx` | Create/edit driver |
| 3.9 | `safety-score-card.tsx` | Large score display |
| 3.10 | `behavior-chart.tsx` | Score history chart |
| 3.11 | `violation-history.tsx` | List of violations |
| 3.12 | `driver-leaderboard.tsx` | Top drivers ranking |
| 3.13 | `drivers/page.tsx` | Drivers listing |
| 3.14 | `drivers/[id]/page.tsx` | Driver detail page |

---

## 🎯 PHASE 4: ADVANCED GEOFENCING

### Task 4.1 - 4.10: Geofence enhancements

| Task | File | Description |
|------|------|-------------|
| 4.1 | `types/geofence.ts` | Add schedule, rules types |
| 4.2 | `geofence-map-editor.tsx` | Draw polygons/circles on map |
| 4.3 | `geofence-rules-form.tsx` | Configure alerts, speed limits |
| 4.4 | `geofence-schedule.tsx` | Active hours configuration |
| 4.5 | `geofence-statistics.tsx` | Entry/exit counts, duration |
| 4.6 | `geofence-event-log.tsx` | History of geofence events |
| 4.7 | `speed-limit-zone.tsx` | Speed limit per zone |
| 4.8 | `geofence-category-badge.tsx` | Visual category indicator |
| 4.9 | `use-geofence-events.ts` | Query for geofence events |
| 4.10 | `geofences/[id]/page.tsx` | Update with new features |

---

## 🎯 PHASE 5: REAL-TIME ENHANCEMENTS

### Task 5.1 - 5.8: Live tracking improvements

| Task | File | Description |
|------|------|-------------|
| 5.1 | `use-live-telemetry.ts` | WebSocket hook for live data |
| 5.2 | `use-live-alerts.ts` | Real-time alert notifications |
| 5.3 | `live-vehicle-info.tsx` | Speed, heading, status overlay |
| 5.4 | `vehicle-trail.tsx` | Recent path on map |
| 5.5 | `speed-gauge.tsx` | Speedometer widget |
| 5.6 | `engine-status.tsx` | On/Off indicator |
| 5.7 | `fuel-gauge.tsx` | Fuel level indicator |
| 5.8 | `tracking-controls.tsx` | Play/pause, follow vehicle |

---

## 📋 DEPENDENCIES

### New npm packages needed:
```bash
npm install recharts jspdf xlsx date-fns-tz
```

### Backend API endpoints needed:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/dashboard/stats` | GET | Overall dashboard statistics |
| `/dashboard/fleet-overview` | GET | Vehicle counts by status |
| `/dashboard/fuel-consumption` | GET | Fuel data by period |
| `/dashboard/trip-distance` | GET | Trip distance data |
| `/dashboard/driver-safety` | GET | Driver safety scores |
| `/dashboard/upcoming-maintenance` | GET | Scheduled maintenance |
| `/dashboard/live-activity` | GET | Recent activity feed |
| `/reports` | GET, POST | Report management |
| `/reports/:id/generate` | POST | Generate report |
| `/drivers` | CRUD | Driver management |
| `/drivers/:id/behavior` | GET | Behavior events |
| `/drivers/:id/score-history` | GET | Score over time |
| `/geofences/:id/events` | GET | Geofence entry/exit logs |
| `/geofences/:id/statistics` | GET | Geofence statistics |

---

*Document Version: 1.0*
*Created: 2026-01-03*
*Total Tasks: 59*
*Status: ⏳ PENDING IMPLEMENTATION*
