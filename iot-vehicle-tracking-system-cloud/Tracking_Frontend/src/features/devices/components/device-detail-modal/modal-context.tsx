'use client';

import { createContext, useContext } from 'react';
import type { DeviceDetailTab } from '@/features/devices/components/device-constants';
import type { RuntimeRange } from '@/features/devices/hooks/use-device-runtime-chart';
import type { TrackingTelemetryPeriod } from '@/features/devices/hooks/use-device-tracking-telemetry';
import type { VibrationPeriod } from '@/features/devices/hooks/use-device-vibration-chart';
import type {
  Device,
  DeviceCommand,
  DeviceErrorCode,
  DevicePositionSnapshot,
  DeviceRawFeedRow,
  DeviceRuntimeBucket,
  DeviceSession,
  DeviceTelemetryRow,
  DeviceVibrationPoint,
} from '@/features/devices/types';

export interface DeviceDetailModalContextValue {
  device: Device | null;
  runtime: {
    totalRuntime: number;
    totalSessions: number;
    avgSessionDuration: number;
    avgVibration: number;
    totalDataPoints: number;
  } | null;
  loading: boolean;
  error: Error | null;
  sessions: DeviceSession[];
  sessionsLoading: boolean;
  sessionsHasMore: boolean;
  onSessionsLoadMore: () => void;
  errorCodes: DeviceErrorCode[];
  errorCodesTotal: number;
  errorCodesPage: number;
  errorCodesStatus: 'all' | 'active' | 'resolved';
  errorCodesType: 'all' | 'critical' | 'warning' | 'info';
  onErrorCodesPageChange: (page: number) => void;
  onErrorCodesStatusChange: (status: 'all' | 'active' | 'resolved') => void;
  onErrorCodesTypeChange: (type: 'all' | 'critical' | 'warning' | 'info') => void;
  commands: DeviceCommand[];
  commandsTotal: number;
  commandsPage: number;
  commandsTotalPages: number;
  onCommandsPageChange: (page: number) => void;
  runtimeChart: DeviceRuntimeBucket[];
  runtimeRange: RuntimeRange;
  onRuntimeRangeChange: (range: RuntimeRange) => void;
  vibrationChart: DeviceVibrationPoint[];
  vibrationPeriod: VibrationPeriod;
  onVibrationPeriodChange: (period: VibrationPeriod) => void;
  trackingRows: DeviceTelemetryRow[];
  trackingRowsAscending: DeviceTelemetryRow[];
  trackingPeriod: TrackingTelemetryPeriod;
  onTrackingPeriodChange: (period: TrackingTelemetryPeriod) => void;
  routePoints: [number, number][];
  distanceKm: number;
  averageSpeed: number;
  maxSpeed: number;
  latestTrackingRow: DeviceTelemetryRow | null;
  positionSnapshot: DevicePositionSnapshot | null;
  eventLogs: Record<string, unknown>[];
  eventLogsTotal: number;
  rawFeed: DeviceRawFeedRow[];
  obdActiveAlerts: {
    id: number;
    title: string;
    message: string | null;
    severity: 'low' | 'medium' | 'high' | 'critical';
    createdAt: string | null;
  }[];
  obdAlertsLoading: boolean;
  activeTab: DeviceDetailTab;
  onTabChange: (tab: DeviceDetailTab) => void;
  onUpdateNameId: (data: Record<string, unknown>) => Promise<void>;
  onUpdateSettings: (data: Record<string, unknown>) => Promise<void>;
  onDeleteDevice: () => Promise<void>;
  onSendCommand: (command: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  openExportModal: () => void;
}

const DeviceDetailModalContext = createContext<DeviceDetailModalContextValue | null>(null);

export const DeviceDetailModalProvider = ({
  value,
  children,
}: {
  value: DeviceDetailModalContextValue;
  children: React.ReactNode;
}) => {
  return (
    <DeviceDetailModalContext.Provider value={value}>{children}</DeviceDetailModalContext.Provider>
  );
};

export const useDeviceDetailModal = () => {
  const context = useContext(DeviceDetailModalContext);

  if (!context) {
    throw new Error('useDeviceDetailModal must be used inside DeviceDetailModalProvider');
  }

  return context;
};
