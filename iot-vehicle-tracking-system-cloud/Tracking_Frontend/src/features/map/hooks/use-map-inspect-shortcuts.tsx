'use client';

import type { LucideIcon } from 'lucide-react';
import {
  CarFront,
  Cpu,
  MapPinned,
  RadioTower,
  Route,
  TerminalSquare,
  TriangleAlert,
} from 'lucide-react';
import type { VehicleZone } from '@/lib/api/zones';
import { useMapShortcutTargets } from '@/features/map/hooks/use-map-shortcut-targets';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition, MapInspectPanelPayload, MapInspectPanelTarget } from '@/features/map/types';

export interface MapInspectShortcut {
  id: string;
  label: string;
  icon: LucideIcon;
  target: MapInspectPanelTarget;
  disabled?: boolean;
  loading?: boolean;
  badge?: number | null;
  onSelect: () => void;
}

export interface MapInspectShortcutResolution {
  alertsPath: string | null;
  deviceRecordId: number | null;
  vehicleRecordId: number | null;
  deviceIdentifier: string;
  vehicleIdentifier: string;
}

const toBadgeCount = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

export const useMapInspectShortcuts = (
  device: DevicePosition | null,
  allowedZone: VehicleZone | null | undefined,
) => {
  const openInspectPanel = useMapStore((state) => state.openInspectPanel);
  const shortcutTargets = useMapShortcutTargets(device);
  const alertCount = toBadgeCount(
    device?.activeAlertCount ?? (device ? device.deviceAlerts.count + device.ecuAlerts.count : null),
  );

  const basePayload = (overrides?: Partial<MapInspectPanelPayload>): MapInspectPanelPayload => ({
    linkedEntityType: 'device',
    linkedEntityId: shortcutTargets.deviceRecordId,
    linkedEntityKey: shortcutTargets.deviceIdentifier || null,
    ...overrides,
  });

  const vehiclePayload = (highlight?: string): MapInspectPanelPayload => ({
    highlight: highlight ?? null,
    linkedEntityType: 'vehicle',
    linkedEntityId: shortcutTargets.vehicleRecordId,
    linkedEntityKey: shortcutTargets.vehicleIdentifier || null,
  });

  const shortcuts: MapInspectShortcut[] = [
    {
      id: 'overview',
      label: 'Thiết bị',
      icon: Cpu,
      target: 'overview',
      loading: shortcutTargets.deviceDetailLoading,
      onSelect: () => openInspectPanel('overview', basePayload()),
    },
    {
      id: 'vehicle',
      label: 'Xe',
      icon: CarFront,
      target: 'vehicle',
      disabled: !shortcutTargets.vehicleIdentifier,
      loading: shortcutTargets.vehicleDetailLoading,
      badge: shortcutTargets.vehicleIdentifier ? 1 : null,
      onSelect: () => openInspectPanel('vehicle', vehiclePayload('vehicle-summary')),
    },
    {
      id: 'alerts',
      label: 'Cảnh báo',
      icon: TriangleAlert,
      target: 'alerts',
      badge: alertCount,
      onSelect: () => openInspectPanel('alerts', basePayload({ highlight: 'active-alerts' })),
    },
    {
      id: 'errors',
      label: 'Lỗi gần đây',
      icon: RadioTower,
      target: 'errors',
      onSelect: () => openInspectPanel('errors', basePayload({ highlight: 'recent-errors' })),
    },
    {
      id: 'route',
      label: 'Lộ trình',
      icon: Route,
      target: 'route',
      onSelect: () => openInspectPanel('route', basePayload()),
    },
    {
      id: 'commands',
      label: 'Lệnh',
      icon: TerminalSquare,
      target: 'commands',
      onSelect: () => openInspectPanel('commands', basePayload()),
    },
    {
      id: 'zone',
      label: 'Vùng',
      icon: MapPinned,
      target: 'zone',
      disabled: !shortcutTargets.vehicleIdentifier,
      badge: allowedZone ? 1 : null,
      onSelect: () =>
        openInspectPanel(
          'zone',
          vehiclePayload(allowedZone ? 'allowed-zone-status' : 'allowed-zone-empty'),
        ),
    },
  ];

  return {
    shortcuts,
    resolution: {
      alertsPath: shortcutTargets.alertsPath,
      deviceRecordId: shortcutTargets.deviceRecordId,
      vehicleRecordId: shortcutTargets.vehicleRecordId,
      deviceIdentifier: shortcutTargets.deviceIdentifier,
      vehicleIdentifier: shortcutTargets.vehicleIdentifier,
    } satisfies MapInspectShortcutResolution,
  };
};
