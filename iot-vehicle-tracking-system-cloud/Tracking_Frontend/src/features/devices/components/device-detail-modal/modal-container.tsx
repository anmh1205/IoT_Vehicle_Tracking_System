'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeviceRoom } from '@/components/providers/socket-provider';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { useRoleAccess } from '@/hooks/use-role-access';
import { alertServices, isObdMaintenanceAlert, localizeAlertForDisplay } from '@/lib/api/alerts';
import { vehicleServices } from '@/lib/api/vehicles';
import { notificationUtils } from '@/lib/notification';
import type { Device, DeviceRawFeedRow } from '@/features/devices/types';
import { useDeleteDevice } from '@/features/devices/hooks/use-delete-device';
import { useDeviceCommands } from '@/features/devices/hooks/use-device-commands';
import { useDeviceDetail } from '@/features/devices/hooks/use-device-detail';
import { useDeviceErrorCodes } from '@/features/devices/hooks/use-device-error-codes';
import { useDeviceEventLogs } from '@/features/devices/hooks/use-device-event-logs';
import { useDevicePositionSnapshot } from '@/features/devices/hooks/use-device-position-snapshot';
import { useDeviceRuntimeChart } from '@/features/devices/hooks/use-device-runtime-chart';
import { useDeviceSessions } from '@/features/devices/hooks/use-device-sessions';
import { useDeviceTrackingTelemetry } from '@/features/devices/hooks/use-device-tracking-telemetry';
import { useSendCommand } from '@/features/devices/hooks/use-send-command';
import { useUpdateDevice } from '@/features/devices/hooks/use-update-device';
import { useUpdateDeviceSettings } from '@/features/devices/hooks/use-update-device-settings';
import { getDashboardEventPresentation } from '@/features/dashboard/components/dashboard-event-presenters';
import { DeviceDetailModal } from './index';
import { buildFirmwareConfigCommandParams } from './device-detail-presenters';
import { buildDiagnosticsSummary, extractDiagnosticsPayloadFromEventLog } from './obd-diagnostics';
import type { DeviceDetailTab } from '@/features/devices/components/device-constants';
import type { DeviceDetailModalPresentation, DeviceLinkedVehicle, DeviceWorkspaceActions, DeviceWorkspaceAlert } from './workspace-types';
import type { MapInspectPanelPayload, MapInspectPanelTarget } from '@/features/map/types';
import { buildAlertQueueHref } from '@/features/alerts/lib/alert-queue-route';

const resolveTimestamp = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
};

const TELEMETRY_REFRESH_THROTTLE_MS = 10_000;

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const getEventLogPresentation = (
  row: Record<string, unknown>,
  timestamp: string | null,
) =>
  getDashboardEventPresentation({
    id: String(row.id ?? 'event-log'),
    eventType: String(row.event_type ?? row.eventType ?? 'event'),
    eventCode:
      row.event_code === undefined || row.event_code === null ? null : String(row.event_code),
    message: row.message == null ? null : String(row.message),
    severity: String(row.severity ?? 'info'),
    deviceId:
      row.device_id === undefined || row.device_id === null ? null : String(row.device_id),
    serverTimestamp: timestamp ?? new Date().toISOString(),
  });

