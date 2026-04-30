import { randomUUID } from 'node:crypto';
import mqtt from 'mqtt';
import { pool } from '@/infrastructure/database/pool';
import { logger } from '@/infrastructure/logger';
import { mqttConfig } from '@/config/env';
import { hashToken } from '@/shared/utils/crypto.util';
import { createValidationError } from '@/shared/utils/errors.util';
import type {
  SimulatorPoint,
  SimulatorStartInput,
  SimulatorStatus,
} from '@/domain/simulator/types/simulator.types';

interface DeviceSimulatorRuntime {
  deviceId: string;
  authToken: string;
  simulatorAuthTokenHash: string;
  originalAuthToken: string;
  lat: number;
  lon: number;
  heading: number;
  vehicleBattery: number;
  fuelLevel: number;
  obdConnectFailCount5m: number;
  seqNo: number;
  bootId: string;
}

interface SimulatorMqttClient {
  publish: (
    topic: string,
    message: string,
    options: { qos: 0 | 1; retain?: boolean },
    callback: (error?: Error | null) => void,
  ) => void;
  end: (force?: boolean, callback?: () => void) => void;
}

interface RunningSimulationState {
  jobId: string;
  config: SimulatorStartInput;
  startedBy: number;
  startedAt: Date;
  expiresAt: Date;
  lastTickAt: Date | null;
  ticks: number;
  sentPoints: number;
  reason: string | null;
  devices: DeviceSimulatorRuntime[];
  preview: SimulatorPoint[];
  timer: NodeJS.Timeout;
  ticking: boolean;
  paused: boolean;
  mqttClient: SimulatorMqttClient;
}

interface StoredSnapshot {
  jobId: string;
  config: SimulatorStartInput;
  startedBy: number;
  startedAt: Date;
  stoppedAt: Date | null;
  expiresAt: Date;
  lastTickAt: Date | null;
  ticks: number;
  sentPoints: number;
  reason: string | null;
  deviceIds: string[];
  preview: SimulatorPoint[];
}

interface DeviceLookupRow {
  device_id: string;
  auth_token: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
}

interface SessionLookupRow {
  id: number;
}

let runningSimulation: RunningSimulationState | null = null;
let lastSnapshot: StoredSnapshot | null = null;

interface PayloadMetadata {
  schema_version: string;
  message_id: string;
  sent_at: number;
  seq_no: number;
  boot_id: string;
}

const RAWDATA_SCHEMA_VERSION = 'v2.0.0';
const DEFAULT_SCHEMA_VERSION = 'v1.0.0';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const randomBetween = (min: number, max: number): number => {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return lower + Math.random() * (upper - lower);
};

const roundTo = (value: number, decimals = 6): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const createBootId = (deviceId: string): string =>
  `sim-${deviceId}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;

const createPayloadMetadata = (
  device: DeviceSimulatorRuntime,
  sentAt: number,
  schemaVersion: string,
): PayloadMetadata => {
  device.seqNo += 1;
  return {
    schema_version: schemaVersion,
    message_id: randomUUID(),
    sent_at: sentAt,
    seq_no: device.seqNo,
    boot_id: device.bootId,
  };
};

const normalizeHeading = (value: number): number => {
  const heading = value % 360;
  return heading < 0 ? heading + 360 : heading;
};

const createSimulatorMqttClient = (): Promise<SimulatorMqttClient> => {
  const protocol = mqttConfig.useTls ? 'mqtts' : 'mqtt';
  const port = mqttConfig.useTls ? mqttConfig.tlsPort : mqttConfig.port;
  const brokerUrl = `${protocol}://${mqttConfig.host}:${port}`;

  return new Promise((resolve, reject) => {
    const client = mqtt.connect(brokerUrl, {
      username: mqttConfig.username,
      password: mqttConfig.password,
      clientId: `backend-simulator-${process.pid}-${Date.now()}`,
      reconnectPeriod: 5000,
      clean: true,
      rejectUnauthorized: mqttConfig.rejectUnauthorized,
    });

    const cleanup = (): void => {
      client.removeAllListeners('connect');
      client.removeAllListeners('error');
    };

    client.once('connect', () => {
      cleanup();
      resolve(client as unknown as SimulatorMqttClient);
    });

    client.once('error', (error) => {
      cleanup();
      reject(error);
    });
  });
};

