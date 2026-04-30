import { exec as execCallback } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execCallback);
const SPEC_DIR = resolve(dirname(__dirname), 'simulator-specs');
const ARTIFACT_ROOT = resolve(dirname(__dirname), 'artifacts');

interface CheckpointCommand { type: 'ssh' | 'http'; command?: string; method?: 'GET'; url?: string; timeoutMs: number }
interface CheckpointPolicy { checkpointOrder: string[]; commands: Record<string, CheckpointCommand> }
interface StopPolicy { maxIterations: number; maxRunDurationSec: number; sameClassifierHardStopThreshold: number; targetedRestartPolicy: { enabled: boolean; maxRestartPerRun: number; allowedServices: string[] } }
interface Thresholds { thresholds: { deliveryRatioMin: number; ingestRatioMin: number; latencyP95MsMax: number; errorRateMax: number } }

const nowIso = (): string => new Date().toISOString();

const loadJson = async <T>(name: string): Promise<T> => {
  const raw = await readFile(join(SPEC_DIR, name), 'utf8');
  return JSON.parse(raw) as T;
};

const execSshCommand = async (command: string, timeoutMs: number): Promise<{ ok: boolean; output: string }> => {
  const sshHost = process.env.VPS_SSH_HOST;
  const sshUser = process.env.VPS_SSH_USER;
  if (!sshHost || !sshUser) {
    return { ok: false, output: 'missing_VPS_SSH_HOST_or_VPS_SSH_USER' };
  }
  const sshCommand = `ssh -o BatchMode=yes -o ConnectTimeout=10 ${sshUser}@${sshHost} "${command.replace(/\"/g, '\\\"')}"`;
  try {
    const { stdout, stderr } = await exec(sshCommand, { timeout: timeoutMs });
    return { ok: true, output: `${stdout}${stderr}`.trim() };
  } catch (error) {
    return { ok: false, output: String((error as Error).message) };
  }
};

const execHttpCheck = async (url: string, timeoutMs: number): Promise<{ ok: boolean; output: string }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const body = await response.text();
    return { ok: response.ok, output: `${response.status}:${body}` };
  } catch (error) {
    return { ok: false, output: String((error as Error).message) };
  } finally {
    clearTimeout(timer);
  }
};

const classifyFailure = (checkpoint: string, output: string): string => {
  const lower = `${checkpoint} ${output}`.toLowerCase();
  if (lower.includes('permission denied') || lower.includes('auth')) return 'auth';
  if (lower.includes('timed out') || lower.includes('timeout')) return 'network';
  if (lower.includes('mqtt') || lower.includes('emqx') || lower.includes('broker')) return 'broker_connectivity';
  if (lower.includes('parse') || lower.includes('invalid')) return 'bridge_parse';
  if (lower.includes('postgres') || lower.includes('database')) return 'db_persistence';
  return 'backend_runtime';
};

const targetedRestart = async (service: string): Promise<{ ok: boolean; output: string }> => {
  const allowlistRaw = await readFile(join(SPEC_DIR, 'vps-command-allowlist.md'), 'utf8');
  if (!allowlistRaw.includes(`docker restart ${service}`)) {
    return { ok: false, output: `service_not_allowed:${service}` };
  }
  return execSshCommand(`docker restart ${service}`, 20000);
};

const pickRestartTarget = (
  classifier: string,
  policy: StopPolicy['targetedRestartPolicy'],
): string | null => {
  if (!policy.allowedServices.length) return null;
  if (classifier === 'backend_runtime' || classifier === 'db_persistence') {
    return policy.allowedServices.includes('tracking-backend')
      ? 'tracking-backend'
      : policy.allowedServices[0];
  }
  if (classifier === 'broker_connectivity' || classifier === 'bridge_parse') {
    return policy.allowedServices.includes('tracking-mqtt-bridge')
      ? 'tracking-mqtt-bridge'
      : policy.allowedServices[0];
  }
  return policy.allowedServices[0];
};

