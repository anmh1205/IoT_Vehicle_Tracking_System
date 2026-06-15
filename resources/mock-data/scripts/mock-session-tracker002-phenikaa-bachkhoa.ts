/**
 * Mock Session Data Script — TRACKER_002 (Phenikaa → Bách Khoa HN)
 *
 * Generates a complete driving session mimicking real ESP32-S3 firmware payloads.
 * Uses manually-verified anchor points interpolated at 15m spacing along main roads.
 * Route: Nguyễn Trác → Tố Hữu → Nguyễn Trãi → Ngã Tư Sở → Trường Chinh → Đại Cồ Việt
 *
 * Usage:
 *   npx tsx resources/mock-data/scripts/mock-session-tracker002-phenikaa-bachkhoa.ts --dry-run
 *   npx tsx resources/mock-data/scripts/mock-session-tracker002-phenikaa-bachkhoa.ts --live \
 *     --mqtt-host <host> --mqtt-port 1883 --mqtt-username <user> --mqtt-password <pass>
 */

import { randomBytes } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

// ─── Config ──────────────────────────────────────────────────────────────────

const DEFAULTS = {
  deviceId: 'TRACKER_002',
  authToken: 'mock-auth-token-tracker002',
  mqttHost: 'localhost',
  mqttPort: 1883,
  bootUptimeMs: 80000,
};

const SV = 'v2.0.0';
const SPEED_THRESHOLD = 3;
const ACCEL = 3; // km/h per second

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoutePoint { lat: number; lon: number; speed_kmh: number; }
interface Msg { topic: string; qos: 0 | 1; payload: string; ts: number; }

// ─── Geo ─────────────────────────────────────────────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const noise = (v: number, a: number) => v + (Math.random() - 0.5) * 2 * a;
const round = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

// ─── Generator: yields one message at a time (no buffering) ──────────────────