const buildRawFeed = (params: {
  telemetryRows: any[];
  sessions: any[];
  errors: any[];
  commands: any[];
  eventLogs: any[];
}): DeviceRawFeedRow[] => {
  const mockDiagnosticsEnabled = process.env.NEXT_PUBLIC_OBD_UI_MOCK === '1';

  const telemetryRows = params.telemetryRows.map((row) => ({
    id: `telemetry-${String(row.timestamp ?? Math.random())}`,
    timestamp: resolveTimestamp(row.timestamp),
    source: 'telemetry' as const,
    event: 'telemetry_snapshot',
    summary: `speed=${row.speed ?? '-'} | latitude=${row.latitude ?? '-'} | longitude=${row.longitude ?? '-'}`,
    payload: row,
  }));

  const sessionRows = params.sessions.map((row) => ({
    id: `session-${String(row.id ?? Math.random())}`,
    timestamp: resolveTimestamp(row.serverSessionStart ?? row.server_session_start ?? row.createdAt),
    source: 'session' as const,
    event: `session_${String(row.status ?? 'unknown')}`,
    summary: `uptime=${row.uptime ?? '-'}s | dataPoints=${row.dataPointsCount ?? row.data_points_count ?? 0}`,
    payload: row,
  }));

  const errorRows = params.errors.map((row) => ({
    id: `error-${String(row.id ?? Math.random())}`,
    timestamp: resolveTimestamp(row.occurredAt ?? row.occurred_at ?? row.createdAt),
    source: 'error' as const,
    event: `error_${String(row.errorCode ?? 'unknown')}`,
    summary: String(row.description ?? row.message ?? '-'),
    payload: row,
  }));

  const commandRows = params.commands.map((row) => ({
    id: `command-${String(row.id ?? Math.random())}`,
    timestamp: resolveTimestamp(row.sentAt ?? row.sent_at ?? row.createdAt),
    source: 'command' as const,
    event: `command_${String(row.command ?? 'unknown')}`,
    summary: `status=${String(row.status ?? 'pending')}`,
    payload: row,
  }));

  const eventLogRows = params.eventLogs.map((row, index) => {
    const normalizedRow = toRecord(row) ?? {};
    const timestamp = resolveTimestamp(
      normalizedRow.event_timestamp ??
        normalizedRow.device_timestamp ??
        normalizedRow.deviceTimestamp ??
        normalizedRow.server_timestamp ??
        normalizedRow.created_at ??
        normalizedRow.createdAt,
    );
    const diagnostics = extractDiagnosticsPayloadFromEventLog(normalizedRow);
    const isDiagnosticsRow = diagnostics !== null;
    const source: DeviceRawFeedRow['source'] = isDiagnosticsRow ? 'obd-diagnostic' : 'event-log';
    const presentation = isDiagnosticsRow ? null : getEventLogPresentation(normalizedRow, timestamp);

    return {
      id: `event-log-${String(normalizedRow.id ?? index)}`,
      timestamp,
      source,
      event: presentation?.title ?? String(normalizedRow.event_type ?? normalizedRow.topic ?? 'event_log'),
      summary: diagnostics
        ? buildDiagnosticsSummary(diagnostics)
        : presentation?.description ??
          String(normalizedRow.message ?? normalizedRow.payload ?? normalizedRow.context ?? '-'),
      payload: diagnostics
        ? { ...normalizedRow, diagnostics }
        : {
            ...normalizedRow,
            localized_title: presentation?.title ?? null,
            localized_message: presentation?.description ?? null,
          },
    };
  });

  const hasDiagnosticsRow = eventLogRows.some((row) => row.source === 'obd-diagnostic');
  const mockRows: DeviceRawFeedRow[] =
    mockDiagnosticsEnabled && !hasDiagnosticsRow
      ? [
          {
            id: 'obd-mock-preview',
            timestamp: new Date().toISOString(),
            source: 'obd-diagnostic',
            event: 'mock_obd_preview',
            summary: 'OBD UI mock | rpm=1650 | speed=38.0 km/h | coolant=92.0 C | load=46.0% | age=900 ms | fail5m=0',
            payload: {
              event_type: 'connection',
              event_code: 'mqtt_bridge_rawdata',
              context: {
                diagnostics: {
                  mil_on: false,
                  reported_dtc_count: 0,
                  channel: {
                    ble_obd_connected: true,
                    elm_ready: true,
                    poll_interval_ms: 1200,
                    connect_fail_count_5m: 0,
                  },
                  signals: {
                    rpm: 1650,
                    obd_speed_kph: 38,
                    coolant_c: 92,
                    fuel_level_pct: 55,
                    engine_load_pct: 46,
                  },
                  quality: {
                    sample_age_ms: 900,
                    missing_signals: [],
                  },
                  dtc: {
                    stored: [],
                    pending: [],
                    permanent: [],
                  },
                },
              },
              message: 'Dòng chẩn đoán mẫu để xem trước giao diện',
            },
          },
        ]
      : [];

  return [...telemetryRows, ...sessionRows, ...errorRows, ...commandRows, ...eventLogRows, ...mockRows]
    .sort((left, right) => {
      const leftTime = left.timestamp ? Date.parse(left.timestamp) : 0;
      const rightTime = right.timestamp ? Date.parse(right.timestamp) : 0;
      return rightTime - leftTime;
    })
    .slice(0, 200);
};

