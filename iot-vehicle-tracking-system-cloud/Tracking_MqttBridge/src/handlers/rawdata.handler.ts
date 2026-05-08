import { rawDataSchema } from '../validators/payload.validator';
import type { RawDataPayload, RawDiagnostics } from '../types/payload.types';
import {
  ensureDeviceSession,
  findDeviceSessionIdByIdentity,
  syncActiveMaintenanceAlertsByMessage,
  syncActiveMaintenanceAlertsByTitle,
  syncActiveObdDtcAlerts,
  touchDeviceSession,
  validateDevice,
} from '../infrastructure/database';
import { writeDeviceTelemetry } from '../infrastructure/victoriametrics';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { getStatus, resolveSessionId, setStatus } from '../cache/device-state.cache';
import { addUpdate } from '../services/batch-writer.service';
import { checkGeofences } from '../services/geofence-checker.service';
import { logger } from '../infrastructure/logger';
import { normalizePayloadTimestamp } from '../utils/timestamp.util';
import { resolveLocalSessionKey } from '../utils/session-identity.util';
import { normalizeRuntimeState, type RuntimeStateSnapshot } from '../types/device-state.types';
import {
  hasAuthoritativeSessionIdentity,
  telemetryReportsEngineOff,
} from '../utils/session-runtime.util';

const IMU_ACCEL_DELTA_ALERT_THRESHOLD_MPS2 = 3.5;
const HIGH_IMU_ACCEL_DELTA_ALERT_TITLE = 'high_imu_accel_delta';
const HIGH_IMU_ACCEL_DELTA_ALERT_RESOLUTION_NOTES =
  'Auto-resolved by mqtt bridge: IMU acceleration delta returned below threshold in latest telemetry snapshot.';
const OBD_RULE_COOLDOWN_MS = 15 * 60 * 1000;
const OBD_IDLE_ANOMALY_MIN_DURATION_MS = 10 * 60 * 1000;
const OBD_CHANNEL_UNSTABLE_THRESHOLD = 3;
const OBD_COOLANT_HIGH_C = 105;
const OBD_HIGH_ENGINE_LOAD = 60;
const OBD_IDLE_RPM_THRESHOLD = 900;
const OBD_IDLE_SPEED_MAX_KPH = 3;
const OBD_VOLTAGE_LOW_V = 12;
const OBD_VOLTAGE_LOAD_MIN = 50;
const OBD_LIVE_SIGNAL_MAX_SAMPLE_AGE_MS = 30_000;
const OBD_DTC_MAX_SAMPLE_AGE_MS = 60_000;
const OBD_SAMPLE_AGE_SENTINEL_MS = 0xffffffff;
const OBD_RULE_MAINTENANCE_TITLES = [
  'OBD: Channel unstable',
  'OBD: Coolant risk pattern',
  'OBD: Idle-load anomaly',
  'OBD: Voltage risk under load',
] as const;
const OBD_CONNECT_WARNING_TITLE = 'device_warning';
const OBD_CONNECT_WARNING_MESSAGE = 'obd_connect_failed';
const SESSION_FALLBACK_BOUNDARY_SOURCE = 'bridge_fallback';
const SESSION_FALLBACK_SPEED_THRESHOLD_KPH = 3;
const GENERIC_DTC_ACTION =
  'Doc freeze frame, tra cuu tai lieu hang/SAE va kiem tra he thong lien quan den ma loi nay.';

const ruleCooldownUntil = new Map<string, number>();
const idleAnomalyStartedAt = new Map<string, number>();
const activeDtcRuleKeysByDevice = new Map<string, Set<string>>();

const buildSanitizedRawPayload = (payload: RawDataPayload): Omit<RawDataPayload, 'auth_token'> => {
  const { auth_token: _authToken, ...safePayload } = payload;
  return safePayload;
};

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
type DtcBucket = 'stored' | 'pending' | 'permanent';

interface DtcRuleDefinition {
  matches: (code: string) => boolean;
  severity: AlertSeverity;
  confidence: number;
  action: string;
}

const DTC_CODE_PATTERN = /^[PCBU][0-3][0-9A-F]{3}$/i;

const matchesDtcRange = (code: string, prefix: string, start: number, end: number): boolean => {
  if (!code.startsWith(prefix)) {
    return false;
  }

  const suffix = Number.parseInt(code.slice(1), 16);
  return Number.isFinite(suffix) && suffix >= start && suffix <= end;
};

