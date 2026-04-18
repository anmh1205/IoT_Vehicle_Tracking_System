'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { useRoleAccess } from '@/hooks/use-role-access';
import { alertServices } from '@/lib/api/alerts';
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
import { DeviceDetailModal } from './index';
import type { DeviceDetailTab } from '@/features/devices/components/device-constants';

const resolveTimestamp = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const extractDiagnosticsPayload = (
  row: Record<string, unknown>,
): Record<string, unknown> | null => {
  const rootDiagnostics = toRecord(row.diagnostics);
  if (rootDiagnostics) {
    return rootDiagnostics;
  }

  const context = toRecord(row.context);
  if (!context) {
    return null;
  }

  return toRecord(context.diagnostics);
};

const buildDiagnosticsSummary = (diagnostics: Record<string, unknown>): string => {
  const channel = toRecord(diagnostics.channel);
  const signals = toRecord(diagnostics.signals);
  const quality = toRecord(diagnostics.quality);
  const dtc = toRecord(diagnostics.dtc);

  const ecuState =
    typeof channel?.ecu_state === 'string' && channel.ecu_state.trim().length > 0
      ? channel.ecu_state.trim().toLowerCase()
      : null;
  const connected = channel?.ble_obd_connected === true && channel?.elm_ready === true;
  const rpm = toFiniteNumber(signals?.rpm);
  const speed = toFiniteNumber(signals?.obd_speed_kph);
  const coolant = toFiniteNumber(signals?.coolant_c);
  const load = toFiniteNumber(signals?.engine_load_pct);
  const sampleAgeMs = toFiniteNumber(quality?.sample_age_ms);
  const failCount = toFiniteNumber(channel?.connect_fail_count_5m);
  const storedDtc = Array.isArray(dtc?.stored)
    ? dtc.stored.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  const pendingDtc = Array.isArray(dtc?.pending)
    ? dtc.pending.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  const permanentDtc = Array.isArray(dtc?.permanent)
    ? dtc.permanent.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  const milOn = diagnostics.mil_on === undefined ? undefined : Boolean(diagnostics.mil_on);

  const parts = [
    ecuState === 'stopped'
      ? 'ECU dừng'
      : ecuState === 'live'
        ? 'OBD ổn định'
        : connected
          ? 'OBD đã nối'
          : 'OBD không ổn định',
    `mil=${milOn === undefined ? '-' : milOn ? 'on' : 'off'}`,
    `rpm=${rpm?.toFixed(0) ?? '-'}`,
    `spd=${speed?.toFixed(1) ?? '-'} km/h`,
    `coolant=${coolant?.toFixed(1) ?? '-'} C`,
    `load=${load?.toFixed(1) ?? '-'}%`,
    `age=${sampleAgeMs?.toFixed(0) ?? '-'} ms`,
  ];

  if (ecuState && ecuState !== 'live' && ecuState !== 'stopped') {
    parts.push(`ecu=${ecuState}`);
  }
  if (failCount !== undefined) {
    parts.push(`fail5m=${failCount.toFixed(0)}`);
  }
  if (storedDtc.length > 0) {
    parts.push(`stored=${storedDtc.join(',')}`);
  }
  if (pendingDtc.length > 0) {
    parts.push(`pending=${pendingDtc.join(',')}`);
  }
  if (permanentDtc.length > 0) {
    parts.push(`permanent=${permanentDtc.join(',')}`);
  }

  return parts.join(' | ');
};

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
    summary: `spd=${row.speed ?? '-'} | lat=${row.latitude ?? '-'} | lon=${row.longitude ?? '-'}`,
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
    event: `error_${String(row.errorCode ?? row.error_code ?? 'unknown')}`,
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
    const diagnostics = extractDiagnosticsPayload(normalizedRow);
    const eventCode = String(normalizedRow.event_code ?? '').toLowerCase();
    const isDiagnosticsRow =
      diagnostics !== null ||
      eventCode === 'obd_diagnostic_raw';
    const source: DeviceRawFeedRow['source'] = isDiagnosticsRow ? 'obd-diagnostic' : 'event-log';

    return {
      id: `event-log-${String(normalizedRow.id ?? index)}`,
      timestamp: resolveTimestamp(
        normalizedRow.server_timestamp ?? normalizedRow.created_at ?? normalizedRow.createdAt,
      ),
      source,
      event: String(normalizedRow.event_type ?? normalizedRow.topic ?? 'event_log'),
      summary: diagnostics
        ? buildDiagnosticsSummary(diagnostics)
        : String(normalizedRow.message ?? normalizedRow.payload ?? normalizedRow.context ?? '-'),
      payload: normalizedRow,
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
            summary: 'OBD UI mock | rpm=1650 | spd=38.0 km/h | coolant=92.0 C | load=46.0% | age=900 ms | fail5m=0',
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
              message: 'Mock diagnostics row for UI preview',
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

const isObdMaintenanceAlert = (item: Record<string, unknown>): boolean => {
  const title = String(item.title ?? '').toLowerCase();
  const message = String(item.message ?? '').toLowerCase();
  const signature = `${title} ${message}`;

  return (
    item.alertType === 'maintenance_due' &&
    (signature.includes('obd') ||
      signature.includes('coolant') ||
      signature.includes('voltage') ||
      signature.includes('idle-load') ||
      signature.includes('channel'))
  );
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
    /^Battery top\s+([\d.]+)V\s+while engine load\s+([\d.]+)%\.?$/i,
  );
  if (voltageMatch) {
    return `Điện áp ắc quy chính ${voltageMatch[1]}V khi tải động cơ ${voltageMatch[2]}%.`;
  }

  return message;
};