const localizeObdAlertTitle = (title: string): string => {
  const normalized = title.toLowerCase();

  if (normalized.includes('idle-load anomaly')) {
    return 'OBD: Bất thường không tải';
  }
  if (normalized.includes('coolant risk pattern')) {
    return 'OBD: Rủi ro nhiệt độ nước làm mát';
  }
  if (normalized.includes('channel unstable')) {
    return 'OBD: Kênh kết nối không ổn định';
  }
  if (normalized.includes('voltage risk under load')) {
    return 'OBD: Rủi ro điện áp khi tải cao';
  }

  return title;
};

const localizeObdAlertMessage = (message: string): string => {
  const idleLoadMatch = message.match(
    /^RPM\s+([\d.]+)\s+while speed\s+([\d.]+)\s+km\/h\s+for\s+([\d.]+)\s+minutes\.?$/i,
  );
  if (idleLoadMatch) {
    return `Vòng tua ${idleLoadMatch[1]} khi tốc độ ${idleLoadMatch[2]} km/h trong ${idleLoadMatch[3]} phút.`;
  }

  const coolantMatch = message.match(
    /^Coolant\s+([\d.]+)C\s+with engine load\s+([\d.]+)%\s+sustained at runtime\.?$/i,
  );
  if (coolantMatch) {
    return `Nhiệt độ nước làm mát ${coolantMatch[1]}°C với tải động cơ ${coolantMatch[2]}% trong lúc vận hành.`;
  }

  const channelMatch = message.match(
    /^OBD connect\/init failed\s+([\d.]+)\s+times in the last 5 minutes\.?$/i,
  );
  if (channelMatch) {
    return `Kết nối/khởi tạo OBD thất bại ${channelMatch[1]} lần trong 5 phút gần nhất.`;
  }

  const voltageMatch = message.match(
    /^Vehicle battery\s+([\d.]+)V\s+while engine load\s+([\d.]+)%\.?$/i,
  );
  if (voltageMatch) {
    return `Điện áp ắc quy chính ${voltageMatch[1]}V khi tải động cơ ${voltageMatch[2]}%.`;
  }

  return message;
};

const normalizeIdentifier = (value: string | null | undefined) =>
  String(value ?? '').trim().toLowerCase();

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const next = String(value).trim();
  return next.length > 0 ? next : null;
};

const toNullableNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toLinkedVehicle = (raw: Record<string, unknown>): DeviceLinkedVehicle => ({
  id: Number(raw.id ?? 0),
  vehicleId: toNullableString(raw.vehicleId ?? raw.vehicle_id),
  plateNumber: toNullableString(raw.plateNumber ?? raw.plate_number),
  status: toNullableString(raw.status),
  iconType: toNullableString(raw.iconType ?? raw.icon_type),
  fuelType: toNullableString(raw.fuelType ?? raw.fuel_type),
  transmission: toNullableString(raw.transmission),
  notes: toNullableString(raw.notes),
  brand: toNullableString(raw.brand),
  model: toNullableString(raw.model),
  vehicleType: toNullableString(raw.vehicleType ?? raw.vehicle_type),
  year: toNullableNumber(raw.year),
  color: toNullableString(raw.color),
  vin: toNullableString(raw.vin),
  registrationNumber: toNullableString(raw.registrationNumber ?? raw.registration_number),
  insuranceExpiry: toNullableString(raw.insuranceExpiry ?? raw.insurance_expiry),
  createdAt: toNullableString(raw.createdAt ?? raw.created_at),
  updatedAt: toNullableString(raw.updatedAt ?? raw.updated_at),
  deviceId: toNullableString(raw.deviceId ?? raw.device_id),
  customerId: toNullableNumber(raw.customerId ?? raw.customer_id),
  customerName: toNullableString(raw.customerName ?? raw.customer_name),
  customerCode: toNullableString(raw.customerCode ?? raw.customer_code),
  mileageKm: toNullableNumber(raw.mileageKm ?? raw.mileage_km),
  seats: toNullableNumber(raw.seats),
});

