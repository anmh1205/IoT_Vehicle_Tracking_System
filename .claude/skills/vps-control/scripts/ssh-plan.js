#!/usr/bin/env node
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function parseBoolean(input, fallback = false) {
  if (input === undefined || input === null || input === '') return fallback;
  const value = String(input).toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  return fallback;
}

function parseInteger(input, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const text = String(input ?? '').trim();
  if (!/^\d+$/.test(text)) return fallback;
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    insecure: false,
    positionals: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--') {
      options.positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--insecure') {
      options.insecure = true;
      continue;
    }

    if (arg.startsWith('--')) {
      const inlineEqIndex = arg.indexOf('=');
      const hasInlineValue = inlineEqIndex !== -1;
      const key = hasInlineValue ? arg.slice(2, inlineEqIndex) : arg.slice(2);
      const inlineValue = hasInlineValue ? arg.slice(inlineEqIndex + 1) : undefined;

      if (key === 'password') {
        throw new Error('Inline --password is disabled. Use VPS_PASSWORD from local .env');
      }

      const next = argv[i + 1];
      const value = hasInlineValue ? inlineValue : next;

      switch (key) {
        case 'host':
          if (value === undefined) throw new Error('Missing value for --host');
          options.host = value;
          if (!hasInlineValue) i += 1;
          continue;
        case 'user':
          if (value === undefined) throw new Error('Missing value for --user');
          options.user = value;
          if (!hasInlineValue) i += 1;
          continue;
        case 'port':
          if (value === undefined) throw new Error('Missing value for --port');
          options.port = value;
          if (!hasInlineValue) i += 1;
          continue;
        case 'key-path':
          if (value === undefined) throw new Error('Missing value for --key-path');
          options.keyPath = value;
          if (!hasInlineValue) i += 1;
          continue;
        case 'timeout-ms':
          if (value === undefined) throw new Error('Missing value for --timeout-ms');
          options.timeoutMs = value;
          if (!hasInlineValue) i += 1;
          continue;
        case 'strict-host-key-checking':
          if (value === undefined) throw new Error('Missing value for --strict-host-key-checking');
          options.strictHostKeyChecking = value;
          if (!hasInlineValue) i += 1;
          continue;
        case 'cmd':
          if (value === undefined) throw new Error('Missing value for --cmd');
          options.cmd = value;
          if (!hasInlineValue) i += 1;
          continue;
        default:
          throw new Error(`Unknown argument: --${key}`);
      }
    }

    options.positionals.push(arg);
  }

  return options;
}

function nullDeviceFor(platform) {
  return platform === 'win32' ? 'NUL' : '/dev/null';
}

