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
  battery: number;
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
  latitude: number | null;
  longitude: number | null;
}

interface SessionLookupRow {
  id: number;
}

let runningSimulation: RunningSimulationState | null = null;
let lastSnapshot: StoredSnapshot | null = null;

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
    },
    { qos: 1, retain: true },
  );

const publishDeviceRawData = (
  client: SimulatorMqttClient,
  device: DeviceSimulatorRuntime,
  timestamp: number,
  data: {
    vibration: number;
    batteryTop: number;
    latitude: number;
    longitude: number;
    speed: number;
    course: number;
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
      data: {
        vibration: data.vibration,
        battery_top: data.batteryTop,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        course: data.course,
        error_code: data.errorCode,
      },
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

    device.lat = roundTo(
      moved.lat * (1 - pullFactor) + state.config.lat * pullFactor + noiseLat,
      6,
    );
    device.lon = roundTo(
      moved.lon * (1 - pullFactor) + state.config.lon * pullFactor + noiseLon,
      6,
    );
    device.battery = roundTo(
      clamp(
        device.battery - randomBetween(0, 0.25),
        state.config.batteryMin,
        state.config.batteryMax,
      ),
      2,
    );

    const errorCode = Math.random() < 0.03 ? (Math.random() < 0.4 ? 201 : 501) : null;

    const timestamp = now.getTime();
    await publishDeviceRawData(state.mqttClient, device, timestamp, {
      vibration,
      batteryTop: device.battery,
      latitude: device.lat,
      longitude: device.lon,
      speed,
      course: roundTo(device.heading, 2),
      errorCode: errorCode ?? undefined,
    });

    if (errorCode !== null) {
      await publishDeviceEvent(
        state.mqttClient,
        device,
        timestamp,
        'error',
        errorCode,
        `Simulated device error ${errorCode}`,
      );
    }

    const point: SimulatorPoint = {
      deviceId: device.deviceId,
      timestamp: now.toISOString(),
      lat: device.lat,
      lon: device.lon,
      speed,
      heading: roundTo(device.heading, 2),
      vibration,
      battery: device.battery,
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

    const initialLat = row.latitude ?? roundTo(input.lat + randomBetween(-0.0005, 0.0005), 6);
    const initialLon = row.longitude ?? roundTo(input.lon + randomBetween(-0.0005, 0.0005), 6);

    const simulatorAuthToken = `sim-${randomUUID()}`;

    runtimes.push({
      deviceId: row.device_id,
      authToken: simulatorAuthToken,
      simulatorAuthTokenHash: hashToken(simulatorAuthToken),
      originalAuthToken: row.auth_token,
      lat: initialLat,
      lon: initialLon,
      heading: normalizeHeading(randomBetween(0, 359)),
      battery: roundTo(randomBetween(input.batteryMin, input.batteryMax), 2),
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