const toWorkspaceAlert = (raw: Record<string, unknown>): DeviceWorkspaceAlert => {
  const localized = localizeAlertForDisplay(raw);

  return {
    id: Number(localized.id ?? 0),
    alertType: toNullableString(localized.alertType ?? localized.alert_type),
    severity: toNullableString(localized.severity),
    status: toNullableString(localized.status),
    title: toNullableString(localized.title),
    message: toNullableString(localized.message),
    displayTitle: toNullableString(localized.displayTitle),
    displayMessage: toNullableString(localized.displayMessage),
    createdAt: toNullableString(localized.createdAt ?? localized.created_at),
    updatedAt: toNullableString(localized.updatedAt ?? localized.updated_at),
    acknowledgedAt: toNullableString(localized.acknowledgedAt ?? localized.acknowledged_at),
    acknowledgedBy: toNullableString(localized.acknowledgedBy ?? localized.acknowledged_by),
    resolvedAt: toNullableString(localized.resolvedAt ?? localized.resolved_at),
    resolvedBy: toNullableString(localized.resolvedBy ?? localized.resolved_by),
    resolutionNotes: toNullableString(localized.resolutionNotes ?? localized.resolution_notes),
    vehicleId: toNullableString(localized.vehicleId ?? localized.vehicle_id),
    vehiclePlate: toNullableString(localized.vehiclePlate ?? localized.vehicle_plate),
    deviceId: toNullableString(localized.deviceId ?? localized.device_id),
    deviceName: toNullableString(localized.deviceName ?? localized.device_name),
    customerName: toNullableString(localized.customerName ?? localized.customer_name),
    geofenceId: toNullableNumber(localized.geofenceId ?? localized.geofence_id),
    geofenceName: toNullableString(localized.geofenceName ?? localized.geofence_name),
    latitude: toNullableNumber(localized.latitude),
    longitude: toNullableNumber(localized.longitude),
    actualValue: localized.actualValue ?? null,
    thresholdValue: localized.thresholdValue ?? null,
    rawValue: localized.rawValue ?? null,
    speed: toNullableNumber(localized.speed),
    source: toNullableString(localized.source),
    tripId: toNullableNumber(localized.tripId ?? localized.trip_id),
  };
};