export const DeviceDetailModalContainer = ({
  device,
  open,
  onOpenChange,
}: {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [activeTab, setActiveTab] = useState<DeviceDetailTab>('overview');
  const queryClient = useQueryClient();
  const access = useRoleAccess();
  const deviceId = device?.id ?? null;

  const detail = useDeviceDetail(deviceId);
  const sessions = useDeviceSessions(deviceId, { pageSize: 10 });
  const errors = useDeviceErrorCodes(deviceId, 10);
  const commands = useDeviceCommands(deviceId, 10);
  const tracking = useDeviceTrackingTelemetry(deviceId);
  const runtime = useDeviceRuntimeChart(deviceId);
  const updateName = useUpdateDevice();
  const updateSettings = useUpdateDeviceSettings(deviceId);
  const deleteDevice = useDeleteDevice();
  const sendCommand = useSendCommand(deviceId ?? 0);

  const devicePublicId = detail.data?.device?.deviceId ?? device?.deviceId ?? null;
  const position = useDevicePositionSnapshot(devicePublicId, open);
  const eventLogs = useDeviceEventLogs(devicePublicId, {
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
        alertType: 'maintenance_due',
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
      queryClient.invalidateQueries({ queryKey: ['device-vibration-chart', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-tracking-telemetry', deviceId] }),
      queryClient.invalidateQueries({ queryKey: ['device-position-snapshot'] }),
      queryClient.invalidateQueries({ queryKey: ['device-event-logs', devicePublicId] }),
      queryClient.invalidateQueries({ queryKey: ['device-obd-alerts', devicePublicId] }),
    ]);
  }, [deviceId, devicePublicId, queryClient]);

  useRealtimeSubscription<any>({
    event: 'device:status',
    enabled: open && !!deviceId,
    handler: (payload) => {
      const payloadId = String(payload?.device_id ?? payload?.deviceId ?? '');
      if (payloadId && payloadId !== String(detail.data?.device?.deviceId)) return;
      void refreshCurrent();
    },
  });

  useRealtimeSubscription<any>({
    event: 'device:session_start',
    enabled: open && !!deviceId,
    handler: (payload) => {
      const payloadId = String(payload?.device_id ?? payload?.deviceId ?? '');
      if (payloadId && payloadId !== String(detail.data?.device?.deviceId)) return;
      void refreshCurrent();
    },
  });

  useRealtimeSubscription<any>({
    event: 'device:session_end',
    enabled: open && !!deviceId,
    handler: (payload) => {
      const payloadId = String(payload?.device_id ?? payload?.deviceId ?? '');
      if (payloadId && payloadId !== String(detail.data?.device?.deviceId)) return;
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
      errorCodesPage: errors.page,
      errorCodesStatus: errors.status,
      errorCodesType: errors.type,
      onErrorCodesPageChange: errors.onPageChange,
      onErrorCodesStatusChange: errors.onStatusChange,
      onErrorCodesTypeChange: errors.onTypeChange,
      commands: commands.items,
      commandsTotal: commands.total,
      commandsPage: commands.page,
      commandsTotalPages: commands.totalPages,
      onCommandsPageChange: commands.onPageChange,
      runtimeChart: runtime.data,
      runtimeRange: runtime.range,
      onRuntimeRangeChange: runtime.onRangeChange,
      trackingRows: tracking.rows,
      trackingRowsAscending: tracking.rowsAscending,
      trackingPeriod: tracking.period,
      onTrackingPeriodChange: tracking.onPeriodChange,
      routePoints: tracking.routePoints,
      distanceKm: tracking.distanceKm,
      averageSpeed: tracking.averageSpeed,
      maxSpeed: tracking.maxSpeed,
      latestTrackingRow: tracking.latestRow,
      positionSnapshot: position.position,
      eventLogs: eventLogs.items,
      eventLogsTotal: eventLogs.total,
      rawFeed,
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
        const requestInterval = Number(data.requestInterval);
        if (
          Number.isFinite(requestInterval) &&
          requestInterval > 0 &&
          requestInterval !== (detail.data?.device?.requestInterval ?? device?.requestInterval)
        ) {
          try {
            await sendCommand.mutateAsync({
              command: 'update_config',
              params: {
                tracking_interval_s: Math.round(requestInterval),
              },
            });
          } catch {
            notificationUtils.warning(
              'Chu kỳ mới chưa được đẩy xuống thiết bị',
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
      commands.onPageChange,
      commands.page,
      commands.total,
      commands.totalPages,
      deleteDevice,
      detail.data?.device,
      detail.data?.runtime,
      detail.error,
      detail.isLoading,
      device,
      deviceId,
      errors.items,
      errors.onPageChange,
      errors.onStatusChange,
      errors.onTypeChange,
      errors.page,
      errors.status,
      errors.total,
      errors.type,
      eventLogs.items,
      eventLogs.total,
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
      tracking.period,
      tracking.routePoints,
      tracking.rows,
      tracking.rowsAscending,
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
    />
  );
};