const dtcRuleDefinitions: DtcRuleDefinition[] = [
  {
    matches: (code) => matchesDtcRange(code, 'P', 0x300, 0x308),
    severity: 'high',
    confidence: 0.92,
    action: 'Kiểm tra misfire, bugi, cuộn đánh lửa và kim phun; hạn chế tải cao cho tới khi xử lý.',
  },
  {
    matches: (code) => matchesDtcRange(code, 'P', 0x100, 0x104),
    severity: 'medium',
    confidence: 0.82,
    action: 'Inspect MAF sensor, air filter, intake path, and related wiring.',
  },
  {
    matches: (code) => matchesDtcRange(code, 'P', 0x115, 0x119),
    severity: 'medium',
    confidence: 0.8,
    action: 'Inspect coolant temperature sensor, connector, and signal circuit.',
  },
  {
    matches: (code) => code === 'P0171' || code === 'P0174',
    severity: 'high',
    confidence: 0.88,
    action: 'Kiểm tra rò khí nạp, MAF và áp suất nhiên liệu.',
  },
  {
    matches: (code) => code === 'P0172',
    severity: 'medium',
    confidence: 0.82,
    action: 'Kiểm tra rich condition, kim phun và cảm biến liên quan.',
  },
  {
    matches: (code) => code === 'P0128',
    severity: 'medium',
    confidence: 0.8,
    action: 'Kiểm tra thermostat và hệ thống làm mát.',
  },
  {
    matches: (code) => ['P0130', 'P0133', 'P0141'].includes(code),
    severity: 'medium',
    confidence: 0.8,
    action: 'Kiểm tra cảm biến O2, heater và wiring.',
  },
  {
    matches: (code) => code === 'P0420' || code === 'P0430',
    severity: 'medium',
    confidence: 0.78,
    action: 'Kiểm tra catalyst và chuỗi cảm biến O2 trước/sau catalyst.',
  },
  {
    matches: (code) => ['P0440', 'P0442', 'P0455', 'P0456'].includes(code),
    severity: 'low',
    confidence: 0.72,
    action: 'Kiểm tra nắp bình nhiên liệu và rò rỉ EVAP.',
  },
  {
    matches: (code) => code === 'P0562',
    severity: 'high',
    confidence: 0.9,
    action: 'Kiểm tra ắc quy, alternator và đường sạc.',
  },
  {
    matches: (code) => code === 'P0563',
    severity: 'high',
    confidence: 0.88,
    action: 'Kiểm tra regulator và điện áp sạc quá áp.',
  },
  {
    matches: (code) => matchesDtcRange(code, 'P', 0x500, 0x503),
    severity: 'medium',
    confidence: 0.78,
    action: 'Inspect vehicle speed sensor, ABS ECU signal, and related wiring.',
  },
  {
    matches: (code) => ['P0700', 'P0715', 'P0720', 'P0730', 'P0740'].includes(code),
    severity: 'medium',
    confidence: 0.76,
    action: 'Kiểm tra hộp số/TCM và chuỗi tín hiệu đầu vào liên quan.',
  },
];

const toFiniteNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const resolveImuAccelDeltaMps2 = (
  data: RawDataPayload['data'] | undefined,
): number | undefined => {
  if (!data) {
    return undefined;
  }

  return toFiniteNumber(data.imu_accel_delta_mps2 ?? data.vibration);
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }
  return undefined;
};

const normalizeGnssLocation = (
  latitude: number | undefined,
  longitude: number | undefined,
  satellites: number | undefined,
): {
  latitude: number | undefined;
  longitude: number | undefined;
  speedAllowed: boolean;
} => {
  if (latitude === undefined || longitude === undefined) {
    return {
      latitude,
      longitude,
      speedAllowed: false,
    };
  }

  if (latitude === 0 && longitude === 0 && (satellites ?? 0) === 0) {
    return {
      latitude: undefined,
      longitude: undefined,
      speedAllowed: false,
    };
  }

  return {
    latitude,
    longitude,
    speedAllowed: true,
  };
};

const isLikelyActiveSessionTelemetry = (params: {
  ignition?: boolean;
  speed?: number;
  runtimeState: RuntimeStateSnapshot;
  previousStatus?: 'online' | 'offline' | 'running' | 'stopped';
  persistedStatus?: string;
}): boolean => {
  if (telemetryReportsEngineOff({ ignition: params.ignition, runtimeState: params.runtimeState })) {
    return false;
  }

  if (params.ignition === true || params.runtimeState.ignition_state === 'ON') {
    return true;
  }

  if (
    params.runtimeState.motion_state === 'MOVING' ||
    (params.speed !== undefined && params.speed > SESSION_FALLBACK_SPEED_THRESHOLD_KPH)
  ) {
    return true;
  }

  return params.previousStatus === 'running' || params.persistedStatus === 'running';
};

const getRuleKey = (deviceId: string, ruleId: string) => `${deviceId}:${ruleId}`;

const canEmitRule = (deviceId: string, ruleId: string, timestampMs: number): boolean => {
  const key = getRuleKey(deviceId, ruleId);
  const blockedUntil = ruleCooldownUntil.get(key) ?? 0;
  if (timestampMs < blockedUntil) {
    return false;
  }
  ruleCooldownUntil.set(key, timestampMs + OBD_RULE_COOLDOWN_MS);
  return true;
};

const normalizeDtcCodes = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? '').trim().toUpperCase())
        .filter((item) => DTC_CODE_PATTERN.test(item)),
    ),
  );
};

const bumpSeverity = (severity: AlertSeverity): AlertSeverity => {
  if (severity === 'low') return 'medium';
  if (severity === 'medium') return 'high';
  if (severity === 'high') return 'critical';
  return 'critical';
};

const lowerSeverity = (severity: AlertSeverity): AlertSeverity => {
  if (severity === 'critical') return 'high';
  if (severity === 'high') return 'medium';
  if (severity === 'medium') return 'low';
  return 'low';
};

const resolveDtcRule = (code: string): DtcRuleDefinition | null =>
  dtcRuleDefinitions.find((definition) => definition.matches(code)) ?? null;

const deriveGenericDtcSeverity = (buckets: Set<DtcBucket>): AlertSeverity => {
  if (buckets.has('permanent')) return 'high';
  if (buckets.has('stored')) return 'medium';
  return 'low';
};

const resolveDtcDefinition = (
  code: string,
  buckets: Set<DtcBucket>,
): Pick<DtcRuleDefinition, 'severity' | 'confidence' | 'action'> => {
  const matchedRule = resolveDtcRule(code);
  if (matchedRule) {
    return matchedRule;
  }

  return {
    severity: deriveGenericDtcSeverity(buckets),
    confidence: buckets.has('permanent') ? 0.78 : buckets.has('stored') ? 0.72 : 0.62,
    action: GENERIC_DTC_ACTION,
  };
};