export const DeviceDetailModalContainer = ({
  device,
  fallbackPaths,
  launchPayload,
  launchRequestKey = 0,
  launchTarget = 'overview',
  open,
  onOpenChange,
  presentation = 'dialog',
  workspaceActions,
}: {
  device: Device | null;
  fallbackPaths?: {
    alertsPath: string | null;
    deviceDetailPath: string | null;
    geofencesPath: string;
    vehicleDetailPath: string | null;
  };
  launchPayload?: MapInspectPanelPayload | null;
  launchRequestKey?: number;
  launchTarget?: MapInspectPanelTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presentation?: DeviceDetailModalPresentation;
  workspaceActions?: DeviceWorkspaceActions;
}) => {
  const [activeTab, setActiveTab] = useState<DeviceDetailTab>('overview');
  const queryClient = useQueryClient();
  const lastTelemetryRefreshAtRef = useRef(0);
  const access = useRoleAccess();
  const deviceId = device?.id ?? null;

  const detail = useDeviceDetail(deviceId);
  const sessions = useDeviceSessions(deviceId, { pageSize: 20 });
  const errors = useDeviceErrorCodes(deviceId, 10);
  const commands = useDeviceCommands(deviceId, 10);
  const tracking = useDeviceTrackingTelemetry(deviceId);
  const runtime = useDeviceRuntimeChart(deviceId);
  const updateName = useUpdateDevice();
  const updateSettings = useUpdateDeviceSettings(deviceId);
  const deleteDevice = useDeleteDevice();
  const sendCommand = useSendCommand(deviceId ?? 0);

  const devicePublicId = detail.data?.device?.deviceId ?? device?.deviceId ?? null;
  const linkedVehicleIdentifier = detail.data?.device?.vehicleId ?? device?.vehicleId ?? null;
  useDeviceRoom(devicePublicId, open && !!devicePublicId);
  const position = useDevicePositionSnapshot(devicePublicId, open);
  const eventLogs = useDeviceEventLogs(deviceId, {
    enabled: open && access.canViewSystemInfo,
    limit: 20,
  });
  const obdAlerts = useQuery({
    queryKey: ['device-obd-alerts', devicePublicId],
    enabled: open && !!devicePublicId,
    queryFn: () =>
      alertServices.getList({
        page: 1,
        limit: 10,
        status: 'active',
        source: 'obd',
        deviceId: devicePublicId,
      }),
  });
  const linkedVehicleQuery = useQuery({
    queryKey: ['device-linked-vehicle', linkedVehicleIdentifier, launchPayload?.linkedEntityId],
    enabled:
      open &&
      (Boolean(linkedVehicleIdentifier) ||
        (launchPayload?.linkedEntityType === 'vehicle' && Boolean(launchPayload.linkedEntityId))),
    queryFn: async () => {
      if (launchPayload?.linkedEntityType === 'vehicle' && launchPayload.linkedEntityId) {
        try {
          const response = await vehicleServices.getById(launchPayload.linkedEntityId);
          return toLinkedVehicle((response ?? {}) as Record<string, unknown>);
        } catch {
          // Fall back to public vehicle identifier lookup below.
        }
      }

      if (!linkedVehicleIdentifier) {
        return null;
      }

      const response = await vehicleServices.getList({ search: linkedVehicleIdentifier, limit: 10 });
      const items = (response?.items ?? []) as Record<string, unknown>[];
      const exactMatch =
        items.find(
          (item) =>
            normalizeIdentifier(String(item.vehicleId ?? item.vehicle_id ?? '')) ===
            normalizeIdentifier(linkedVehicleIdentifier),
        ) ?? items[0];

      return exactMatch ? toLinkedVehicle(exactMatch) : null;
    },
  });
  const deviceScopedAlertsQuery = useQuery({
    queryKey: ['device-workspace-alerts', devicePublicId],
    enabled: open && Boolean(devicePublicId),
    queryFn: () =>
      alertServices.getList({
        page: 1,
        limit: 20,
        status: 'active',
        deviceId: devicePublicId,
      }),
  });

  const refreshCurrent = useCallback(async () => {
    if (!deviceId) {
      return;
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['devices'] }),
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-detail', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-sessions', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-errors', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-commands', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-runtime-chart', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-imu-accel-delta-chart', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-tracking-telemetry', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-session-telemetry', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-position-snapshot'] }),
      queryClient.invalidateQueries({ queryKey: ['device-event-logs', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-obd-alerts', devicePublicId] }),
      queryClient.invalidateQueries({ queryKey: ['device-linked-vehicle', linkedVehicleIdentifier] }),
      queryClient.invalidateQueries({ queryKey: ['device-workspace-alerts', devicePublicId] }),
    ]);
  }, [deviceId, devicePublicId, linkedVehicleIdentifier, queryClient]);

  const refreshTelemetryViews = useCallback(async () => {
    if (!deviceId) {
      return;
    }

    const now = Date.now();
    const shouldRefreshHeavyViews =
      now - lastTelemetryRefreshAtRef.current >= TELEMETRY_REFRESH_THROTTLE_MS;

    const invalidations: Array<Promise<unknown>> = [];

    if (shouldRefreshHeavyViews) {
      lastTelemetryRefreshAtRef.current = now;
      invalidations.push(
        queryClient.invalidateQueries({ queryKey: ['device', deviceId] }),
        queryClient.invalidateQueries({ queryKey: ['device-detail', deviceId] }),
        queryClient.invalidateQueries({ queryKey: ['device-tracking-telemetry', deviceId] }),
        queryClient.invalidateQueries({ queryKey: ['device-session-telemetry', deviceId] }),
        queryClient.invalidateQueries({ queryKey: ['device-sessions', deviceId] }),
        queryClient.invalidateQueries({ queryKey: ['device-runtime-chart', deviceId] }),
        queryClient.invalidateQueries({ queryKey: ['device-imu-accel-delta-chart', deviceId] }),
        queryClient.invalidateQueries({ queryKey: ['device-event-logs', deviceId] }),
        queryClient.invalidateQueries({ queryKey: ['device-obd-alerts', devicePublicId] }),
        queryClient.invalidateQueries({ queryKey: ['device-workspace-alerts', devicePublicId] }),
      );
    }

    await Promise.all(invalidations);
  }, [deviceId, devicePublicId, queryClient]);

  useRealtimeSubscription<any>({
    namespace: 'devices',
    event: 'device:status',
    enabled: open && !!devicePublicId,
    handler: (payload) => {
      const payloadId = String(payload?.deviceId ?? payload?.device_id ?? '');
      if (payloadId && payloadId !== devicePublicId) return;
      void refreshCurrent();
    },
  });

  useRealtimeSubscription<any>({
    namespace: 'devices',
    event: 'device:position',
    enabled: open && !!devicePublicId,
    handler: (payload) => {
      const payloadId = String(payload?.deviceId ?? payload?.device_id ?? '');
      if (payloadId && payloadId !== devicePublicId) return;
      void refreshTelemetryViews();
    },
  });

  useRealtimeSubscription<any>({
    namespace: 'devices',
    event: 'device:session_start',
    enabled: open && !!devicePublicId,
    handler: (payload) => {
      const payloadId = String(payload?.deviceId ?? payload?.device_id ?? '');
      if (payloadId && payloadId !== devicePublicId) return;
      void refreshCurrent();
    },
  });

  useRealtimeSubscription<any>({
    namespace: 'devices',
    event: 'device:session_end',
    enabled: open && !!devicePublicId,
    handler: (payload) => {
      const payloadId = String(payload?.deviceId ?? payload?.device_id ?? '');
      if (payloadId && payloadId !== devicePublicId) return;
      void refreshCurrent();
    },
  });

  useRealtimeSubscription<any>({
    namespace: 'devices',
    event: 'device:session_discarded',
    enabled: open && !!devicePublicId,
    handler: (payload) => {
      const payloadId = String(payload?.deviceId ?? payload?.device_id ?? '');
      if (payloadId && payloadId !== devicePublicId) return;
      void refreshCurrent();
    },
  });

  useRealtimeSubscription<any>({
    namespace: 'devices',
    event: 'command:ack',
    enabled: open && !!devicePublicId,
    handler: (payload) => {
      const payloadId = String(payload?.deviceId ?? payload?.device_id ?? '');
      if (payloadId && payloadId !== devicePublicId) return;
      void refreshCurrent();
    },
  });

  const rawFeed = useMemo(
    () =>
      buildRawFeed({
        telemetryRows: tracking.rows,
        sessions: sessions.sessions,
        errors: errors.items,
        commands: commands.items,
        eventLogs: eventLogs.items,
      }),
    [commands.items, errors.items, eventLogs.items, sessions.sessions, tracking.rows],
  );

  const obdActiveAlerts = useMemo(() => {
    const items = (obdAlerts.data?.items ?? obdAlerts.data?.data?.items ?? []) as Record<
      string,
      unknown
    >[];

    return items.filter(isObdMaintenanceAlert).slice(0, 3).map((item) => ({
      id: Number(item.id ?? 0),
      title: localizeObdAlertTitle(String(item.title ?? 'Cảnh báo bảo trì OBD')),
      message:
        item.message == null ? null : localizeObdAlertMessage(String(item.message)),
      severity: (() => {
        const severity = String(item.severity ?? 'medium').toLowerCase();
        if (severity === 'critical') return 'critical';
        if (severity === 'high') return 'high';
        if (severity === 'low') return 'low';
        return 'medium';
      })() as 'low' | 'medium' | 'high' | 'critical',
      createdAt: item.createdAt == null ? null : String(item.createdAt),
    }));
  }, [obdAlerts.data]);
  const deviceScopedAlerts = useMemo(
    () =>
      ((deviceScopedAlertsQuery.data?.items ?? deviceScopedAlertsQuery.data?.data?.items ?? []) as Record<
        string,
        unknown
      >[])
        .map((item) => toWorkspaceAlert(item))
        .sort(
          (left, right) =>
            (Date.parse(right.createdAt ?? '') || 0) - (Date.parse(left.createdAt ?? '') || 0),
        ),
    [deviceScopedAlertsQuery.data],
  );

  const context = useMemo(
    () => ({
      device:
        detail.data?.device || device
          ? ({ ...(device ?? {}), ...(detail.data?.device ?? {}) } as Device)
          : null,
      runtime: detail.data?.runtime ?? null,
      loading: detail.isLoading,
      error: detail.error as Error | null,
      sessions: sessions.sessions,
      sessionsLoading: sessions.isLoading || sessions.isFetching,
      sessionsHasMore: sessions.hasMore,
      onSessionsLoadMore: sessions.onLoadMore,
      errorCodes: errors.items,
      errorCodesTotal: errors.total,
      errorCodesLoadedCount: errors.loadedCount,
      errorCodesHasMore: errors.hasMore,
      errorCodesStatus: errors.status,
      errorCodesType: errors.type,
      onErrorCodesLoadMore: errors.onLoadMore,
      onErrorCodesStatusChange: errors.onStatusChange,
      onErrorCodesTypeChange: errors.onTypeChange,
      commands: commands.items,
      commandsTotal: commands.total,
      commandsLoadedCount: commands.loadedCount,
      commandsHasMore: commands.hasMore,
      onCommandsLoadMore: commands.onLoadMore,
      runtimeChart: runtime.data,
      runtimeRange: runtime.range,
      onRuntimeRangeChange: runtime.onRangeChange,
      trackingRows: tracking.rows,
      trackingRowsAscending: tracking.rowsAscending,
      routeRowsAscending: tracking.routeRowsAscending,
      trackingPeriod: tracking.period,
      onTrackingPeriodChange: tracking.onPeriodChange,
      trackingCustomRange: tracking.customRange,
      onTrackingCustomRangeChange: tracking.onCustomRangeChange,
      routePoints: tracking.routePoints,
      distanceKm: tracking.distanceKm,
      averageSpeed: tracking.averageSpeed,
      maxSpeed: tracking.maxSpeed,
      latestTrackingRow: tracking.latestRow,
      positionSnapshot: position.position,
      eventLogs: eventLogs.items,
      eventLogsTotal: eventLogs.total,
      rawFeed,
      linkedVehicle: linkedVehicleQuery.data ?? null,
      linkedVehicleLoading: linkedVehicleQuery.isLoading || linkedVehicleQuery.isFetching,
      deviceScopedAlerts,
      deviceScopedAlertsLoading:
        deviceScopedAlertsQuery.isLoading || deviceScopedAlertsQuery.isFetching,
      obdActiveAlerts,
      obdAlertsLoading: obdAlerts.isLoading || obdAlerts.isFetching,
      activeTab,
      onTabChange: setActiveTab,
      onUpdateNameId: async (data: Record<string, unknown>) => {
        if (!deviceId) return;
        await updateName.mutateAsync({ id: deviceId, ...data });
      },
      onUpdateSettings: async (data: Record<string, unknown>) => {
        await updateSettings.mutateAsync(data);
        const config = toRecord(data.config);
        const parking = toRecord(config?.parking);
        const commandParams = buildFirmwareConfigCommandParams({
          drivingIntervalSec:
            typeof data.requestInterval === 'number' ? data.requestInterval : null,
          parkingHeartbeatSec:
            typeof parking?.heartbeatIntervalSec === 'number'
              ? parking.heartbeatIntervalSec
              : typeof parking?.heartbeat_interval_s === 'number'
                ? parking.heartbeat_interval_s
                : null,
        });

        if (Object.keys(commandParams).length > 0) {
          try {
            await sendCommand.mutateAsync({
              command: 'update_config',
              params: { ...commandParams },
            });
          } catch {
            notificationUtils.warning(
              'Cấu hình mới chưa được đẩy xuống thiết bị',
              'Cấu hình đã lưu ở server, nhưng lệnh update_config chưa gửi thành công.',
            );
          }
        }
      },
      onDeleteDevice: async () => {
        if (!deviceId) return;
        await deleteDevice.mutateAsync(deviceId);
        onOpenChange(false);
      },
      onSendCommand: async (command: string) => {
        await sendCommand.mutateAsync({ command });
      },
      onRefresh: async () => {
        await refreshCurrent();
        notificationUtils.success('Đã làm mới dữ liệu thiết bị');
      },
      openExportModal: () => undefined,
    }),
    [
      activeTab,
      commands.items,
      commands.onLoadMore,
      commands.hasMore,
      commands.loadedCount,
      commands.total,
      deleteDevice,
      detail.data?.device,
      detail.data?.runtime,
      detail.error,
      detail.isLoading,
      device,
      deviceId,
      errors.items,
      errors.onLoadMore,
      errors.onStatusChange,
      errors.onTypeChange,
      errors.hasMore,
      errors.loadedCount,
      errors.status,
      errors.total,
      errors.type,
      eventLogs.items,
      eventLogs.total,
      deviceScopedAlerts,
      deviceScopedAlertsQuery.isFetching,
      deviceScopedAlertsQuery.isLoading,
      linkedVehicleQuery.data,
      linkedVehicleQuery.isFetching,
      linkedVehicleQuery.isLoading,
      obdActiveAlerts,
      obdAlerts.isFetching,
      obdAlerts.isLoading,
      onOpenChange,
      position.position,
      rawFeed,
      refreshCurrent,
      runtime.data,
      runtime.onRangeChange,
      runtime.range,
      sendCommand,
      sessions.hasMore,
      sessions.isFetching,
      sessions.isLoading,
      sessions.onLoadMore,
      sessions.sessions,
      tracking.averageSpeed,
      tracking.distanceKm,
      tracking.latestRow,
      tracking.maxSpeed,
      tracking.onPeriodChange,
      tracking.onCustomRangeChange,
      tracking.period,
      tracking.customRange,
      tracking.routePoints,
      tracking.rows,
      tracking.rowsAscending,
      tracking.routeRowsAscending,
      updateName,
      updateSettings,
    ],
  );

  return (
    <DeviceDetailModal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setActiveTab('overview');
        }
        onOpenChange(next);
      }}
      context={context}
      fallbackPaths={
        fallbackPaths ?? {
          alertsPath: devicePublicId
            ? buildAlertQueueHref({
                deviceId: devicePublicId,
                vehicleId: linkedVehicleIdentifier,
                status: 'active',
              })
            : null,
          deviceDetailPath: deviceId ? `/dashboard/fleet/devices/${deviceId}` : null,
          geofencesPath: '/dashboard/zones',
          vehicleDetailPath:
            linkedVehicleQuery.data?.id != null
              ? `/dashboard/fleet/vehicles/${linkedVehicleQuery.data.id}`
              : null,
        }
      }
      launchPayload={launchPayload}
      launchRequestKey={launchRequestKey}
      launchTarget={launchTarget}
      presentation={presentation}
      workspaceActions={workspaceActions}
    />
  );
};