function normalizeKeyPath(input, { platform = process.platform, cwd = process.cwd(), home = os.homedir() } = {}) {
  const raw = String(input ?? '').trim();
  if (!raw) return '';

  let keyPath = raw;
  if (keyPath === '~') {
    keyPath = home;
  } else if (keyPath.startsWith('~/') || keyPath.startsWith('~\\')) {
    keyPath = path.join(home, keyPath.slice(2));
  }

  const posixDriveMatch = keyPath.match(/^\/([a-zA-Z])\/(.+)$/);
  if (platform === 'win32' && posixDriveMatch) {
    const drive = posixDriveMatch[1].toUpperCase();
    const rest = posixDriveMatch[2].replace(/\//g, path.sep);
    keyPath = `${drive}:${path.sep}${rest}`;
  }

  if (!path.isAbsolute(keyPath)) {
    keyPath = path.resolve(cwd, keyPath);
  }

  return keyPath;
}

function resolveExecutionPlan(
  cliOptions,
  runtimeEnv,
  { platform = process.platform, processEnv = process.env, cwd = process.cwd(), home = os.homedir() } = {}
) {
  const env = runtimeEnv.env;
  const host = cliOptions.host || env.VPS_HOST;
  const user = cliOptions.user || env.VPS_USER;
  const port = parseInteger(cliOptions.port || env.VPS_PORT, 22, { min: 1, max: 65535 });
  const keyPath = normalizeKeyPath(cliOptions.keyPath || env.VPS_KEY_PATH, { platform, cwd, home });
  const password = env.VPS_PASSWORD;
  const allowPasswordFallback = parseBoolean(env.VPS_ALLOW_PASSWORD_FALLBACK, false);
  const forceKeyAuth = parseBoolean(env.VPS_FORCE_KEY_AUTH, true);
  const timeoutMs = parseInteger(cliOptions.timeoutMs || env.VPS_TIMEOUT_MS, 45000, { min: 1000, max: 300000 });
  const strictDefault = true;
  const strictHostKeyChecking = cliOptions.insecure
    ? false
    : cliOptions.strictHostKeyChecking !== undefined
      ? parseBoolean(cliOptions.strictHostKeyChecking, strictDefault)
      : parseBoolean(env.VPS_STRICT_HOST_KEY_CHECKING, strictDefault);

  const cmd = cliOptions.cmd || cliOptions.positionals.join(' ').trim();

  if (!host) throw new Error('Missing VPS_HOST. Provide --host or set VPS_HOST in .env');
  if (!user) throw new Error('Missing VPS_USER. Provide --user or set VPS_USER in .env');
  if (!cmd) throw new Error('Missing command. Use --cmd "<command>" or pass command as positional args');

  if (forceKeyAuth && !keyPath && !allowPasswordFallback) {
    throw new Error('Missing VPS_KEY_PATH. Key auth is required by VPS_FORCE_KEY_AUTH=true');
  }

  if (keyPath && !fs.existsSync(keyPath)) {
    throw new Error(`VPS_KEY_PATH does not exist: ${keyPath}`);
  }

  const sshArgs = ['-p', String(port)];
  if (keyPath) {
    sshArgs.push('-i', keyPath);
    sshArgs.push(
      '-o', 'PreferredAuthentications=publickey',
      '-o', 'PubkeyAuthentication=yes',
      '-o', 'PasswordAuthentication=no',
      '-o', 'KbdInteractiveAuthentication=no',
      '-o', 'IdentitiesOnly=yes',
      '-o', 'BatchMode=yes'
    );
  }

  if (!strictHostKeyChecking) {
    sshArgs.push('-o', 'StrictHostKeyChecking=no', '-o', `UserKnownHostsFile=${nullDeviceFor(platform)}`);
  }

  sshArgs.push('-o', `ConnectTimeout=${Math.max(1, Math.floor(timeoutMs / 1000))}`);
  sshArgs.push(`${user}@${host}`);
  sshArgs.push(cmd);

  if (!keyPath && password) {
    if (!allowPasswordFallback) {
      throw new Error('VPS_KEY_PATH is missing and password fallback is disabled. Set VPS_ALLOW_PASSWORD_FALLBACK=true to allow password mode.');
    }

    return {
      mode: 'password',
      command: 'sshpass',
      args: ['-e', 'ssh', ...sshArgs],
      spawnEnv: { ...processEnv, SSHPASS: password },
      timeoutMs,
      password,
      strictHostKeyChecking,
      loadedFiles: runtimeEnv.loadedFiles,
    };
  }

  return {
    mode: 'key',
    command: 'ssh',
    args: sshArgs,
    spawnEnv: processEnv,
    timeoutMs,
    password: undefined,
    strictHostKeyChecking,
    loadedFiles: runtimeEnv.loadedFiles,
  };
}

function printablePlan(plan) {
  const payload = {
    mode: plan.mode,
    command: plan.command,
    args: [...plan.args],
    timeoutMs: plan.timeoutMs,
    strictHostKeyChecking: plan.strictHostKeyChecking,
    loadedFiles: plan.loadedFiles,
  };

  if (plan.mode === 'password' && payload.args[0] === '-e') {
    payload.spawnEnv = { SSHPASS: '[REDACTED]' };
  }

  return payload;
}

module.exports = {
  parseBoolean,
  parseInteger,
  parseArgs,
  nullDeviceFor,
  normalizeKeyPath,
  resolveExecutionPlan,
  printablePlan,
};