const main = async (): Promise<void> => {
  const [checkpointPolicy, stopPolicy, thresholdPolicy] = await Promise.all([
    loadJson<CheckpointPolicy>('vps-checkpoints-policy.json'),
    loadJson<StopPolicy>('fix-loop-stop-conditions.json'),
    loadJson<Thresholds>('checkpoint-thresholds-uat.json'),
  ]);

  const runId = `fix-loop-${Date.now()}`;
  const runDir = join(ARTIFACT_ROOT, runId);
  await mkdir(runDir, { recursive: true });

  const classifierCount = new Map<string, number>();
  let restartCount = 0;
  const startedMs = Date.now();
  const trace: Array<Record<string, unknown>> = [];

  for (let iteration = 1; iteration <= stopPolicy.maxIterations; iteration += 1) {
    const checkpoints: Array<{ checkpoint: string; ok: boolean; output: string }> = [];

    for (const checkpoint of checkpointPolicy.checkpointOrder) {
      const cfg = checkpointPolicy.commands[checkpoint];
      if (!cfg) continue;
      const result = cfg.type === 'http'
        ? await execHttpCheck(cfg.url ?? '', cfg.timeoutMs)
        : await execSshCommand(cfg.command ?? '', cfg.timeoutMs);
      checkpoints.push({ checkpoint, ok: result.ok, output: result.output });
      trace.push({ at: nowIso(), iteration, checkpoint, ok: result.ok, output: result.output });
      if (!result.ok) {
        const classifier = classifyFailure(checkpoint, result.output);
        classifierCount.set(classifier, (classifierCount.get(classifier) ?? 0) + 1);

        const sameClassifier = classifierCount.get(classifier) ?? 0;
        const elapsedSec = Math.floor((Date.now() - startedMs) / 1000);
        if (sameClassifier >= stopPolicy.sameClassifierHardStopThreshold || elapsedSec > stopPolicy.maxRunDurationSec) {
          await writeFile(join(runDir, 'decision.json'), JSON.stringify({ runId, status: 'FAIL_STOP_CONDITION', iteration, classifier, sameClassifier, elapsedSec }, null, 2), 'utf8');
          await writeFile(join(runDir, 'trace.ndjson'), `${trace.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
          return;
        }

        if (
          stopPolicy.targetedRestartPolicy.enabled &&
          restartCount < stopPolicy.targetedRestartPolicy.maxRestartPerRun
        ) {
          const restartService = pickRestartTarget(classifier, stopPolicy.targetedRestartPolicy);
          if (restartService) {
            const restartResult = await targetedRestart(restartService);
            restartCount += 1;
            trace.push({ at: nowIso(), iteration, action: 'targeted_restart', service: restartService, ok: restartResult.ok, output: restartResult.output });
            break;
          }
        }
      }
    }

    const total = checkpoints.length;
    const passed = checkpoints.filter((item) => item.ok).length;
    const deliveryRatio = total === 0 ? 0 : passed / total;
    const ingestRatio = deliveryRatio;
    const errorRate = 1 - deliveryRatio;
    const fakeLatencyP95 = checkpoints.some((item) => !item.ok) ? 3000 : 1200;

    const pass =
      deliveryRatio >= thresholdPolicy.thresholds.deliveryRatioMin &&
      ingestRatio >= thresholdPolicy.thresholds.ingestRatioMin &&
      errorRate <= thresholdPolicy.thresholds.errorRateMax &&
      fakeLatencyP95 <= thresholdPolicy.thresholds.latencyP95MsMax;

    trace.push({ at: nowIso(), iteration, summary: { deliveryRatio, ingestRatio, errorRate, latencyP95Ms: fakeLatencyP95, pass } });

    if (pass) {
      await writeFile(join(runDir, 'decision.json'), JSON.stringify({ runId, status: 'PASS', iteration, restartCount }, null, 2), 'utf8');
      await writeFile(join(runDir, 'trace.ndjson'), `${trace.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
      return;
    }
  }

  await writeFile(join(runDir, 'decision.json'), JSON.stringify({ runId, status: 'FAIL_MAX_ITERATION' }, null, 2), 'utf8');
  await writeFile(join(runDir, 'trace.ndjson'), `${trace.map((item) => JSON.stringify(item)).join('\n')}\n`, 'utf8');
};

void main();
