export type SimulatorMode = 'generate-publish' | 'dry-run' | 'replay';

export type SimulatorFaultType =
  | 'none'
  | 'jitter'
  | 'duplicate'
  | 'out-of-order'
  | 'spike'
  | 'reconnect'
  | 'invalid_payload';

export interface MqttTopicContract {
  topicTemplate: string;
  direction: 'device_to_server' | 'server_to_device';
  qos: 0 | 1;
  retainDefault: boolean;
  requiredFields: string[];
}

export interface ScenarioTopicMix {
  topicTemplate: string;
  weight: number;
}

export interface SimulatorScenario {
  id: string;
  description: string;
  deviceId: string;
  intervalMs: number;
  eventCount: number;
  strictValidation: boolean;
  faultProfile: string;
  topicMix: ScenarioTopicMix[];
}

export interface FaultProfileRule {
  faultType: SimulatorFaultType;
  ratio: number;
}

export interface FaultProfile {
  id: string;
  reconnectBackoffMs: number[];
  jitterWindowMs: number;
  invalidPayloadDropInStrictMode: boolean;
  rules: FaultProfileRule[];
}

export interface SimulatorPayload {
  schema_version: string;
  message_id: string;
  sent_at: string;
  seq_no: number;
  boot_id: string;
  [key: string]: unknown;
}

export interface PlannedEvent {
  run_id: string;
  event_index: number;
  scheduled_at_ms: number;
  device_id: string;
  topic: string;
  qos: 0 | 1;
  retain: boolean;
  fault_type: SimulatorFaultType;
  expected_effect: 'ingest' | 'drop' | 'delayed_ingest' | 'reconnect_recovered';
  payload: SimulatorPayload;
  replay_checksum: string;
}

export interface PublishResult {
  run_id: string;
  event_index: number;
  topic: string;
  published_at: string;
  scheduled_at_ms: number;
  ok: boolean;
  fault_type: SimulatorFaultType;
  error: string | null;
}

export interface RunnerArtifacts {
  runDir: string;
  eventPlanPath: string;
  publishResultPath: string;
  errorSummaryPath: string;
  runSummaryPath: string;
}

export interface RunnerArgs {
  mode: SimulatorMode;
  scenarioId: string;
  seed: number;
  outDir: string;
  replayFile?: string;
  strict?: boolean;
}
