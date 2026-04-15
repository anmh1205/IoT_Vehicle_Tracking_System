#!/usr/bin/env node
const { spawn, spawnSync } = require('node:child_process');
const { buildRuntimeEnv } = require('./env-loader');
const { createRedactor } = require('./redact');
const { parseArgs, resolveExecutionPlan, printablePlan } = require('./ssh-plan');

function hasBinary(binary) {
  const probe = spawnSync(binary, ['-V'], { stdio: 'ignore' });
  if (probe.error && probe.error.code === 'ENOENT') return false;
  return true;
}

async function runPlan(plan, redactor) {
  return new Promise((resolve) => {
    const child = spawn(plan.command, plan.args, {
      shell: false,
      env: plan.spawnEnv,
      timeout: plan.timeoutMs,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      resolve({ code: 1, signal: null, error, stdout, stderr });
    });

    child.on('close', (code, signal) => {
      resolve({ code: code ?? 1, signal, stdout, stderr });
    });
  }).then((result) => {
    const safeStdout = redactor.redact(result.stdout || '');
    const safeStderr = redactor.redact(result.stderr || '');

    if (safeStdout) process.stdout.write(safeStdout);
    if (safeStderr) process.stderr.write(safeStderr);

    if (result.error && result.error.code === 'ENOENT') {
      process.stderr.write(`Binary not found: ${plan.command}\n`);
    }

    if (result.signal) {
      process.stderr.write(`Command terminated by signal: ${result.signal}\n`);
    }

    return result.code;
  });
}

async function main() {
  try {
    const cliOptions = parseArgs(process.argv.slice(2));
    const runtimeEnv = buildRuntimeEnv();
    const redactor = createRedactor(runtimeEnv.env);
    const plan = resolveExecutionPlan(cliOptions, runtimeEnv);

    if (cliOptions.dryRun) {
      const safePayload = JSON.parse(redactor.redact(JSON.stringify(printablePlan(plan))));
      process.stdout.write(`${JSON.stringify(safePayload, null, 2)}\n`);
      process.exit(0);
    }

    if (!hasBinary('ssh')) {
      process.stderr.write('Missing ssh binary in local system.\n');
      process.exit(1);
    }

    if (plan.mode === 'password') {
      if (process.platform === 'win32') {
        process.stderr.write('Password mode is not supported on Windows. Use VPS_KEY_PATH.\n');
        process.exit(1);
      }
      if (!hasBinary('sshpass')) {
        process.stderr.write('Password mode requires sshpass. Install sshpass or provide VPS_KEY_PATH.\n');
        process.exit(1);
      }
    }

    const code = await runPlan(plan, redactor);
    process.exit(code);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  void main();
}

module.exports = {
  hasBinary,
  runPlan,
};