const syncDtcCooldownState = (deviceId: string, currentRuleKeys: Set<string>): void => {
  const previousRuleKeys = activeDtcRuleKeysByDevice.get(deviceId);
  previousRuleKeys?.forEach((ruleKey) => {
    if (!currentRuleKeys.has(ruleKey)) {
      ruleCooldownUntil.delete(getRuleKey(deviceId, ruleKey));
    }
  });

  if (currentRuleKeys.size > 0) {
    activeDtcRuleKeysByDevice.set(deviceId, new Set(currentRuleKeys));
    return;
  }

  activeDtcRuleKeysByDevice.delete(deviceId);
};

const describeDtcBuckets = (buckets: Set<DtcBucket>): string => {
  const ordered = (['stored', 'pending', 'permanent'] as DtcBucket[]).filter((bucket) =>
    buckets.has(bucket),
  );
  return ordered.join('/');
};

const normalizeObdSampleAgeMs = (value: unknown): number | undefined => {
  const parsed = toFiniteNumber(value);
  if (parsed === undefined || parsed < 0) {
    return undefined;
  }

  return parsed >= OBD_SAMPLE_AGE_SENTINEL_MS ? undefined : parsed;
};

const hasFreshObdSignals = (
  diagnostics: RawDiagnostics | undefined,
  normalizedSampleAgeMs: number | undefined,
): boolean => {
  const connected = toBoolean(diagnostics?.channel?.ble_obd_connected);
  const elmReady = toBoolean(diagnostics?.channel?.elm_ready);

  return connected === true &&
    elmReady === true &&
    normalizedSampleAgeMs !== undefined &&
    normalizedSampleAgeMs <= OBD_LIVE_SIGNAL_MAX_SAMPLE_AGE_MS;
};

const normalizeDiagnosticsForStorage = (
  diagnostics: RawDiagnostics | undefined,
  normalizedSampleAgeMs: number | undefined,
  signalsFresh: boolean,
): RawDiagnostics | undefined => {
  if (!diagnostics) {
    return undefined;
  }

  const normalized: RawDiagnostics = { ...diagnostics };
  if (diagnostics.quality) {
    normalized.quality = { ...diagnostics.quality };
    if (normalizedSampleAgeMs === undefined) {
      delete normalized.quality.sample_age_ms;
    } else {
      normalized.quality.sample_age_ms = normalizedSampleAgeMs;
    }
  }
  if (!signalsFresh) {
    delete normalized.signals;
  }
  return normalized;
};

const hasValidDtcQualityGate = (diagnostics: RawDiagnostics): boolean => {
  const connected = toBoolean(diagnostics.channel?.ble_obd_connected);
  const elmReady = toBoolean(diagnostics.channel?.elm_ready);
  const sampleAgeMs = normalizeObdSampleAgeMs(diagnostics.quality?.sample_age_ms);

  return connected === true &&
    elmReady === true &&
    sampleAgeMs !== undefined &&
    sampleAgeMs <= OBD_DTC_MAX_SAMPLE_AGE_MS;
};

interface ObdAlertContext {
  deviceId: string;
  vehicleId: string | null;
  timestampMs: number;
  latitude: number | undefined;
  longitude: number | undefined;
  messageId: string | undefined;
  schemaVersion: string | undefined;
  seqNo: number | undefined;
  bootId: string | undefined;
}

interface ObdAlertInput {
  ruleId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  confidence: number;
  threshold?: number;
  value?: number;
  dtcCode?: string;
  evidence?: string;
  milOn?: boolean;
}

const publishObdMaintenanceAlert = (
  context: ObdAlertContext,
  input: ObdAlertInput,
): void => {
  publishInternalEvent('alert', {
    device_id: context.deviceId,
    vehicle_id: context.vehicleId ?? undefined,
    alert_type: 'maintenance_due',
    severity: input.severity,
    title: input.title,
    message: input.message,
    source: 'obd',
    rule_id: input.ruleId,
    confidence: input.confidence,
    threshold: input.threshold,
    threshold_value: input.threshold,
    value: input.value,
    actual_value: input.value,
    root_cause: input.dtcCode,
    evidence: input.evidence,
    mil_on: input.milOn,
    latitude: context.latitude,
    longitude: context.longitude,
    message_id: context.messageId,
    schema_version: context.schemaVersion,
    seq_no: context.seqNo,
    boot_id: context.bootId,
    timestamp: new Date(context.timestampMs).toISOString(),
  });

  writeDeviceEvent(context.deviceId, 'obd_maintenance_alert', input.title, {
    source: 'obd',
    vehicle_id: context.vehicleId,
    rule_id: input.ruleId,
    severity: input.severity,
    confidence: input.confidence,
    threshold: input.threshold,
    value: input.value,
    message: input.message,
    dtc_code: input.dtcCode,
    evidence: input.evidence,
    mil_on: input.milOn,
    message_id: context.messageId,
    schema_version: context.schemaVersion,
    seq_no: context.seqNo,
    boot_id: context.bootId,
  }).catch((err) => {
    logger.error(
      { err, deviceId: context.deviceId, ruleId: input.ruleId, event: 'obd_alert_log_write_failed' },
      'OBD alert log write failed',
    );
  });
};

