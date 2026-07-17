import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type {
  FaultProfile,
  PlannedEvent,
  PublishResult,
  RunnerArgs,
  SimulatorFaultType,
  SimulatorPayload,
  SimulatorScenario,
} from '../simulator-specs/backend-simulator-types';
import { validatePayloadForTopic } from '../simulator-specs/backend-simulator-validator';

interface TopicContract { topicTemplate: string; qos: 0 | 1; retainDefault: boolean; requiredFields: string[] }
interface ContractBaseline { topics: TopicContract[] }
interface ScenarioCatalog { defaultSeed: number; scenarios: SimulatorScenario[] }
interface FaultPolicy { profiles: FaultProfile[] }

const SPEC_DIR = resolve(dirname(__dirname), 'simulator-specs');
const ARTIFACT_ROOT = resolve(dirname(__dirname), 'artifacts');
const nowIso = (): string => new Date().toISOString();
const toIso = (ms: number): string => new Date(ms).toISOString();
const hash = (v: string): string => createHash('sha256').update(v).digest('hex');

const rngFactory = (seed: number): (() => number) => {
  let t = seed + 0x6d2b79f5;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const pickWeighted = <T>(items: { item: T; weight: number }[], rng: () => number): T => {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let cursor = rng() * total;
  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) return item.item;
  }
  return items[items.length - 1].item;
};

const loadJson = async <T>(fileName: string): Promise<T> => {
  const raw = await readFile(join(SPEC_DIR, fileName), 'utf8');
  return JSON.parse(raw) as T;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const topicTemplateToRegex = (topicTemplate: string): RegExp => {
  const pattern = `^${escapeRegex(topicTemplate).replace('\\{device_id\\}', '[^/]+')}$`;
  return new RegExp(pattern);
};

const findContractByTopic = (topics: TopicContract[], topic: string): TopicContract | undefined =>
  topics.find((item) => topicTemplateToRegex(item.topicTemplate).test(topic));

const parseReplayEvents = (raw: string): PlannedEvent[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as PlannedEvent[];
  }
  return trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as PlannedEvent);
};

const createPayload = (
  scenario: SimulatorScenario,
  eventIndex: number,
  runId: string,
  topicTemplate: string,
): SimulatorPayload => {
  const speed = Number((20 + (eventIndex % 7) * 5).toFixed(1));
  const vehicleBattery = Number((14.2 - eventIndex * 0.02).toFixed(2));
  const deviceBattery = Number((4.12 - eventIndex * 0.01).toFixed(2));
  const payload: SimulatorPayload = {
    schema_version: topicTemplate === 'v1/{device_id}/rawdata' ? 'v2.0.0' : 'v1.0.0',
    message_id: `${runId}-${eventIndex}`,
    sent_at: nowIso(),
    seq_no: eventIndex + 1,
    boot_id: `boot-${scenario.deviceId}`,
    device_id: scenario.deviceId,
    status: eventIndex % 12 === 0 ? 'online' : 'running',
    data: {
      vibration: Number((1 + (eventIndex % 5) * 0.35).toFixed(2)),
      vehicle_battery: vehicleBattery,
      device_battery: deviceBattery,
      latitude: Number((10.762622 + eventIndex * 0.00012).toFixed(6)),
      longitude: Number((106.660172 + eventIndex * 0.00008).toFixed(6)),
      speed,
      course: (90 + eventIndex * 5) % 360,
      satellites: 9 + (eventIndex % 3),
      ignition: eventIndex % 17 === 0,
      error_code: eventIndex % 19 === 0 ? 201 : undefined,
    },
  };

  if (topicTemplate === 'v1/{device_id}/events') {
    payload.event_type = 'system';
    payload.code = 'SIM_EVENT';
    payload.message = `simulated event ${eventIndex + 1}`;
  }

  if (topicTemplate === 'v1/{device_id}/firmware') {
    payload.firmware_status = eventIndex % 15 === 0 ? 'updating' : 'idle';
  }

  return payload;
};

