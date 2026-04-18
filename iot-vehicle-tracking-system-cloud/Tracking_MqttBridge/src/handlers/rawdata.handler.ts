import { rawDataSchema } from '../validators/payload.validator';
import type { RawDiagnostics } from '../types/payload.types';
import {
  ensureDeviceSession,
  touchDeviceSession,
  validateDevice,
} from '../infrastructure/database';
import { writeDeviceTelemetry } from '../infrastructure/victoriametrics';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { getStatus, setStatus } from '../cache/device-state.cache';
import { addUpdate } from '../services/batch-writer.service';
import { checkGeofences } from '../services/geofence-checker.service';
import { logger } from '../infrastructure/logger';
import { normalizePayloadTimestamp } from '../utils/timestamp.util';

const VIBRATION_ALERT_THRESHOLD = 500;
const OBD_RULE_COOLDOWN_MS = 15 * 60 * 1000;
const OBD_IDLE_ANOMALY_MIN_DURATION_MS = 10 * 60 * 1000;
const OBD_CHANNEL_UNSTABLE_THRESHOLD = 3;
const OBD_COOLANT_HIGH_C = 105;
const OBD_HIGH_ENGINE_LOAD = 60;
const OBD_IDLE_RPM_THRESHOLD = 900;
const OBD_IDLE_SPEED_MAX_KPH = 3;
const OBD_VOLTAGE_LOW_V = 12;
const OBD_VOLTAGE_LOAD_MIN = 50;
const OBD_DTC_MAX_SAMPLE_AGE_MS = 60_000;

const ruleCooldownUntil = new Map<string, number>();
const idleAnomalyStartedAt = new Map<string, number>();

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
    matches: (code) => matchesDtcRange(code, 'P', 0x300, 0x304),
    severity: 'high',
    confidence: 0.92,
    action: 'Kiểm tra misfire, bugi, cuộn đánh lửa và kim phun; hạn chế tải cao cho tới khi xử lý.',
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

const resolveDtcRule = (code: string): DtcRuleDefinition | undefined =>
  dtcRuleDefinitions.find((definition) => definition.matches(code));

const describeDtcBuckets = (buckets: Set<DtcBucket>): string => {
  const ordered = (['stored', 'pending', 'permanent'] as DtcBucket[]).filter((bucket) =>
    buckets.has(bucket),
  );
  return ordered.join('/');
};

const hasValidDtcQualityGate = (diagnostics: RawDiagnostics): boolean => {
  const connected = toBoolean(diagnostics.channel?.ble_obd_connected);
  const elmReady = toBoolean(diagnostics.channel?.elm_ready);
  const sampleAgeMs = toFiniteNumber(diagnostics.quality?.sample_age_ms);

  return connected === true && elmReady === true && (sampleAgeMs === undefined || sampleAgeMs <= OBD_DTC_MAX_SAMPLE_AGE_MS);
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
    logger.error({ err, deviceId: context.deviceId, ruleId: input.ruleId }, 'OBD alert log write failed');
  });
};

const evaluateObdDtcRules = (
  diagnostics: RawDiagnostics | undefined,
  context: ObdAlertContext,
): void => {
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

  dtcBuckets.forEach((buckets, code) => {
    const rule = resolveDtcRule(code);
    if (!rule) {
      return;
    }

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

    if (!canEmitRule(context.deviceId, ruleId, context.timestampMs)) {
      return;
    }

    publishObdMaintenanceAlert(context, {
      ruleId,
      severity,
      title: `OBD: DTC ${code}`,
      message,
      confidence,
      value: 1,
      dtcCode: code,
      milOn,
      evidence: bucketLabel,
    });
  });
};