function* generateSession(route: RoutePoint[], deviceId: string, authToken: string): Generator<Msg> {
  const bootId = `fw-TRACKER_002-${randomBytes(4).toString('hex')}`;
  const lsk = 1;
  let seq = 1, up = DEFAULTS.bootUptimeMs, spd = 0, cool = 45, fuel = 72.5;
  const startTs = Date.now();
  const ts = () => startTs + (up - DEFAULTS.bootUptimeMs);

  // Pre-compute cumulative distances
  const cumDist = [0];
  for (let i = 1; i < route.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineM(route[i - 1].lat, route[i - 1].lon, route[i].lat, route[i].lon));
  }
  const totalDist = cumDist[cumDist.length - 1];

  // STATUS started
  up += 1000;
  yield { topic: `v1/${deviceId}/status`, qos: 1, ts: ts(), payload: JSON.stringify({
    device_id: deviceId, auth_token: authToken, status: 'running', timestamp: ts(), timestamp_trusted: true,
    state: { ignition_state: 'ON', motion_state: 'STATIONARY', vehicle_state: 'IDLING_ON', device_state: 'ACTIVE', sleep_mode: 'NONE' },
    device_alerts: [], ecu_alerts: [], local_session_key: lsk, boot_id: bootId, boundary_event: 'started',
    metadata: { schema_version: SV, sent_at: ts(), seq_no: seq++, boot_id: bootId },
  })};

  // Walk route
  let posM = 0;
  while (posM < totalDist) {
    up += 1000;

    // Find segment and target speed
    let segIdx = 0;
    { let lo = 0, hi = cumDist.length - 2;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (cumDist[m] <= posM) lo = m; else hi = m - 1; }
      segIdx = lo;
    }
    const targetSpd = route[Math.min(segIdx + 1, route.length - 1)].speed_kmh || 15;

    // Ramp speed
    if (spd < targetSpd) spd = Math.min(spd + ACCEL, targetSpd);
    else if (spd > targetSpd) spd = Math.max(spd - ACCEL, targetSpd);

    // Ensure minimum advance to prevent near-infinite loop at very low speeds
    const advance = Math.max(spd / 3.6, 0.5);
    posM += advance;

    // Interpolate position
    const clampedPos = Math.min(posM, totalDist);
    const ss = cumDist[segIdx], se = cumDist[segIdx + 1] ?? ss, sl = se - ss;
    const frac = sl > 0 ? (clampedPos - ss) / sl : 0;
    const p0 = route[segIdx], p1 = route[Math.min(segIdx + 1, route.length - 1)];
    const lat = round(p0.lat + (p1.lat - p0.lat) * frac, 6);
    const lon = round(p0.lon + (p1.lon - p0.lon) * frac, 6);
    const course = sl > 1 ? round(bearingDeg(p0.lat, p0.lon, p1.lat, p1.lon), 1) : 0;

    const spdNow = spd > 0 ? Math.max(0, noise(spd, 1)) : 0;
    const mv = spdNow > SPEED_THRESHOLD;
    const rpm = mv ? Math.round(noise(spdNow * 35 + 800, 50)) : Math.round(noise(780, 40));
    cool = Math.min(95, cool + 0.02);
    fuel = Math.max(0, fuel - 0.001);
    const sat = Math.max(6, Math.round(noise(12, 2)));

    yield { topic: `v1/${deviceId}/rawdata`, qos: 0, ts: ts(), payload: JSON.stringify({
      device_id: deviceId, auth_token: authToken, timestamp: ts(), timestamp_trusted: true, uptime: up,
      data: { imu_accel_delta_mps2: round(Math.abs(noise(0.2, 0.3)), 3), vehicle_battery: round(noise(mv ? 14 : 13.6, 0.1), 2), device_battery: round(noise(mv ? 14 : 13.6, 0.1) * 0.295, 2), latitude: lat, longitude: lon, speed: round(spdNow, 1), course, satellites: sat, ignition: true, error_code: 0 },
      diagnostics: { channel: { ble_obd_connected: true, elm_ready: true, ecu_state: 'normal', poll_interval_ms: 1200, connect_fail_count_5m: 0 }, signals: { rpm, obd_speed_kph: Math.round(spdNow), coolant_c: round(cool, 1), fuel_level_pct: round(fuel, 1), engine_load_pct: round(noise(spdNow * 0.8 + 15, 5), 1) }, quality: { sample_age_ms: Math.max(200, Math.round(noise(800, 300))), missing_signals: [] }, events: [], gnss: { query_mode: 'cgnsinf', fix_valid: true, satellites_reported: sat } },
      state: { ignition_state: 'ON', motion_state: mv ? 'MOVING' : 'STATIONARY', vehicle_state: mv ? 'MOVING_ON' : 'IDLING_ON', device_state: 'ACTIVE', sleep_mode: 'NONE' },
      device_alerts: [], ecu_alerts: [], local_session_key: lsk, boot_id: bootId,
      metadata: { schema_version: SV, sent_at: ts(), seq_no: seq++, boot_id: bootId },
    })};
  }

  // Final stop
  up += 1000;
  const lastPt = route[route.length - 1];
  yield { topic: `v1/${deviceId}/rawdata`, qos: 0, ts: ts(), payload: JSON.stringify({
    device_id: deviceId, auth_token: authToken, timestamp: ts(), timestamp_trusted: true, uptime: up,
    data: { imu_accel_delta_mps2: 0.1, vehicle_battery: 13.6, device_battery: 4.01, latitude: lastPt.lat, longitude: lastPt.lon, speed: 0, course: 0, satellites: 12, ignition: true, error_code: 0 },
    diagnostics: { channel: { ble_obd_connected: true, elm_ready: true, ecu_state: 'normal', poll_interval_ms: 1200, connect_fail_count_5m: 0 }, signals: { rpm: 780, obd_speed_kph: 0, coolant_c: round(cool, 1), fuel_level_pct: round(fuel, 1), engine_load_pct: 12 }, quality: { sample_age_ms: 800, missing_signals: [] }, events: [], gnss: { query_mode: 'cgnsinf', fix_valid: true, satellites_reported: 12 } },
    state: { ignition_state: 'ON', motion_state: 'STATIONARY', vehicle_state: 'IDLING_ON', device_state: 'ACTIVE', sleep_mode: 'NONE' },
    device_alerts: [], ecu_alerts: [], local_session_key: lsk, boot_id: bootId,
    metadata: { schema_version: SV, sent_at: ts(), seq_no: seq++, boot_id: bootId },
  })};

  // STATUS ended
  up += 1000;
  yield { topic: `v1/${deviceId}/status`, qos: 1, ts: ts(), payload: JSON.stringify({
    device_id: deviceId, auth_token: authToken, status: 'stopped', timestamp: ts(), timestamp_trusted: true,
    state: { ignition_state: 'OFF', motion_state: 'STATIONARY', vehicle_state: 'PARKED_OFF', device_state: 'ACTIVE', sleep_mode: 'NONE' },
    device_alerts: [], ecu_alerts: [], local_session_key: lsk, boot_id: bootId, boundary_event: 'ended',
    metadata: { schema_version: SV, sent_at: ts(), seq_no: seq++, boot_id: bootId },
  })};
}

