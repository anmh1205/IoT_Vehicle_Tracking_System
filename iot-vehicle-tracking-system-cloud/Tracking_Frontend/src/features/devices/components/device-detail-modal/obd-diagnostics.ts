import type { DeviceRawFeedRow } from '@/features/devices/types';
import { normalizeObdSampleAgeMs } from './normalize-obd-sample-age';

export interface ObdDiagnosticsSnapshot {
  bleConnected?: boolean;
  elmReady?: boolean;
  ecuState?: string;
  sampleAgeMs?: number;
  connectFailCount5m?: number;
  milOn?: boolean;
  reportedDtcCount?: number;
  rpm?: number;
  obdSpeedKph?: number;
  coolantC?: number;
  engineLoadPct?: number;
  dtcStored?: string[];
  dtcPending?: string[];
  dtcPermanent?: string[];
  readinessIncomplete?: string[];
}

const OBD_EVENT_CODES = new Set([
  'obd_diagnostic_raw',
  'obd_live_data',
  'dtc_pending',
  'dtc_stored',
  'dtc_permanent',
  'dtc_cleared',
  'obd_connect_failed',
  'obd_connect_error',
  'obd_channel_unstable',
  'obd_channel_error',
  'obd_ble_connected',
  'obd_ble_disconnected',
  'obd_ble_status',
  'obd_adapter_ready',
  'obd_ecu_live',
  'obd_ecu_stopped',
  'obd_ecu_no_data',
  'obd_ecu_searching',
]);
const OBD_LIVE_SIGNAL_MAX_SAMPLE_AGE_MS = 30_000;

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const toStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized = value
    .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
    .filter((item) => item.length > 0);

  return normalized.length > 0 ? normalized : undefined;
};

const hasFreshObdSignals = (
  channel: Record<string, unknown> | null,
  sampleAgeMs: number | undefined,
): boolean =>
  channel?.ble_obd_connected === true &&
  channel?.elm_ready === true &&
  sampleAgeMs !== undefined &&
  sampleAgeMs <= OBD_LIVE_SIGNAL_MAX_SAMPLE_AGE_MS;

const toDtcList = (value: unknown): string[] | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim().toUpperCase()];
  }
  return toStringArray(value);
};

const resolveEcuState = (params: {
  eventCode: string;
  context: Record<string, unknown>;
  metadata: Record<string, unknown>;
  message: string;
  hasDtc: boolean;
}): string | undefined => {
  const channelEcuState =
    toOptionalString(params.context.ecu_state) ??
    toOptionalString(params.metadata.ecu_state) ??
    toOptionalString(params.metadata.ecuState);
  if (channelEcuState) {
    return channelEcuState.toLowerCase();
  }

  if (
    params.eventCode.includes('connect_failed') ||
    params.eventCode.includes('connect_error') ||
    params.message.includes('fail')
  ) {
    return 'error';
  }
  if (params.eventCode.includes('search')) {
    return 'searching';
  }
  if (params.eventCode.includes('stopped')) {
    return 'stopped';
  }
  if (
    params.eventCode.includes('obd') ||
    params.eventCode.includes('dtc') ||
    params.eventCode.includes('rawdata') ||
    params.hasDtc
  ) {
    return 'live';
  }

  return undefined;
};

const isLikelyObdEventLog = (row: Record<string, unknown>): boolean => {
  const eventCode = String(row.event_code ?? '').trim().toLowerCase();
  const eventType = String(row.event_type ?? '').trim().toLowerCase();
  const message = String(row.message ?? '').trim().toLowerCase();
  const context = toRecord(row.context);
  const metadata = toRecord(row.metadata);
  const dtc = metadata?.dtc ?? row.dtc;

  if (toRecord(row.diagnostics) || toRecord(context?.diagnostics)) {
    return true;
  }
  if (OBD_EVENT_CODES.has(eventCode)) {
    return true;
  }
  if (typeof dtc === 'string' || Array.isArray(dtc)) {
    return true;
  }
  if (message.includes('obd') || message.includes('dtc') || message.includes('ecu')) {
    return true;
  }
  if (
    eventType === 'error' &&
    (metadata?.dtc !== undefined || message.includes('fault') || message.includes('engine'))
  ) {
    return true;
  }
  return false;
};