const evaluateObdDtcRules = async (
  diagnostics: RawDiagnostics | undefined,
  context: ObdAlertContext,
): Promise<void> => {
  if (!diagnostics?.dtc || !hasValidDtcQualityGate(diagnostics)) {
    return;
  }

  const milOn = toBoolean(diagnostics.mil_on) === true;
  const dtcBuckets = new Map<string, Set<DtcBucket>>();
  const appendBucket = (bucket: DtcBucket, codes: string[]) => {
    codes.forEach((code) => {
      const existing = dtcBuckets.get(code) ?? new Set<DtcBucket>();
      existing.add(bucket);
      dtcBuckets.set(code, existing);
    });
  };

  appendBucket('stored', normalizeDtcCodes(diagnostics.dtc.stored));
  appendBucket('pending', normalizeDtcCodes(diagnostics.dtc.pending));
  appendBucket('permanent', normalizeDtcCodes(diagnostics.dtc.permanent));

  const activeDtcTitles = Array.from(dtcBuckets.keys())
    .map((code) => `OBD: DTC ${code}`);
  const currentRuleKeys = new Set(
    Array.from(dtcBuckets.keys()).map((code) => `obd_dtc_${code.toLowerCase()}`),
  );
  syncDtcCooldownState(context.deviceId, currentRuleKeys);
  const existingActiveTitles = await syncActiveObdDtcAlerts(
    context.deviceId,
    activeDtcTitles,
    'Auto-resolved by mqtt bridge: DTC cleared or superseded by latest OBD snapshot.',
  );

  dtcBuckets.forEach((buckets, code) => {
    const rule = resolveDtcDefinition(code, buckets);
    const isPendingOnly =
      buckets.size === 1 && buckets.has('pending') && !buckets.has('stored') && !buckets.has('permanent');
    let severity = rule.severity;
    if (isPendingOnly) {
      severity = lowerSeverity(severity);
    } else if (milOn) {
      severity = bumpSeverity(severity);
    }

    const bucketLabel = describeDtcBuckets(buckets);
    const confidence = Math.min(
      0.99,
      Math.max(0.55, rule.confidence + (milOn ? 0.05 : 0) - (isPendingOnly ? 0.08 : 0)),
    );
    const message = `${code} (${bucketLabel}${milOn ? ', MIL on' : ''}). ${rule.action}`;
    const ruleId = `obd_dtc_${code.toLowerCase()}`;
    const title = `OBD: DTC ${code}`;

    if (existingActiveTitles.has(title)) {
      return;
    }

    if (!canEmitRule(context.deviceId, ruleId, context.timestampMs)) {
      return;
    }

    publishObdMaintenanceAlert(context, {
      ruleId,
      severity,
      title,
      message,
      confidence,
      value: 1,
      dtcCode: code,
      milOn,
      evidence: bucketLabel,
    });
  });
};

const syncObdConnectionWarnings = async (
  diagnostics: RawDiagnostics | undefined,
  context: ObdAlertContext,
): Promise<void> => {
  const connected = toBoolean(diagnostics?.channel?.ble_obd_connected);
  const elmReady = toBoolean(diagnostics?.channel?.elm_ready);
  if (connected === undefined && elmReady === undefined) {
    return;
  }

  const shouldKeepActive = connected !== true || elmReady !== true;
  await syncActiveMaintenanceAlertsByMessage(
    context.deviceId,
    OBD_CONNECT_WARNING_TITLE,
    [OBD_CONNECT_WARNING_MESSAGE],
    shouldKeepActive ? [OBD_CONNECT_WARNING_MESSAGE] : [],
    'Auto-resolved by mqtt bridge: OBD connection recovered in latest telemetry snapshot.',
  );
};

const syncHighImuAccelDeltaAlert = async (
  imuAccelDeltaMps2: number | undefined,
  context: ObdAlertContext,
): Promise<void> => {
  const highImuAccelDeltaActive =
    imuAccelDeltaMps2 !== undefined && imuAccelDeltaMps2 > IMU_ACCEL_DELTA_ALERT_THRESHOLD_MPS2;
  const existingActiveTitles = await syncActiveMaintenanceAlertsByTitle(
    context.deviceId,
    [HIGH_IMU_ACCEL_DELTA_ALERT_TITLE],
    highImuAccelDeltaActive ? [HIGH_IMU_ACCEL_DELTA_ALERT_TITLE] : [],
    HIGH_IMU_ACCEL_DELTA_ALERT_RESOLUTION_NOTES,
  );

  if (!highImuAccelDeltaActive) {
    ruleCooldownUntil.delete(getRuleKey(context.deviceId, HIGH_IMU_ACCEL_DELTA_ALERT_TITLE));
    return;
  }

  if (existingActiveTitles.has(HIGH_IMU_ACCEL_DELTA_ALERT_TITLE)) {
    return;
  }

  if (!canEmitRule(context.deviceId, HIGH_IMU_ACCEL_DELTA_ALERT_TITLE, context.timestampMs)) {
    return;
  }

  publishInternalEvent('alert', {
    device_id: context.deviceId,
    vehicle_id: context.vehicleId ?? undefined,
    alert_type: 'high_imu_accel_delta',
    source: 'device',
    severity: 'medium',
    title: HIGH_IMU_ACCEL_DELTA_ALERT_TITLE,
    message: `IMU acceleration delta ${imuAccelDeltaMps2!.toFixed(3)} m/s^2 exceeded threshold ${IMU_ACCEL_DELTA_ALERT_THRESHOLD_MPS2.toFixed(1)} m/s^2.`,
    value: imuAccelDeltaMps2,
    actual_value: imuAccelDeltaMps2,
    threshold: IMU_ACCEL_DELTA_ALERT_THRESHOLD_MPS2,
    threshold_value: IMU_ACCEL_DELTA_ALERT_THRESHOLD_MPS2,
    latitude: context.latitude,
    longitude: context.longitude,
    message_id: context.messageId,
    schema_version: context.schemaVersion,
    seq_no: context.seqNo,
    boot_id: context.bootId,
    timestamp: new Date(context.timestampMs).toISOString(),
  });

  logger.info(
    {
      deviceId: context.deviceId,
      value: imuAccelDeltaMps2,
      threshold: IMU_ACCEL_DELTA_ALERT_THRESHOLD_MPS2,
      event: 'high_imu_accel_alert_emitted',
    },
    'High IMU acceleration alert emitted',
  );
};