const publishMqttMessage = (
  client: SimulatorMqttClient,
  topic: string,
  message: Record<string, unknown>,
  options: { qos: 0 | 1; retain?: boolean },
): Promise<void> =>
  new Promise((resolve, reject) => {
    client.publish(topic, JSON.stringify(message), options, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const endMqttClient = (client: SimulatorMqttClient): Promise<void> =>
  new Promise((resolve) => {
    client.end(false, () => resolve());
  });

const publishDeviceStatus = (
  client: SimulatorMqttClient,
  device: DeviceSimulatorRuntime,
  status: 'running' | 'stopped',
  timestamp: number,
  authTokenOverride?: string,
): Promise<void> =>
  publishMqttMessage(
    client,
    `v1/${device.deviceId}/status`,
    {
      device_id: device.deviceId,
      auth_token: authTokenOverride ?? device.authToken,
      status,
      timestamp,
      metadata: createPayloadMetadata(device, timestamp, DEFAULT_SCHEMA_VERSION),
    },
    { qos: 1, retain: true },
  );

const buildDiagnostics = (
  speed: number,
  rpm: number,
  coolantC: number,
  fuelLevelPct: number,
  engineLoadPct: number,
  sampleAgeMs: number,
  connectFailCount5m: number,
): {
  channel: {
    ble_obd_connected: boolean;
    elm_ready: boolean;
    poll_interval_ms: number;
    connect_fail_count_5m: number;
  };
  signals: {
    rpm: number;
    obd_speed_kph: number;
    coolant_c: number;
    fuel_level_pct: number;
    engine_load_pct: number;
  };
  quality: {
    sample_age_ms: number;
    missing_signals: string[];
  };
  events: Array<{ code: string; count_5m: number }>;
} => {
  const obdReady = connectFailCount5m === 0 || Math.random() > 0.1;
  const missingSignals = obdReady
    ? []
    : ['rpm', 'obd_speed_kph', 'coolant_c', 'fuel_level_pct', 'engine_load_pct'];

  return {
    channel: {
      ble_obd_connected: obdReady,
      elm_ready: obdReady,
      poll_interval_ms: 1200,
      connect_fail_count_5m: connectFailCount5m,
    },
    signals: {
      rpm,
      obd_speed_kph: roundTo(Math.max(0, speed + randomBetween(-1.2, 1.2)), 2),
      coolant_c: coolantC,
      fuel_level_pct: fuelLevelPct,
      engine_load_pct: engineLoadPct,
    },
    quality: {
      sample_age_ms: sampleAgeMs,
      missing_signals: missingSignals,
    },
    events:
      connectFailCount5m > 0
        ? [{ code: 'obd_connect_failed', count_5m: connectFailCount5m }]
        : [],
  };
};

const publishDeviceRawData = (
  client: SimulatorMqttClient,
  device: DeviceSimulatorRuntime,
  timestamp: number,
  data: {
    vibration: number;
    vehicleBattery: number;
    deviceBattery: number;
    latitude: number;
    longitude: number;
    speed: number;
    course: number;
    satellites: number;
    ignition: boolean;
    rpm: number;
    coolantC: number;
    fuelLevelPct: number;
    engineLoadPct: number;
    sampleAgeMs: number;
    connectFailCount5m: number;
    uptimeMs: number;
    errorCode?: number;
  },
): Promise<void> =>
  publishMqttMessage(
    client,
    `v1/${device.deviceId}/rawdata`,
    {
      device_id: device.deviceId,
      auth_token: device.authToken,
      timestamp,
      uptime: data.uptimeMs,
      data: {
        vibration: data.vibration,
        vehicle_battery: data.vehicleBattery,
        device_battery: data.deviceBattery,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        course: data.course,
        satellites: data.satellites,
        ignition: data.ignition,
        error_code: data.errorCode,
      },
      diagnostics: buildDiagnostics(
        data.speed,
        data.rpm,
        data.coolantC,
        data.fuelLevelPct,
        data.engineLoadPct,
        data.sampleAgeMs,
        data.connectFailCount5m,
      ),
      metadata: createPayloadMetadata(device, timestamp, RAWDATA_SCHEMA_VERSION),
    },
    { qos: 0 },
  );

const publishDeviceEvent = (
  client: SimulatorMqttClient,
  device: DeviceSimulatorRuntime,
  timestamp: number,
  eventType: 'error' | 'warning' | 'info',
  code: number,
  message: string,
): Promise<void> =>
  publishMqttMessage(
    client,
    `v1/${device.deviceId}/events`,
    {
      device_id: device.deviceId,
      auth_token: device.authToken,
      event_type: eventType,
      code,
      message,
      timestamp,
      metadata: createPayloadMetadata(device, timestamp, DEFAULT_SCHEMA_VERSION),
    },
    { qos: 1 },
  );

const dedupeDeviceIds = (ids: string[]): string[] =>
  Array.from(new Set(ids.map((item) => item.trim()).filter((item) => item.length > 0)));

const moveCoordinates = (
  lat: number,
  lon: number,
  distanceMeters: number,
  headingDeg: number,
): { lat: number; lon: number } => {
  const headingRad = (headingDeg * Math.PI) / 180;
  const metersPerLatDegree = 111_320;
  const metersPerLonDegree = Math.max(1, Math.cos((lat * Math.PI) / 180) * 111_320);

  const deltaLat = (distanceMeters * Math.cos(headingRad)) / metersPerLatDegree;
  const deltaLon = (distanceMeters * Math.sin(headingRad)) / metersPerLonDegree;

  return {
    lat: lat + deltaLat,
    lon: lon + deltaLon,
  };
};

const toStatus = (
  snapshot: StoredSnapshot | RunningSimulationState | null,
  running: boolean,
): SimulatorStatus => {
  if (!snapshot) {
    return {
      running: false,
      paused: false,
      jobId: null,
      startedBy: null,
      startedAt: null,
      stoppedAt: null,
      expiresAt: null,
      lastTickAt: null,
      intervalSec: null,
      durationMin: null,
      ticks: 0,
      sentPoints: 0,
      deviceIds: [],
      reason: null,
      preview: [],
    };
  }

  const deviceIds =
    'devices' in snapshot ? snapshot.devices.map((device) => device.deviceId) : snapshot.deviceIds;

  return {
    running,
    paused: running && 'paused' in snapshot ? snapshot.paused : false,
    jobId: snapshot.jobId,
    startedBy: snapshot.startedBy,
    startedAt: snapshot.startedAt.toISOString(),
    stoppedAt:
      !running && 'stoppedAt' in snapshot && snapshot.stoppedAt
        ? snapshot.stoppedAt.toISOString()
        : null,
    expiresAt: snapshot.expiresAt.toISOString(),
    lastTickAt: snapshot.lastTickAt?.toISOString() ?? null,
    intervalSec: snapshot.config.intervalSec,
    durationMin: snapshot.config.durationMin,
    ticks: snapshot.ticks,
    sentPoints: snapshot.sentPoints,
    deviceIds,
    reason: snapshot.reason ?? null,
    preview: snapshot.preview,
  };
};

const closeSimulatorOwnedSession = async (sessionId: number, deviceId: string): Promise<void> => {
  const nowIso = new Date().toISOString();
  const stopCorrelationId = `simulator-stop:${randomUUID()}`;

  let runtimeSeconds = 0;

  try {
    const updateResult = await pool.query<{ runtime_seconds: string | number }>(
      `UPDATE device_sessions
       SET
         status = 'completed',
         server_session_end = $2,
         session_end = $2,
         last_update = $2,
         uptime = GREATEST(EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int, 0),
         total_runtime_seconds = GREATEST(EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int, 0),
         end_correlation_id = $3,
         updated_at = NOW()
       WHERE id = $1
       RETURNING COALESCE(total_runtime_seconds, uptime, 0)::text AS runtime_seconds`,
      [sessionId, nowIso, stopCorrelationId],
    );

    runtimeSeconds = Number.parseInt(String(updateResult.rows[0]?.runtime_seconds ?? '0'), 10);
  } catch {
    const updateResult = await pool.query<{ runtime_seconds: string | number }>(
      `UPDATE device_sessions
       SET
         status = 'completed',
         server_session_end = $2,
         session_end = $2,
         last_update = $2,
         uptime = GREATEST(EXTRACT(EPOCH FROM ($2::timestamptz - COALESCE(server_session_start, created_at)))::int, 0),
         end_correlation_id = $3,
         updated_at = NOW()
       WHERE id = $1
       RETURNING COALESCE(uptime, 0)::text AS runtime_seconds`,
      [sessionId, nowIso, stopCorrelationId],
    );

    runtimeSeconds = Number.parseInt(String(updateResult.rows[0]?.runtime_seconds ?? '0'), 10);
  }

  await pool.query(
    `UPDATE devices
     SET
       current_status = 'stopped',
       total_runtime_seconds = COALESCE(total_runtime_seconds, 0) + $2,
       updated_at = NOW()
     WHERE device_id = $1`,
    [deviceId, Math.max(0, runtimeSeconds)],
  );
};

const restoreSimulatorAuthTokens = async (
  devices: DeviceSimulatorRuntime[],
  reason: string,
): Promise<void> => {
  await Promise.all(
    devices.map(async (device) => {
      try {
        await pool.query(
          `UPDATE devices
           SET auth_token = $3, updated_at = NOW()
           WHERE device_id = $1 AND auth_token = $2`,
          [device.deviceId, device.simulatorAuthTokenHash, device.originalAuthToken],
        );
      } catch (error) {
        logger.error('Failed to restore device auth token after simulator state change', {
          reason,
          deviceId: device.deviceId,
          error: (error as Error).message,
        });
      }
    }),
  );
};

const stopSimulationInternal = async (reason: string): Promise<SimulatorStatus> => {
  if (!runningSimulation) {
    return toStatus(lastSnapshot, false);
  }

  const current = runningSimulation;
  runningSimulation = null;
  clearInterval(current.timer);

  const now = new Date();
  const timestamp = now.getTime();

  for (const device of current.devices) {
    try {
      await publishDeviceStatus(current.mqttClient, device, 'stopped', timestamp);
    } catch (error) {
      logger.error('Failed to publish simulator stop status', {
        deviceId: device.deviceId,
        error: (error as Error).message,
      });
    }
  }

  for (const device of current.devices) {
    try {
      const activeSessionResult = await pool.query<SessionLookupRow>(
        `SELECT id
         FROM device_sessions
         WHERE device_id = $1 AND status = 'running'
         ORDER BY created_at DESC
         LIMIT 1`,
        [device.deviceId],
      );

      const activeSessionId = activeSessionResult.rows[0]?.id ?? null;
      if (activeSessionId !== null) {
        await closeSimulatorOwnedSession(activeSessionId, device.deviceId);
        continue;
      }

      await pool.query(
        `UPDATE devices
         SET current_status = 'stopped', updated_at = NOW()
         WHERE device_id = $1`,
        [device.deviceId],
      );
    } catch (error) {
      logger.error('Failed to stop simulator for device', {
        deviceId: device.deviceId,
        error: (error as Error).message,
      });
    }
  }

  await restoreSimulatorAuthTokens(current.devices, reason);

  const finalRetainedTimestamp = Date.now();
  for (const device of current.devices) {
    try {
      await publishDeviceStatus(
        current.mqttClient,
        device,
        'stopped',
        finalRetainedTimestamp,
        device.originalAuthToken,
      );
    } catch (error) {
      logger.error('Failed to overwrite retained simulator stop status after auth restore', {
        deviceId: device.deviceId,
        error: (error as Error).message,
      });
    }
  }

  try {
    await endMqttClient(current.mqttClient);
  } catch (error) {
    logger.error('Failed to close simulator MQTT client', {
      error: (error as Error).message,
    });
  }

  lastSnapshot = {
    jobId: current.jobId,
    config: current.config,
    startedBy: current.startedBy,
    startedAt: current.startedAt,
    stoppedAt: now,
    expiresAt: current.expiresAt,
    lastTickAt: current.lastTickAt,
    ticks: current.ticks,
    sentPoints: current.sentPoints,
    reason,
    deviceIds: current.devices.map((device) => device.deviceId),
    preview: current.preview,
  };

  return toStatus(lastSnapshot, false);
};

const tickSimulation = async (state: RunningSimulationState): Promise<void> => {
  const now = new Date();
  const intervalSec = Math.max(1, state.config.intervalSec);

  const payloads: SimulatorPoint[] = [];

  for (const device of state.devices) {
    const speed = roundTo(randomBetween(state.config.speedMin, state.config.speedMax), 2);
    const vibration = roundTo(
      randomBetween(state.config.vibrationMin, state.config.vibrationMax),
      2,
    );

    device.heading = normalizeHeading(device.heading + randomBetween(-20, 20));
    const travelMeters = Math.max(0, speed) * (intervalSec / 3.6);
    const moved = moveCoordinates(device.lat, device.lon, travelMeters, device.heading);
    const noiseLat = randomBetween(-0.00002, 0.00002);
    const noiseLon = randomBetween(-0.00002, 0.00002);
    const pullFactor = 0.015;

    const nextLat = roundTo(
      moved.lat * (1 - pullFactor) + state.config.lat * pullFactor + noiseLat,
      6,
    );
    const nextLon = roundTo(
      moved.lon * (1 - pullFactor) + state.config.lon * pullFactor + noiseLon,
      6,
    );
    device.lat = Number.isFinite(nextLat) ? nextLat : roundTo(state.config.lat, 6);
    device.lon = Number.isFinite(nextLon) ? nextLon : roundTo(state.config.lon, 6);
    device.vehicleBattery = roundTo(
      clamp(
        device.vehicleBattery - randomBetween(0, 0.25),
        state.config.batteryMin,
        state.config.batteryMax,
      ),
      2,
    );
    device.fuelLevel = roundTo(clamp(device.fuelLevel - randomBetween(0, 0.08), 5, 100), 2);
    device.obdConnectFailCount5m =
      Math.random() < 0.025
        ? Math.min(6, device.obdConnectFailCount5m + 1)
        : Math.max(0, device.obdConnectFailCount5m - 1);

    const rpm = roundTo(
      speed < 3
        ? randomBetween(700, 980)
        : randomBetween(850 + speed * 26, 980 + speed * 38),
      0,
    );
    const engineLoadPct = roundTo(clamp(speed * 0.9 + vibration * 5 + randomBetween(5, 20), 10, 98), 2);
    const coolantC = roundTo(clamp(76 + engineLoadPct * 0.32 + randomBetween(-2, 2), 70, 118), 1);
    const sampleAgeMs = Math.round(randomBetween(80, 1400));
    const satellites = Math.round(randomBetween(6, 16));
    const deviceBattery = roundTo(
      clamp(device.vehicleBattery - randomBetween(0.15, 0.9), 0, 100),
      2,
    );

    const thermalRisk = coolantC > 104 && engineLoadPct > 65;
    const errorCode =
      thermalRisk || Math.random() < 0.03 ? (Math.random() < 0.4 ? 201 : 501) : null;

    const timestamp = now.getTime();
    await publishDeviceRawData(state.mqttClient, device, timestamp, {
      vibration,
      vehicleBattery: device.vehicleBattery,
      deviceBattery,
      latitude: device.lat,
      longitude: device.lon,
      speed,
      course: roundTo(device.heading, 2),
      satellites,
      ignition: true,
      rpm,
      coolantC,
      fuelLevelPct: device.fuelLevel,
      engineLoadPct,
      sampleAgeMs,
      connectFailCount5m: device.obdConnectFailCount5m,
      uptimeMs: Math.max(1, Date.now() - state.startedAt.getTime()),
      errorCode: errorCode ?? undefined,
    });

    if (errorCode !== null) {
      await publishDeviceEvent(
        state.mqttClient,
        device,
        timestamp,
        'error',
        errorCode,
        thermalRisk
          ? `Coolant risk pattern detected: ${coolantC}C at load ${engineLoadPct}%`
          : `Simulated device error ${errorCode}`,
      );
    } else if (device.obdConnectFailCount5m >= 3) {
      await publishDeviceEvent(
        state.mqttClient,
        device,
        timestamp,
        'warning',
        1210,
        `OBD reconnect unstable (${device.obdConnectFailCount5m} fails in 5m window)`,
      );
    }

    const point: SimulatorPoint = {
      deviceId: device.deviceId,
      timestamp: now.toISOString(),
      latitude: device.lat,
      longitude: device.lon,
      speed,
      heading: roundTo(device.heading, 2),
      vibration,
      vehicleBattery: device.vehicleBattery,
      deviceBattery,
      errorCode,
    };

    payloads.push(point);
  }

  state.lastTickAt = now;
  state.ticks += 1;
  state.sentPoints += payloads.length;
  state.preview = payloads.slice(0, 50);
};

const executeTickSafely = async (): Promise<void> => {
  if (!runningSimulation) {
    return;
  }

  const state = runningSimulation;
  if (state.paused) {
    return;
  }
  if (state.ticking) {
    return;
  }
  state.ticking = true;

  try {
    await tickSimulation(state);
  } catch (error) {
    logger.error('Simulator tick failed', { error: (error as Error).message });
  } finally {
    state.ticking = false;
  }

  if (Date.now() >= state.expiresAt.getTime()) {
    await stopSimulationInternal('duration_elapsed');
  }
};

export const startSimulation = async (
  input: SimulatorStartInput,
  userId: number,
): Promise<SimulatorStatus> => {
  const deviceIds = dedupeDeviceIds(input.deviceIds);
  if (deviceIds.length === 0) {
    throw createValidationError('deviceIds must contain at least one device');
  }

  if (runningSimulation) {
    await stopSimulationInternal('restarted');
  }

  const devicesResult = await pool.query<DeviceLookupRow>(
    `SELECT device_id, auth_token, latitude, longitude
     FROM devices
     WHERE device_id = ANY($1::text[])`,
    [deviceIds],
  );

  const foundIds = new Set(devicesResult.rows.map((row) => row.device_id));
  const missingIds = deviceIds.filter((deviceId) => !foundIds.has(deviceId));
  if (missingIds.length > 0) {
    throw createValidationError('Some devices were not found', { missingIds });
  }

  const runtimes: DeviceSimulatorRuntime[] = [];

  for (let index = 0; index < devicesResult.rows.length; index += 1) {
    const row = devicesResult.rows[index];
    if (!row.auth_token) {
      throw createValidationError(`Device ${row.device_id} is missing auth token`);
    }

    const activeSessionResult = await pool.query<SessionLookupRow>(
      `SELECT id
       FROM device_sessions
       WHERE device_id = $1 AND status = 'running'
       ORDER BY created_at DESC
       LIMIT 1`,
      [row.device_id],
    );
    const activeSessionId = activeSessionResult.rows[0]?.id ?? null;
    if (activeSessionId !== null) {
      await closeSimulatorOwnedSession(activeSessionId, row.device_id);
    }

    const parsedLatitude = toFiniteNumber(row.latitude);
    const parsedLongitude = toFiniteNumber(row.longitude);

    const initialLat = parsedLatitude ?? roundTo(input.lat + randomBetween(-0.0005, 0.0005), 6);
    const initialLon = parsedLongitude ?? roundTo(input.lon + randomBetween(-0.0005, 0.0005), 6);

    const simulatorAuthToken = `sim-${randomUUID()}`;

    runtimes.push({
      deviceId: row.device_id,
      authToken: simulatorAuthToken,
      simulatorAuthTokenHash: hashToken(simulatorAuthToken),
      originalAuthToken: row.auth_token,
      lat: initialLat,
      lon: initialLon,
      heading: normalizeHeading(randomBetween(0, 359)),
      vehicleBattery: roundTo(randomBetween(input.batteryMin, input.batteryMax), 2),
      fuelLevel: roundTo(randomBetween(35, 95), 2),
      obdConnectFailCount5m: 0,
      seqNo: 0,
      bootId: createBootId(row.device_id),
    });
  }

  await Promise.all(
    runtimes.map((device) =>
      pool.query(
        `UPDATE devices
         SET auth_token = $2, updated_at = NOW()
         WHERE device_id = $1`,
        [device.deviceId, device.simulatorAuthTokenHash],
      ),
    ),
  );

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + input.durationMin * 60_000);
  const jobId = `sim-${Date.now()}`;

  let mqttClient: SimulatorMqttClient | null = null;

  try {
    mqttClient = await createSimulatorMqttClient();
    const startedTimestamp = Date.now();
    await Promise.all(
      runtimes.map((device) => publishDeviceStatus(mqttClient!, device, 'running', startedTimestamp)),
    );
  } catch (error) {
    if (mqttClient) {
      await endMqttClient(mqttClient);
    }
    await restoreSimulatorAuthTokens(runtimes, 'start_failed');
    throw error;
  }

  const timer = setInterval(
    () => {
      void executeTickSafely();
    },
    Math.max(1, input.intervalSec) * 1000,
  );

  runningSimulation = {
    jobId,
    config: {
      ...input,
      deviceIds,
    },
    startedBy: userId,
    startedAt,
    expiresAt,
    lastTickAt: null,
    ticks: 0,
    sentPoints: 0,
    reason: null,
    devices: runtimes,
    preview: [],
    timer,
    ticking: false,
    paused: false,
    mqttClient: mqttClient!,
  };

  await executeTickSafely();

  return toStatus(runningSimulation, true);
};

export const stopSimulation = async (): Promise<SimulatorStatus> =>
  stopSimulationInternal('stopped_by_user');

export const getSimulationStatus = (): SimulatorStatus => {
  if (runningSimulation) {
    return toStatus(runningSimulation, true);
  }
  return toStatus(lastSnapshot, false);
};

export const pauseSimulation = (): SimulatorStatus => {
  if (!runningSimulation) {
    return toStatus(lastSnapshot, false);
  }
  runningSimulation.paused = true;
  return toStatus(runningSimulation, true);
};

export const resumeSimulation = (): SimulatorStatus => {
  if (!runningSimulation) {
    return toStatus(lastSnapshot, false);
  }
  runningSimulation.paused = false;
  return toStatus(runningSimulation, true);
};