export const extractDiagnosticsPayloadFromEventLog = (
  row: Record<string, unknown>,
): Record<string, unknown> | null => {
  const rootDiagnostics = toRecord(row.diagnostics);
  if (rootDiagnostics) {
    return rootDiagnostics;
  }

  const context = toRecord(row.context);
  const contextDiagnostics = toRecord(context?.diagnostics);
  if (contextDiagnostics) {
    return contextDiagnostics;
  }

  if (!isLikelyObdEventLog(row)) {
    return null;
  }

  const metadata = toRecord(row.metadata) ?? {};
  const eventCode = String(row.event_code ?? '').trim().toLowerCase();
  const message = String(row.message ?? '').trim().toLowerCase();
  const pendingDtc =
    eventCode === 'dtc_pending'
      ? toDtcList(metadata.dtc ?? row.dtc)
      : toDtcList(metadata.pendingDtc ?? metadata.pending_dtc);
  const storedDtc =
    eventCode === 'dtc_stored'
      ? toDtcList(metadata.dtc ?? row.dtc)
      : toDtcList(metadata.storedDtc ?? metadata.stored_dtc);
  const permanentDtc =
    eventCode === 'dtc_permanent'
      ? toDtcList(metadata.dtc ?? row.dtc)
      : toDtcList(metadata.permanentDtc ?? metadata.permanent_dtc);
  const sampleAgeMs = normalizeObdSampleAgeMs(
    context?.sample_age_ms ??
      context?.sampleAgeMs ??
      metadata.sample_age_ms ??
      metadata.sampleAgeMs,
  );
  const hasDtc =
    (pendingDtc?.length ?? 0) > 0 ||
    (storedDtc?.length ?? 0) > 0 ||
    (permanentDtc?.length ?? 0) > 0;

  const ecuState = resolveEcuState({
    eventCode,
    context: context ?? {},
    metadata,
    message,
    hasDtc,
  });

  const bleConnected =
    eventCode.includes('disconnected')
      ? false
      : eventCode.includes('connect_failed')
        ? false
        : true;
  const elmReady =
    eventCode.includes('connect_failed') || eventCode.includes('searching') ? false : true;

  return {
    mil_on:
      metadata.mil_on ??
      metadata.milOn ??
      hasDtc,
    reported_dtc_count:
      metadata.reported_dtc_count ??
      metadata.reportedDtcCount ??
      (pendingDtc?.length ?? 0) + (storedDtc?.length ?? 0) + (permanentDtc?.length ?? 0),
    channel: {
      ble_obd_connected: bleConnected,
      elm_ready: elmReady,
      ecu_state: ecuState,
      connect_fail_count_5m:
        context?.connect_fail_count_5m ??
        context?.connectFailCount5m ??
        metadata.connect_fail_count_5m ??
        metadata.connectFailCount5m,
    },
    signals: {
      rpm: context?.rpm ?? metadata.rpm,
      obd_speed_kph:
        context?.obd_speed_kph ??
        context?.speed_kph ??
        metadata.obd_speed_kph ??
        metadata.speed_kph,
      coolant_c:
        context?.coolant_c ??
        context?.coolant ??
        context?.temp ??
        metadata.coolant_c ??
        metadata.coolant ??
        metadata.temp,
      engine_load_pct:
        context?.engine_load_pct ??
        context?.load_pct ??
        metadata.engine_load_pct ??
        metadata.load_pct,
    },
    quality: {
      sample_age_ms: sampleAgeMs,
    },
    dtc: {
      stored: storedDtc ?? [],
      pending: pendingDtc ?? [],
      permanent: permanentDtc ?? [],
    },
  };
};