const evaluateObdMaintenanceRules = (
  diagnostics: RawDiagnostics | undefined,
  context: ObdAlertContext,
  fallbackBatteryTop: number | undefined,
  fallbackSpeed: number | undefined,
): void => {
  if (!diagnostics) {
    idleAnomalyStartedAt.delete(context.deviceId);
    return;
  }

  const connectFailCount = toFiniteNumber(diagnostics.channel?.connect_fail_count_5m);
  const coolant = toFiniteNumber(diagnostics.signals?.coolant_c);
  const engineLoad = toFiniteNumber(diagnostics.signals?.engine_load_pct);
  const rpm = toFiniteNumber(diagnostics.signals?.rpm);
  const obdSpeed = toFiniteNumber(diagnostics.signals?.obd_speed_kph);
  const speed = obdSpeed ?? fallbackSpeed;
  const batteryTop = fallbackBatteryTop;

  if (
    connectFailCount !== undefined &&
    connectFailCount >= OBD_CHANNEL_UNSTABLE_THRESHOLD &&
    canEmitRule(context.deviceId, 'obd_channel_unstable', context.timestampMs)
  ) {
    publishObdMaintenanceAlert(context, {
      ruleId: 'obd_channel_unstable',
      severity: 'medium',
      title: 'OBD: Channel unstable',
      message: `OBD connect/init failed ${connectFailCount.toFixed(0)} times in the last 5 minutes.`,
      confidence: 0.86,
      threshold: OBD_CHANNEL_UNSTABLE_THRESHOLD,
      value: connectFailCount,
    });
  }

  if (
    coolant !== undefined &&
    engineLoad !== undefined &&
    coolant >= OBD_COOLANT_HIGH_C &&
    engineLoad >= OBD_HIGH_ENGINE_LOAD &&
    canEmitRule(context.deviceId, 'coolant_risk_pattern', context.timestampMs)
  ) {
    publishObdMaintenanceAlert(context, {
      ruleId: 'coolant_risk_pattern',
      severity: 'high',
      title: 'OBD: Coolant risk pattern',
      message: `Coolant ${coolant.toFixed(1)}C with engine load ${engineLoad.toFixed(1)}% sustained at runtime.`,
      confidence: 0.9,
      threshold: OBD_COOLANT_HIGH_C,
      value: coolant,
    });
  }

  if (rpm !== undefined && speed !== undefined && rpm > OBD_IDLE_RPM_THRESHOLD && speed <= OBD_IDLE_SPEED_MAX_KPH) {
    const existingStart = idleAnomalyStartedAt.get(context.deviceId);
    const anomalyStart = existingStart ?? context.timestampMs;
    if (existingStart === undefined) {
      idleAnomalyStartedAt.set(context.deviceId, anomalyStart);
    }

    const elapsedMs = Math.max(0, context.timestampMs - anomalyStart);
    if (
      elapsedMs >= OBD_IDLE_ANOMALY_MIN_DURATION_MS &&
      canEmitRule(context.deviceId, 'idle_load_anomaly', context.timestampMs)
    ) {
      publishObdMaintenanceAlert(context, {
        ruleId: 'idle_load_anomaly',
        severity: 'medium',
        title: 'OBD: Idle-load anomaly',
        message: `RPM ${rpm.toFixed(0)} while speed ${speed.toFixed(1)} km/h for ${(elapsedMs / 60000).toFixed(1)} minutes.`,
        confidence: 0.78,
        threshold: OBD_IDLE_RPM_THRESHOLD,
        value: rpm,
      });
    }
  } else {
    idleAnomalyStartedAt.delete(context.deviceId);
  }

  if (
    batteryTop !== undefined &&
    engineLoad !== undefined &&
    batteryTop < OBD_VOLTAGE_LOW_V &&
    engineLoad > OBD_VOLTAGE_LOAD_MIN &&
    canEmitRule(context.deviceId, 'voltage_risk_combined', context.timestampMs)
  ) {
    publishObdMaintenanceAlert(context, {
      ruleId: 'voltage_risk_combined',
      severity: 'high',
      title: 'OBD: Voltage risk under load',
      message: `Battery top ${batteryTop.toFixed(2)}V while engine load ${engineLoad.toFixed(1)}%.`,
      confidence: 0.84,
      threshold: OBD_VOLTAGE_LOW_V,
      value: batteryTop,
    });
  }
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
 * 8. Check alerts (vibration threshold) -> publish internal event
 */
export const handleRawData = async (
  deviceIdFromTopic: string,
  message: Buffer,
): Promise<void> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.toString());
  } catch {
    logger.warn(`Invalid JSON from device ${deviceIdFromTopic}`);
    return;
  }

  // 1. Validate payload
  const result = rawDataSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { deviceId: deviceIdFromTopic, issues: result.error.issues },
      'Invalid rawdata payload',
    );
    return;
  }

  const payload = result.data;
  const receivedAtMs = Date.now();
  const messageId = payload.metadata?.message_id;
  const schemaVersion = payload.metadata?.schema_version;
  const seqNo = payload.metadata?.seq_no;
  const bootId = payload.metadata?.boot_id;
  const diagnostics = payload.diagnostics;
  const storedDtcCodes = normalizeDtcCodes(diagnostics?.dtc?.stored);
  const pendingDtcCodes = normalizeDtcCodes(diagnostics?.dtc?.pending);
  const permanentDtcCodes = normalizeDtcCodes(diagnostics?.dtc?.permanent);
  const milOn = toBoolean(diagnostics?.mil_on) === true;
  const normalizedGnss = normalizeGnssLocation(
    payload.data.latitude,
    payload.data.longitude,
    payload.data.satellites,
  );
  const effectiveLatitude = normalizedGnss.latitude;
  const effectiveLongitude = normalizedGnss.longitude;
  const effectiveSpeed = normalizedGnss.speedAllowed ? payload.data.speed : undefined;
  const effectiveCourse = normalizedGnss.speedAllowed ? payload.data.course : undefined;

  // Verify topic deviceId matches payload deviceId
  if (payload.device_id !== deviceIdFromTopic) {
    logger.warn(
      `Device ID mismatch: topic=${deviceIdFromTopic}, payload=${payload.device_id}`,
    );
    return;
  }

  // 2. Validate device auth
  const device = await validateDevice(payload.device_id, payload.auth_token);
  if (!device) {
    logger.warn(`Auth failed for device ${payload.device_id}`);
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
      },
      'Normalized invalid telemetry timestamp before persistence',
    );
  }

  const previousState = getStatus(payload.device_id);
  const previousStatus = previousState?.status;

  // 3. Get or create session in PostgreSQL, then mirror its ID in local cache.
  const ensuredSession = await ensureDeviceSession(payload.device_id, timestampMs, receivedAtMs);
  const sessionId = ensuredSession.sessionId;
  const isNewSession = ensuredSession.isNew;

  if (isNewSession) {
    publishInternalEvent('session', {
      device_id: payload.device_id,
      session_id: sessionId,
      action: 'started',
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
      timestamp: new Date(timestampMs).toISOString(),
    });
  }

  // 4. Write to VictoriaMetrics
  const metricsData: Record<string, number | undefined> = {
    vibration: payload.data.vibration,
    battery_top: payload.data.battery_top,
    battery_bot: payload.data.battery_bot,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    speed: effectiveSpeed,
    course: effectiveCourse,
    satellites: payload.data.satellites,
    ignition: payload.data.ignition !== undefined
      ? (payload.data.ignition ? 1 : 0)
      : undefined,
    error_code: payload.data.error_code,
    obd_rpm: toFiniteNumber(diagnostics?.signals?.rpm),
    obd_speed_kph: toFiniteNumber(diagnostics?.signals?.obd_speed_kph),
    obd_coolant_c: toFiniteNumber(diagnostics?.signals?.coolant_c),
    obd_fuel_level_pct: toFiniteNumber(diagnostics?.signals?.fuel_level_pct),
    obd_engine_load_pct: toFiniteNumber(diagnostics?.signals?.engine_load_pct),
    obd_ble_connected: toBoolean(diagnostics?.channel?.ble_obd_connected) === undefined
      ? undefined
      : (diagnostics?.channel?.ble_obd_connected ? 1 : 0),
    obd_elm_ready: toBoolean(diagnostics?.channel?.elm_ready) === undefined
      ? undefined
      : (diagnostics?.channel?.elm_ready ? 1 : 0),
    obd_mil_on: diagnostics?.mil_on === undefined ? undefined : (milOn ? 1 : 0),
    obd_sample_age_ms: toFiniteNumber(diagnostics?.quality?.sample_age_ms),
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
    logger.error(`VictoriaMetrics write failed for ${payload.device_id}`, err);
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
    diagnostics: diagnostics ?? null,
  }).catch((err) => {
    logger.error(`VictoriaLogs write failed for ${payload.device_id}`, err);
  });

  if (diagnostics) {
    writeDeviceEvent(payload.device_id, 'obd_diagnostic_raw', 'OBD diagnostics snapshot', {
      session_id: sessionId,
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
      diagnostics,
    }).catch((err) => {
      logger.error({ err, deviceId: payload.device_id }, 'OBD diagnostics log write failed');
    });

    writeDeviceEvent(payload.device_id, 'obd_diagnostic_snapshot', 'Normalized OBD diagnostic snapshot', {
      session_id: sessionId,
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
      signals: diagnostics.signals ?? null,
      diagnostic_state: {
        mil_on: milOn,
        reported_dtc_count: toFiniteNumber(diagnostics.reported_dtc_count),
        dtc_stored: storedDtcCodes,
        dtc_pending: pendingDtcCodes,
        dtc_permanent: permanentDtcCodes,
        readiness: diagnostics.readiness ?? null,
      },
      quality: diagnostics.quality ?? null,
    }).catch((err) => {
      logger.error({ err, deviceId: payload.device_id }, 'OBD normalized diagnostic log write failed');
    });
  }

  // 6. Add to batch writer (PostgreSQL)
  addUpdate({
    deviceId: payload.device_id,
    status: 'running',
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    speed: effectiveSpeed,
    sessionId,
    serverTimestamp: receivedAtMs,
  });

  await touchDeviceSession({
    deviceId: payload.device_id,
    sessionId,
    deviceTimestampMs: timestampMs,
    serverTimestampMs: receivedAtMs,
    vibration: payload.data.vibration,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    speed: effectiveSpeed,
  });

  // 7. Check geofences (fire-and-forget, non-blocking)
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
    ).catch((err) => {
      logger.error({ err, deviceId: payload.device_id }, 'Geofence check failed');
    });
  }

  // 8. Check status change
  setStatus(payload.device_id, 'online', sessionId);

  if (previousStatus && previousStatus !== 'online') {
    publishInternalEvent('status', {
      device_id: payload.device_id,
      previous_status: previousStatus,
      current_status: 'online',
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
    });
  }

  publishInternalEvent('data', {
    device_id: payload.device_id,
    vehicle_id: device.vehicle_id ?? undefined,
    session_id: sessionId,
    lat: effectiveLatitude,
    lon: effectiveLongitude,
    spd: effectiveSpeed,
    bb: payload.data.battery_bot,
    bt: payload.data.battery_top,
    err: payload.data.error_code,
    vib: payload.data.vibration,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    speed: effectiveSpeed,
    course: effectiveCourse,
    battery_top: payload.data.battery_top,
    diagnostics: diagnostics ?? undefined,
    message_id: messageId,
    schema_version: schemaVersion,
    seq_no: seqNo,
    boot_id: bootId,
    timestamp: new Date(timestampMs).toISOString(),
  });

  evaluateObdMaintenanceRules(
    diagnostics,
    {
      deviceId: payload.device_id,
      vehicleId: device.vehicle_id,
      timestampMs,
      latitude: effectiveLatitude,
      longitude: effectiveLongitude,
      messageId,
      schemaVersion,
      seqNo,
      bootId,
    },
    payload.data.battery_top,
    effectiveSpeed,
  );
  evaluateObdDtcRules(diagnostics, {
    deviceId: payload.device_id,
    vehicleId: device.vehicle_id,
    timestampMs,
    latitude: effectiveLatitude,
    longitude: effectiveLongitude,
    messageId,
    schemaVersion,
    seqNo,
    bootId,
  });

  // 8. Check alerts - vibration threshold
  if (
    payload.data.vibration !== undefined &&
    payload.data.vibration > VIBRATION_ALERT_THRESHOLD
  ) {
    publishInternalEvent('alert', {
      device_id: payload.device_id,
      alert_type: 'high_vibration',
      value: payload.data.vibration,
      threshold: VIBRATION_ALERT_THRESHOLD,
      message_id: messageId,
      schema_version: schemaVersion,
      seq_no: seqNo,
      boot_id: bootId,
      latitude: effectiveLatitude,
      longitude: effectiveLongitude,
    });

    logger.info(
      `ALERT: High vibration (${payload.data.vibration}) on device ${payload.device_id}`,
    );
  }
};