const evaluateObdMaintenanceRules = (
  diagnostics: RawDiagnostics | undefined,
  context: ObdAlertContext,
  fallbackVehicleBattery: number | undefined,
  fallbackSpeed: number | undefined,
): Promise<void> => {
  if (!diagnostics) {
    idleAnomalyStartedAt.delete(context.deviceId);
    return Promise.resolve();
  }

  const connectFailCount = toFiniteNumber(diagnostics.channel?.connect_fail_count_5m);
  const coolant = toFiniteNumber(diagnostics.signals?.coolant_c);
  const engineLoad = toFiniteNumber(diagnostics.signals?.engine_load_pct);
  const rpm = toFiniteNumber(diagnostics.signals?.rpm);
  const obdSpeed = toFiniteNumber(diagnostics.signals?.obd_speed_kph);
  const speed = obdSpeed ?? fallbackSpeed;
  const vehicleBattery = fallbackVehicleBattery;
  const activeRuleTitles = new Set<string>();
  const channelUnstableActive =
    connectFailCount !== undefined && connectFailCount >= OBD_CHANNEL_UNSTABLE_THRESHOLD;
  const coolantRiskActive =
    coolant !== undefined &&
    engineLoad !== undefined &&
    coolant >= OBD_COOLANT_HIGH_C &&
    engineLoad >= OBD_HIGH_ENGINE_LOAD;
  const voltageRiskActive =
    vehicleBattery !== undefined &&
    engineLoad !== undefined &&
    vehicleBattery < OBD_VOLTAGE_LOW_V &&
    engineLoad > OBD_VOLTAGE_LOAD_MIN;
  let idleAnomalyEligible = false;
  let idleAnomalyElapsedMs = 0;

  if (channelUnstableActive) {
    activeRuleTitles.add('OBD: Channel unstable');
  }
  if (coolantRiskActive) {
    activeRuleTitles.add('OBD: Coolant risk pattern');
  }

  if (rpm !== undefined && speed !== undefined && rpm > OBD_IDLE_RPM_THRESHOLD && speed <= OBD_IDLE_SPEED_MAX_KPH) {
    const existingStart = idleAnomalyStartedAt.get(context.deviceId);
    const anomalyStart = existingStart ?? context.timestampMs;
    if (existingStart === undefined) {
      idleAnomalyStartedAt.set(context.deviceId, anomalyStart);
    }

    idleAnomalyElapsedMs = Math.max(0, context.timestampMs - anomalyStart);
    idleAnomalyEligible = idleAnomalyElapsedMs >= OBD_IDLE_ANOMALY_MIN_DURATION_MS;
    if (idleAnomalyEligible) {
      activeRuleTitles.add('OBD: Idle-load anomaly');
    }
  } else {
    idleAnomalyStartedAt.delete(context.deviceId);
  }

  if (voltageRiskActive) {
    activeRuleTitles.add('OBD: Voltage risk under load');
  }

  return syncActiveMaintenanceAlertsByTitle(
    context.deviceId,
    Array.from(OBD_RULE_MAINTENANCE_TITLES),
    Array.from(activeRuleTitles),
    'Auto-resolved by mqtt bridge: OBD maintenance condition cleared in latest telemetry snapshot.',
  ).then((existingActiveTitles) => {
    if (
      channelUnstableActive &&
      !existingActiveTitles.has('OBD: Channel unstable') &&
      canEmitRule(context.deviceId, 'obd_channel_unstable', context.timestampMs)
    ) {
      publishObdMaintenanceAlert(context, {
        ruleId: 'obd_channel_unstable',
        severity: 'medium',
        title: 'OBD: Channel unstable',
        message: `OBD connect/init failed ${connectFailCount!.toFixed(0)} times in the last 5 minutes.`,
        confidence: 0.86,
        threshold: OBD_CHANNEL_UNSTABLE_THRESHOLD,
        value: connectFailCount,
      });
    }

    if (
      coolantRiskActive &&
      !existingActiveTitles.has('OBD: Coolant risk pattern') &&
      canEmitRule(context.deviceId, 'coolant_risk_pattern', context.timestampMs)
    ) {
      publishObdMaintenanceAlert(context, {
        ruleId: 'coolant_risk_pattern',
        severity: 'high',
        title: 'OBD: Coolant risk pattern',
        message: `Coolant ${coolant!.toFixed(1)}C with engine load ${engineLoad!.toFixed(1)}% sustained at runtime.`,
        confidence: 0.9,
        threshold: OBD_COOLANT_HIGH_C,
        value: coolant,
      });
    }

    if (
      idleAnomalyEligible &&
      !existingActiveTitles.has('OBD: Idle-load anomaly') &&
      canEmitRule(context.deviceId, 'idle_load_anomaly', context.timestampMs)
    ) {
      publishObdMaintenanceAlert(context, {
        ruleId: 'idle_load_anomaly',
        severity: 'medium',
        title: 'OBD: Idle-load anomaly',
        message: `RPM ${rpm!.toFixed(0)} while speed ${speed!.toFixed(1)} km/h for ${(idleAnomalyElapsedMs / 60000).toFixed(1)} minutes.`,
        confidence: 0.78,
        threshold: OBD_IDLE_RPM_THRESHOLD,
        value: rpm,
      });
    }

    if (
      voltageRiskActive &&
      !existingActiveTitles.has('OBD: Voltage risk under load') &&
      canEmitRule(context.deviceId, 'voltage_risk_combined', context.timestampMs)
    ) {
      publishObdMaintenanceAlert(context, {
        ruleId: 'voltage_risk_combined',
        severity: 'high',
        title: 'OBD: Voltage risk under load',
        message: `Vehicle battery ${vehicleBattery!.toFixed(2)}V while engine load ${engineLoad!.toFixed(1)}%.`,
        confidence: 0.84,
        threshold: OBD_VOLTAGE_LOW_V,
        value: vehicleBattery,
      });
    }
  });
};