export const snapshotFromDiagnosticsPayload = (
  diagnostics: Record<string, unknown> | null,
  readinessLabel: Record<string, string> = {},
): ObdDiagnosticsSnapshot | null => {
  if (!diagnostics) {
    return null;
  }

  const channel = toRecord(diagnostics.channel);
  const signals = toRecord(diagnostics.signals);
  const quality = toRecord(diagnostics.quality);
  const dtc = toRecord(diagnostics.dtc);
  const readiness = toRecord(diagnostics.readiness);
  const sampleAgeMs = normalizeObdSampleAgeMs(quality?.sample_age_ms);
  const liveSignals = hasFreshObdSignals(channel, sampleAgeMs) ? signals : null;
  const readinessIncomplete = readiness
    ? Object.entries(readiness)
        .filter(([, status]) => status === 'incomplete')
        .map(([key]) => readinessLabel[key] ?? key)
    : undefined;

  return {
    bleConnected:
      channel?.ble_obd_connected === undefined ? undefined : Boolean(channel.ble_obd_connected),
    elmReady: channel?.elm_ready === undefined ? undefined : Boolean(channel.elm_ready),
    ecuState: toOptionalString(channel?.ecu_state),
    sampleAgeMs,
    connectFailCount5m: toFiniteNumber(channel?.connect_fail_count_5m),
    milOn: diagnostics.mil_on === undefined ? undefined : Boolean(diagnostics.mil_on),
    reportedDtcCount: toFiniteNumber(diagnostics.reported_dtc_count),
    rpm: toFiniteNumber(liveSignals?.rpm),
    obdSpeedKph: toFiniteNumber(liveSignals?.obd_speed_kph),
    coolantC: toFiniteNumber(liveSignals?.coolant_c),
    engineLoadPct: toFiniteNumber(liveSignals?.engine_load_pct),
    dtcStored: toStringArray(dtc?.stored),
    dtcPending: toStringArray(dtc?.pending),
    dtcPermanent: toStringArray(dtc?.permanent),
    readinessIncomplete,
  };
};

export const extractDiagnosticsSnapshotFromRow = (
  row: Pick<DeviceRawFeedRow, 'source' | 'payload'>,
  readinessLabel: Record<string, string> = {},
): ObdDiagnosticsSnapshot | null => {
  if (row.source !== 'obd-diagnostic') {
    return null;
  }

  const payload = toRecord(row.payload);
  if (!payload) {
    return null;
  }

  return snapshotFromDiagnosticsPayload(
    extractDiagnosticsPayloadFromEventLog(payload),
    readinessLabel,
  );
};

export const extractLatestDiagnosticsSnapshot = (
  rawFeed: DeviceRawFeedRow[],
  readinessLabel: Record<string, string> = {},
): ObdDiagnosticsSnapshot | null => {
  for (const row of rawFeed) {
    const snapshot = extractDiagnosticsSnapshotFromRow(row, readinessLabel);
    if (snapshot) {
      return snapshot;
    }
  }

  return null;
};

export const buildDiagnosticsSummary = (diagnostics: Record<string, unknown>): string => {
  const snapshot = snapshotFromDiagnosticsPayload(diagnostics);
  if (!snapshot) {
    return 'Không đọc được snapshot OBD';
  }

  const parts = [
    snapshot.ecuState === 'stopped'
      ? 'ECU dừng'
      : snapshot.ecuState === 'live'
        ? 'OBD ổn định'
        : snapshot.bleConnected === true && snapshot.elmReady === true
          ? 'OBD đã nối'
          : 'OBD không ổn định',
    `mil=${snapshot.milOn === undefined ? '-' : snapshot.milOn ? 'on' : 'off'}`,
    `rpm=${snapshot.rpm?.toFixed(0) ?? '-'}`,
    `speed=${snapshot.obdSpeedKph?.toFixed(1) ?? '-'} km/h`,
    `coolant=${snapshot.coolantC?.toFixed(1) ?? '-'} C`,
    `load=${snapshot.engineLoadPct?.toFixed(1) ?? '-'}%`,
    `age=${snapshot.sampleAgeMs?.toFixed(0) ?? '-'} ms`,
  ];

  if (snapshot.ecuState && snapshot.ecuState !== 'live' && snapshot.ecuState !== 'stopped') {
    parts.push(`ecu=${snapshot.ecuState}`);
  }
  if (snapshot.connectFailCount5m !== undefined) {
    parts.push(`fail5m=${snapshot.connectFailCount5m.toFixed(0)}`);
  }
  if ((snapshot.dtcStored?.length ?? 0) > 0) {
    parts.push(`stored=${snapshot.dtcStored?.join(',')}`);
  }
  if ((snapshot.dtcPending?.length ?? 0) > 0) {
    parts.push(`pending=${snapshot.dtcPending?.join(',')}`);
  }
  if ((snapshot.dtcPermanent?.length ?? 0) > 0) {
    parts.push(`permanent=${snapshot.dtcPermanent?.join(',')}`);
  }

  return parts.join(' | ');
};
