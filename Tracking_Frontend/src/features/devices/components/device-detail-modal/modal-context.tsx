'use client';
import { createContext, useContext } from 'react';
import type {
  Device,
  DeviceErrorCode,
  DeviceRuntimeBucket,
  DeviceSession,
  DeviceVibrationPoint,
} from '@/features/devices/types';
import type { DeviceDetailTab } from '@/features/devices/components/device-constants';
import type { RuntimeRange } from '@/features/devices/hooks/use-device-runtime-chart';
import type { VibrationPeriod } from '@/features/devices/hooks/use-device-vibration-chart';
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
  runtimeChart: DeviceRuntimeBucket[];
  runtimeRange: RuntimeRange;
  onRuntimeRangeChange: (range: RuntimeRange) => void;
  vibrationChart: DeviceVibrationPoint[];
  vibrationPeriod: VibrationPeriod;
  onVibrationPeriodChange: (period: VibrationPeriod) => void;
  activeTab: DeviceDetailTab;
  onTabChange: (tab: DeviceDetailTab) => void;
  onUpdateNameId: (data: Record<string, unknown>) => Promise<void>;
  onUpdateSettings: (data: Record<string, unknown>) => Promise<void>;
  onDeleteDevice: () => Promise<void>;
  onSendCommand: (command: string) => Promise<void>;
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