/**
 * Handle raw telemetry data from devices on topic v1/{deviceId}/rawdata.
 *
 * Processing flow:
 * 1. Validate payload with Zod
 * 2. Validate device auth (check auth_token against DB)
 * 3. Get or create session
 * 4. Write to VictoriaMetrics (time-series)
 * 5. Write to VictoriaLogs (event log)
 * 6. Add to batch writer (PostgreSQL)
 * 7. Check status change -> publish internal event
 * 8. Check alerts (IMU acceleration delta threshold) -> publish internal event
 */
export const handleRawData = async (
  deviceIdFromTopic: string,
  message: Buffer,
): Promise<void> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.toString());
  } catch {
    logger.warn({ deviceId: deviceIdFromTopic, event: 'rawdata_payload_invalid_json' }, 'Invalid rawdata payload');
    return;
  }

  // 1. Validate payload
  const result = rawDataSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { deviceId: deviceIdFromTopic, issues: result.error.issues, event: 'rawdata_payload_validation_failed' },
      'Invalid rawdata payload',
    );
    return;
  }

  const payload = result.data;
  const receivedAtMs = Date.now();
  const messageId = payload.metadata?.message_id;
  const schemaVersion = payload.metadata?.schema_version;
  const seqNo = payload.metadata?.seq_no;
  const bootId = payload.boot_id ?? payload.metadata?.boot_id;
  const diagnostics = payload.diagnostics;
  const storedDtcCodes = normalizeDtcCodes(diagnostics?.dtc?.stored);
  const pendingDtcCodes = normalizeDtcCodes(diagnostics?.dtc?.pending);
  const permanentDtcCodes = normalizeDtcCodes(diagnostics?.dtc?.permanent);
  const milOn = toBoolean(diagnostics?.mil_on) === true;
  const normalizedObdSampleAgeMs = normalizeObdSampleAgeMs(diagnostics?.quality?.sample_age_ms);
  const obdSignalsAreFresh = hasFreshObdSignals(diagnostics, normalizedObdSampleAgeMs);
  const normalizedDiagnostics = normalizeDiagnosticsForStorage(
    diagnostics,
    normalizedObdSampleAgeMs,
    obdSignalsAreFresh,
  );
  const normalizedDiagnosticsQuality = normalizedDiagnostics?.quality ?? null;
  const normalizedObdSignals = normalizedDiagnostics?.signals;
  const normalizedGnss = normalizeGnssLocation(
    payload.data.latitude,
    payload.data.longitude,
    payload.data.satellites,
  );
  const imuAccelDeltaMps2 = resolveImuAccelDeltaMps2(payload.data);
  const effectiveLatitude = normalizedGnss.latitude;
  const effectiveLongitude = normalizedGnss.longitude;
  const effectiveSpeed = normalizedGnss.speedAllowed ? payload.data.speed : undefined;
  const effectiveCourse = normalizedGnss.speedAllowed ? payload.data.course : undefined;

  // Verify topic deviceId matches payload deviceId
  if (payload.device_id !== deviceIdFromTopic) {
    logger.warn(
      { topicDeviceId: deviceIdFromTopic, payloadDeviceId: payload.device_id, event: 'rawdata_device_id_mismatch' },
      'Rawdata device id mismatch',
    );
    return;
  }

  // 2. Validate device auth
  const device = await validateDevice(payload.device_id, payload.auth_token);
  if (!device) {
    logger.warn({ deviceId: payload.device_id, event: 'device_auth_failed' }, 'Device auth failed');
    return;
  }

  const { timestampMs, source: timestampSource } = normalizePayloadTimestamp(
    payload.timestamp,
    payload.metadata?.sent_at,
  );

  if (timestampSource !== 'payload') {
    logger.warn(
      {
        deviceId: payload.device_id,
        payloadTimestamp: payload.timestamp,
        metadataSentAt: payload.metadata?.sent_at,
        normalizedTimestampMs: timestampMs,
        timestampSource,
        event: 'rawdata_timestamp_normalized',
      },
      'Telemetry timestamp normalized before persistence',
    );
  }

  const previousState = getStatus(payload.device_id);
  const previousStatus = previousState?.status;
  const runtimeState = normalizeRuntimeState({
    state: payload.state,
    legacyStatus: previousStatus ?? device.current_status,
    ignitionHint: payload.data.ignition,
    speedKph: effectiveSpeed ?? toFiniteNumber(normalizedObdSignals?.obd_speed_kph),
    previous: previousState?.runtimeState,
  });
  const reportsEngineOff = telemetryReportsEngineOff({
    ignition: payload.data.ignition,
    runtimeState,
  });
  const stateUpdatedAt = new Date(receivedAtMs).toISOString();

  // 3. Attach telemetry only to an authoritative session identity from firmware.
  const localSessionKey = resolveLocalSessionKey(
    payload.local_session_key,
    payload.session_id,
  );
  const sessionBootId = payload.boot_id ?? payload.metadata?.boot_id;
  const payloadCanonicalSessionId = payload.canonical_session_id ?? null;
  const cachedResolvedSessionId = resolveSessionId(payload.device_id, {
    localSessionKey,
    canonicalSessionId: payloadCanonicalSessionId,
    bootId: sessionBootId,
  });
  const databaseResolvedSessionId =
    cachedResolvedSessionId === null
      ? await findDeviceSessionIdByIdentity(payload.device_id, {
          localSessionKey,
          canonicalSessionId: payloadCanonicalSessionId,
          bootId: sessionBootId,
        })
      : null;
  let sessionId = cachedResolvedSessionId ?? databaseResolvedSessionId;
  let canonicalSessionId =
    payloadCanonicalSessionId ??
    (sessionId !== null && previousState?.sessionId === sessionId
      ? previousState.canonicalSessionId
      : (sessionId !== null ? String(sessionId) : null));
  const hasAuthoritativeIdentity = hasAuthoritativeSessionIdentity({
    localSessionKey,
    canonicalSessionId: payloadCanonicalSessionId,
  });
  const canCreateFallbackSession =
    sessionId === null &&
    !hasAuthoritativeIdentity &&
    isLikelyActiveSessionTelemetry({
      ignition: payload.data.ignition,
      speed: effectiveSpeed,
      runtimeState,
      previousStatus,
      persistedStatus: device.current_status,
    }) &&
    (
      sessionBootId !== undefined ||
      localSessionKey !== undefined ||
      previousState?.status === 'running' ||
      device.current_status === 'running'
    );

  if (canCreateFallbackSession) {
    const ensuredSession = await ensureDeviceSession(payload.device_id, timestampMs, receivedAtMs, {
      localSessionKey,
      bootId: sessionBootId,
      canonicalSource: 'server',
      boundarySource: SESSION_FALLBACK_BOUNDARY_SOURCE,
      startReason: 'telemetry_active',
    });
    sessionId = ensuredSession.sessionId;
    canonicalSessionId = String(ensuredSession.sessionId);

    if (ensuredSession.isNew) {
      publishInternalEvent('session', {
        device_id: payload.device_id,
        session_id: sessionId,
        action: 'started',
        boundary_source: SESSION_FALLBACK_BOUNDARY_SOURCE,
        local_session_key: localSessionKey,
        canonical_session_id: canonicalSessionId,
        boot_id: sessionBootId,
        message_id: messageId,
        schema_version: schemaVersion,
        seq_no: seqNo,
        timestamp: new Date(timestampMs).toISOString(),
      });
    }
  }

  if (sessionId === null && hasAuthoritativeIdentity) {
    logger.warn(
      {
        deviceId: payload.device_id,
        localSessionKey,
        canonicalSessionId,
        bootId: sessionBootId,
        messageId,
        event: 'telemetry_session_unmapped',
        reason: 'authoritative_identity_unresolved',
      },
      'Telemetry session unresolved',
    );
  }

  // 4. Write to VictoriaMetrics
  const metricsData: Record<string, number | undefined> = {
    imu_accel_delta_mps2: imuAccelDeltaMps2,
    vehicle_battery: payload.data.vehicle_battery,
    device_battery: payload.data.device_battery,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    speed: effectiveSpeed,
    course: effectiveCourse,
    satellites: payload.data.satellites,
    ignition: payload.data.ignition !== undefined
      ? (payload.data.ignition ? 1 : 0)
      : undefined,
    error_code: payload.data.error_code,
    obd_rpm: toFiniteNumber(normalizedObdSignals?.rpm),
    obd_speed_kph: toFiniteNumber(normalizedObdSignals?.obd_speed_kph),
    obd_coolant_c: toFiniteNumber(normalizedObdSignals?.coolant_c),
    obd_fuel_level_pct: toFiniteNumber(normalizedObdSignals?.fuel_level_pct),
    obd_engine_load_pct: toFiniteNumber(normalizedObdSignals?.engine_load_pct),
    obd_ble_connected: toBoolean(diagnostics?.channel?.ble_obd_connected) === undefined
      ? undefined
      : (diagnostics?.channel?.ble_obd_connected ? 1 : 0),
    obd_elm_ready: toBoolean(diagnostics?.channel?.elm_ready) === undefined
      ? undefined
      : (diagnostics?.channel?.elm_ready ? 1 : 0),
    obd_mil_on: diagnostics?.mil_on === undefined ? undefined : (milOn ? 1 : 0),
    obd_sample_age_ms: normalizedObdSampleAgeMs,
    obd_connect_fail_count_5m: toFiniteNumber(diagnostics?.channel?.connect_fail_count_5m),
    obd_reported_dtc_count: toFiniteNumber(diagnostics?.reported_dtc_count),
    obd_dtc_stored_count: diagnostics?.dtc ? storedDtcCodes.length : undefined,
    obd_dtc_pending_count: diagnostics?.dtc ? pendingDtcCodes.length : undefined,
    obd_dtc_permanent_count: diagnostics?.dtc ? permanentDtcCodes.length : undefined,
  };

  if (payload.uptime !== undefined) {
    metricsData.uptime = payload.uptime;
  }

  writeDeviceTelemetry(payload.device_id, metricsData, timestampMs).catch((err) => {
    logger.error({ err, deviceId: payload.device_id, event: 'rawdata_metrics_write_failed' }, 'Telemetry metrics write failed');
  });

  // 5. Write to VictoriaLogs
  writeDeviceEvent(payload.device_id, 'rawdata', 'Device telemetry received', {
    session_id: sessionId,
    message_id: messageId,
    schema_version: schemaVersion,
    seq_no: seqNo,
    boot_id: bootId,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    speed: effectiveSpeed,
    diagnostics: normalizedDiagnostics ?? null,
  }).catch((err) => {
    logger.error({ err, deviceId: payload.device_id, event: 'rawdata_event_log_write_failed' }, 'Telemetry event log write failed');
  });

  if (normalizedDiagnostics) {
    writeDeviceEvent(payload.device_id, 'obd_diagnostic_raw', 'OBD diagnostics snapshot', {
      session_id: sessionId,
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
      diagnostics: normalizedDiagnostics,
    }).catch((err) => {
      logger.error(
        { err, deviceId: payload.device_id, event: 'obd_diagnostics_log_write_failed' },
        'OBD diagnostics log write failed',
      );
    });

    writeDeviceEvent(payload.device_id, 'obd_diagnostic_snapshot', 'Normalized OBD diagnostic snapshot', {
      session_id: sessionId,
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
      signals: normalizedDiagnostics.signals ?? null,
      diagnostic_state: {
        mil_on: milOn,
        reported_dtc_count: toFiniteNumber(normalizedDiagnostics.reported_dtc_count),
        dtc_stored: storedDtcCodes,
        dtc_pending: pendingDtcCodes,
        dtc_permanent: permanentDtcCodes,
        readiness: normalizedDiagnostics.readiness ?? null,
      },
      quality: normalizedDiagnosticsQuality,
    }).catch((err) => {
      logger.error(
        { err, deviceId: payload.device_id, event: 'obd_diagnostics_snapshot_log_write_failed' },
        'OBD normalized diagnostic log write failed',
      );
    });
  }

  const fallbackStatus =
    device.current_status === 'disconnected'
      ? 'offline'
      : device.current_status === 'running' || device.current_status === 'online'
        ? device.current_status
        : 'stopped';
  const effectiveStatus = sessionId !== null ? 'running' : (previousState?.status ?? fallbackStatus);

  // 6. Add to batch writer (PostgreSQL)
  addUpdate({
    deviceId: payload.device_id,
    status: effectiveStatus === 'offline' ? 'disconnected' : effectiveStatus,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    speed: effectiveSpeed,
    sessionId: sessionId ?? undefined,
    serverTimestamp: receivedAtMs,
    runtimeState,
  });

  if (sessionId !== null) {
    await touchDeviceSession({
      deviceId: payload.device_id,
      sessionId,
      deviceTimestampMs: timestampMs,
      serverTimestampMs: receivedAtMs,
      imuAccelDeltaMps2,
      vehicleBattery: payload.data.vehicle_battery,
      deviceBattery: payload.data.device_battery,
      latitude: effectiveLatitude,
      longitude: effectiveLongitude,
      speed: effectiveSpeed,
    });
  }

  // 7. Check active vehicle zone (fire-and-forget, non-blocking)
  if (
    effectiveLatitude !== undefined &&
    effectiveLongitude !== undefined &&
    device.vehicle_id
  ) {
    checkGeofences(
      payload.device_id,
      device.vehicle_id,
      effectiveLatitude,
      effectiveLongitude,
      new Date(timestampMs).toISOString(),
    ).catch((err) => {
      logger.error({ err, deviceId: payload.device_id, event: 'vehicle_zone_check_failed' }, 'Vehicle zone check failed');
    });
  }

  setStatus(payload.device_id, effectiveStatus, {
    sessionId,
    runtimeState,
    localSessionKey,
    canonicalSessionId,
    bootId: sessionBootId,
  });

  publishInternalEvent('data', {
    device_id: payload.device_id,
    vehicle_id: device.vehicle_id ?? undefined,
    session_id: sessionId,
    current_status: effectiveStatus,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    speed: effectiveSpeed,
    course: effectiveCourse,
    satellites: payload.data.satellites,
    vehicle_battery: payload.data.vehicle_battery,
    device_battery: payload.data.device_battery,
    imu_accel_delta_mps2: imuAccelDeltaMps2,
    error_code: payload.data.error_code,
    ignition_state: runtimeState.ignition_state,
    motion_state: runtimeState.motion_state,
    vehicle_state: runtimeState.vehicle_state,
    device_state: runtimeState.device_state,
    sleep_mode: runtimeState.sleep_mode,
    state_updated_at: stateUpdatedAt,
    diagnostics: normalizedDiagnostics ?? undefined,
    raw_payload: buildSanitizedRawPayload(payload),
    message_id: messageId,
    schema_version: schemaVersion,
    seq_no: seqNo,
    boot_id: bootId,
    timestamp: new Date(timestampMs).toISOString(),
  });

  const obdAlertContext: ObdAlertContext = {
    deviceId: payload.device_id,
    vehicleId: device.vehicle_id,
    timestampMs,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    messageId,
    schemaVersion,
    seqNo,
    bootId,
  };

  const obdRuleResults = await Promise.allSettled([
    evaluateObdMaintenanceRules(
      normalizedDiagnostics,
      obdAlertContext,
      payload.data.vehicle_battery,
      effectiveSpeed,
    ),
    evaluateObdDtcRules(normalizedDiagnostics, obdAlertContext),
    syncObdConnectionWarnings(normalizedDiagnostics, obdAlertContext),
    syncHighImuAccelDeltaAlert(imuAccelDeltaMps2, obdAlertContext),
  ]);
  obdRuleResults.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.error(
        { err: result.reason, deviceId: payload.device_id, taskIndex: index, event: 'obd_rule_evaluation_failed' },
        'OBD rule evaluation failed',
      );
    }
  });
};