const applyFault = (
  event: PlannedEvent,
  fault: SimulatorFaultType,
  rng: () => number,
  profile: FaultProfile,
): PlannedEvent[] => {
  if (fault === 'none') return [event];
  if (fault === 'duplicate') return [event, { ...event, replay_checksum: hash(`${event.replay_checksum}:dup`) }];
  if (fault === 'out-of-order') return [{ ...event, scheduled_at_ms: event.scheduled_at_ms + 5 }, { ...event, scheduled_at_ms: event.scheduled_at_ms - 5 }];
  if (fault === 'jitter') return [{ ...event, scheduled_at_ms: event.scheduled_at_ms + Math.floor((rng() - 0.5) * profile.jitterWindowMs) }];
  if (fault === 'spike') {
    const payload = {
      ...event.payload,
      data: {
        ...(event.payload.data as object),
        speed: 230,
        vehicle_battery: 10,
        device_battery: 3.6,
      },
    };
    return [{ ...event, payload, expected_effect: 'ingest' }];
  }
  if (fault === 'reconnect') {
    const delay = profile.reconnectBackoffMs[event.event_index % profile.reconnectBackoffMs.length] ?? 1000;
    return [{ ...event, scheduled_at_ms: event.scheduled_at_ms + delay, expected_effect: 'reconnect_recovered' }];
  }
  const payload = { ...event.payload };
  delete payload.schema_version;
  return [{ ...event, payload, expected_effect: 'drop' }];
};

const buildPlan = (scenario: SimulatorScenario, contract: ContractBaseline, policy: FaultPolicy, seed: number): PlannedEvent[] => {
  const runId = `mqtt-sim-${Date.now()}-${seed}`;
  const rng = rngFactory(seed);
  const profile = policy.profiles.find((p) => p.id === scenario.faultProfile);
  if (!profile) throw new Error(`Missing fault profile: ${scenario.faultProfile}`);

  const faults = profile.rules.map((rule) => ({ item: rule.faultType, weight: rule.ratio }));
  const topics = scenario.topicMix.map((mix) => ({ item: mix.topicTemplate, weight: mix.weight }));

  const planned: PlannedEvent[] = [];
  for (let index = 0; index < scenario.eventCount; index += 1) {
    const topicTemplate = pickWeighted(topics, rng);
    const topic = topicTemplate.replace('{device_id}', scenario.deviceId);
    const contractTopic = contract.topics.find((t) => t.topicTemplate === topicTemplate);
    if (!contractTopic) throw new Error(`Missing contract for topic ${topicTemplate}`);
    const payload = createPayload(scenario, index, runId, topicTemplate);
    const scheduledAtMs = Date.now() + index * scenario.intervalMs;
    payload.sent_at = toIso(scheduledAtMs);
    const event: PlannedEvent = {
      run_id: runId,
      event_index: index,
      scheduled_at_ms: scheduledAtMs,
      device_id: scenario.deviceId,
      topic,
      qos: contractTopic.qos,
      retain: contractTopic.retainDefault,
      fault_type: pickWeighted(faults, rng),
      expected_effect: 'ingest',
      payload,
      replay_checksum: hash(JSON.stringify({ topic, payload, index })),
    };
    planned.push(...applyFault(event, event.fault_type, rng, profile));
  }
  return planned.sort((a, b) => a.scheduled_at_ms - b.scheduled_at_ms);
};