// ─── Output Modes ────────────────────────────────────────────────────────────

async function runDryMode(route: RoutePoint[], deviceId: string, authToken: string): Promise<void> {
  const outputDir = resolve(dirname(__dirname), 'output');
  await mkdir(outputDir, { recursive: true });
  const filename = `session-tracker002-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.ndjson`;
  const outputPath = join(outputDir, filename);

  const ws = createWriteStream(outputPath);
  let count = 0, firstSeq = 0, lastSeq = 0;

  for (const msg of generateSession(route, deviceId, authToken)) {
    const parsed = JSON.parse(msg.payload);
    if (count === 0) firstSeq = parsed.metadata.seq_no;
    lastSeq = parsed.metadata.seq_no;
    ws.write(JSON.stringify({ topic: msg.topic, qos: msg.qos, ts: msg.ts, payload: parsed }) + '\n');
    count++;
  }

  ws.end();
  await new Promise<void>((res) => ws.on('finish', res));
  console.log(`[dry-run] Generated ${count} messages → ${outputPath}`);
  console.log(`[dry-run] seq_no: ${firstSeq} → ${lastSeq}`);
}

async function runLiveMode(
  route: RoutePoint[], deviceId: string, authToken: string,
  mqttHost: string, mqttPort: number, mqttUsername?: string, mqttPassword?: string,
): Promise<void> {
  const mqtt = await import('mqtt');
  const client = mqtt.connect(`mqtt://${mqttHost}:${mqttPort}`, {
    clientId: `mock-tracker002-${randomBytes(4).toString('hex')}`,
    clean: true,
    ...(mqttUsername && { username: mqttUsername }),
    ...(mqttPassword && { password: mqttPassword }),
  });

  await new Promise<void>((res, rej) => {
    client.on('connect', () => res());
    client.on('error', (err) => rej(err));
    setTimeout(() => rej(new Error('MQTT connection timeout')), 10000);
  });

  console.log(`[live] Connected to mqtt://${mqttHost}:${mqttPort}`);
  let count = 0;

  for (const msg of generateSession(route, deviceId, authToken)) {
    client.publish(msg.topic, msg.payload, { qos: msg.qos });
    count++;
    if (count === 1 || count % 100 === 0) console.log(`[live] [${count}] ${msg.topic}`);
    await new Promise((r) => setTimeout(r, 1000));
  }

  client.end();
  console.log(`[live] Done. ${count} messages published.`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      'dry-run': { type: 'boolean', default: false },
      'live': { type: 'boolean', default: false },
      'mqtt-host': { type: 'string', default: DEFAULTS.mqttHost },
      'mqtt-port': { type: 'string', default: String(DEFAULTS.mqttPort) },
      'mqtt-username': { type: 'string' },
      'mqtt-password': { type: 'string' },
      'device-id': { type: 'string', default: DEFAULTS.deviceId },
      'auth-token': { type: 'string', default: DEFAULTS.authToken },
    },
    strict: true,
  });

  if (!values['dry-run'] && !values['live']) {
    console.error('Usage: --dry-run or --live');
    process.exit(1);
  }

  if (values['device-id']) DEFAULTS.deviceId = values['device-id'];
  if (values['auth-token']) DEFAULTS.authToken = values['auth-token'];

  const routePath = resolve(dirname(__dirname), 'routes', 'phenikaa-to-bachkhoa-waypoints.json');
  const route: RoutePoint[] = JSON.parse(await readFile(routePath, 'utf8'));
  console.log(`[info] Route: ${route.length} GPS points`);

  if (values['dry-run']) {
    await runDryMode(route, DEFAULTS.deviceId, DEFAULTS.authToken);
  } else {
    const host = values['mqtt-host'] ?? DEFAULTS.mqttHost;
    const port = parseInt(values['mqtt-port'] ?? String(DEFAULTS.mqttPort), 10);
    await runLiveMode(route, DEFAULTS.deviceId, DEFAULTS.authToken, host, port, values['mqtt-username'], values['mqtt-password']);
  }
}

main().catch((err) => { console.error('[fatal]', err); process.exit(1); });