const publishEvents = async (events: PlannedEvent[], strictValidation: boolean): Promise<PublishResult[]> => {
  const mqttMod = await import('mqtt');
  const host = process.env.MQTT_HOST ?? 'localhost';
  const port = Number(process.env.MQTT_PORT ?? 1883);
  const protocol = String(process.env.MQTT_TLS ?? 'false') === 'true' ? 'mqtts' : 'mqtt';
  const client = mqttMod.connect(`${protocol}://${host}:${port}`, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 0,
    clientId: `sim-runner-${randomUUID()}`,
  });
  await new Promise<void>((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('error', reject);
  });

  const baseline = await loadJson<ContractBaseline>('mqtt-contract-baseline.json');
  const results: PublishResult[] = [];
  for (const event of events) {
    const contract = findContractByTopic(baseline.topics, event.topic);
    const errors = contract ? validatePayloadForTopic(contract, event.payload) : ['missing_contract'];
    if (strictValidation && errors.length > 0) {
      results.push({ run_id: event.run_id, event_index: event.event_index, topic: event.topic, published_at: nowIso(), scheduled_at_ms: event.scheduled_at_ms, ok: false, fault_type: event.fault_type, error: errors.join(',') });
      continue;
    }

    const ok = await new Promise<boolean>((resolve) => {
      client.publish(event.topic, JSON.stringify(event.payload), { qos: event.qos, retain: event.retain }, (error) => resolve(!error));
    });
    results.push({ run_id: event.run_id, event_index: event.event_index, topic: event.topic, published_at: nowIso(), scheduled_at_ms: event.scheduled_at_ms, ok, fault_type: event.fault_type, error: ok ? null : 'publish_failed' });
  }
  client.end(true);
  return results;
};

const writeArtifacts = async (baseDir: string, events: PlannedEvent[], results: PublishResult[]): Promise<void> => {
  await mkdir(baseDir, { recursive: true });
  await writeFile(join(baseDir, 'event-plan.ndjson'), `${events.map((e) => JSON.stringify(e)).join('\n')}\n`, 'utf8');
  await writeFile(join(baseDir, 'publish-result.ndjson'), `${results.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8');
  const success = results.filter((r) => r.ok).length;
  await writeFile(join(baseDir, 'error-summary.json'), JSON.stringify({ total: results.length, failed: results.length - success }, null, 2), 'utf8');
  await writeFile(join(baseDir, 'run-summary.json'), JSON.stringify({ runId: events[0]?.run_id ?? null, totalEvents: events.length, published: success, failed: results.length - success }, null, 2), 'utf8');
};

const main = async (): Promise<void> => {
  const args: RunnerArgs = {
    mode: (process.argv[2] as RunnerArgs['mode']) ?? 'dry-run',
    scenarioId: process.argv[3] ?? 'baseline-smoke',
    seed: Number(process.argv[4] ?? 260410),
    outDir: process.argv[5] ?? join(ARTIFACT_ROOT, `run-${Date.now()}`),
    strict: (process.argv[6] ?? 'true') !== 'false',
    replayFile: process.argv[7],
  };
  const catalog = await loadJson<ScenarioCatalog>('mqtt-scenarios-catalog.json');
  const baseline = await loadJson<ContractBaseline>('mqtt-contract-baseline.json');
  const policy = await loadJson<FaultPolicy>('mqtt-fault-injection-policy.json');
  const scenario = catalog.scenarios.find((item) => item.id === args.scenarioId);
  if (!scenario) throw new Error(`Scenario not found: ${args.scenarioId}`);

  const events = args.mode === 'replay' && args.replayFile
    ? parseReplayEvents(await readFile(resolve(args.replayFile), 'utf8'))
    : buildPlan(scenario, baseline, policy, args.seed || catalog.defaultSeed);

  const results = args.mode === 'generate-publish' || args.mode === 'replay'
    ? await publishEvents(events, args.strict ?? scenario.strictValidation)
    : events.map((event) => ({ run_id: event.run_id, event_index: event.event_index, topic: event.topic, published_at: nowIso(), scheduled_at_ms: event.scheduled_at_ms, ok: true, fault_type: event.fault_type, error: null }));

  await writeArtifacts(resolve(args.outDir), events, results);
};

void main();
