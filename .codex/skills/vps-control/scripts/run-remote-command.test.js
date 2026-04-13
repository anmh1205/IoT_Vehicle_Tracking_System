#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArgs, resolveExecutionPlan, printablePlan, nullDeviceFor, normalizeKeyPath } = require('./ssh-plan');

test('parseArgs handles --cmd and flags', () => {
  const parsed = parseArgs(['--host', '1.2.3.4', '--user', 'root', '--cmd', 'uptime', '--dry-run']);
  assert.equal(parsed.host, '1.2.3.4');
  assert.equal(parsed.user, 'root');
  assert.equal(parsed.cmd, 'uptime');
  assert.equal(parsed.dryRun, true);
});

test('parseArgs supports --cmd=<value> form', () => {
  const parsed = parseArgs(['--cmd=echo --version']);
  assert.equal(parsed.cmd, 'echo --version');
});

test('parseArgs supports --host=<value> and --user=<value> forms', () => {
  const parsed = parseArgs(['--host=1.2.3.4', '--user=root', '--cmd=uptime']);
  assert.equal(parsed.host, '1.2.3.4');
  assert.equal(parsed.user, 'root');
  assert.equal(parsed.cmd, 'uptime');
});

test('parseArgs collects positional command', () => {
  const parsed = parseArgs(['echo', 'hello', 'world']);
  assert.deepEqual(parsed.positionals, ['echo', 'hello', 'world']);
});

test('parseArgs rejects inline password', () => {
  assert.throws(() => parseArgs(['--password', 'x']), /Inline --password is disabled/);
});

test('resolveExecutionPlan prefers key auth when key exists', () => {
  const plan = resolveExecutionPlan(
    { cmd: 'whoami', positionals: [] },
    { env: { VPS_HOST: 'host', VPS_USER: 'root', VPS_KEY_PATH: __filename, VPS_PASSWORD: 'pw' }, loadedFiles: [] },
    { platform: 'linux', processEnv: {} }
  );

  assert.equal(plan.mode, 'key');
  assert.equal(plan.command, 'ssh');
  assert.ok(plan.args.includes('-i'));
  assert.equal(plan.strictHostKeyChecking, true);
});

test('resolveExecutionPlan blocks password fallback by default', () => {
  assert.throws(
    () =>
      resolveExecutionPlan(
        { cmd: 'whoami', positionals: [] },
        {
          env: {
            VPS_HOST: 'host',
            VPS_USER: 'root',
            VPS_PASSWORD: 'pw-1234',
            VPS_FORCE_KEY_AUTH: 'false',
          },
          loadedFiles: [],
        },
        { platform: 'linux', processEnv: { PATH: '/usr/bin' } }
      ),
    /password fallback is disabled/
  );
});

test('resolveExecutionPlan allows password fallback when explicitly enabled', () => {
  const plan = resolveExecutionPlan(
    { cmd: 'whoami', positionals: [] },
    {
      env: {
        VPS_HOST: 'host',
        VPS_USER: 'root',
        VPS_PASSWORD: 'pw-1234',
        VPS_ALLOW_PASSWORD_FALLBACK: 'true',
        VPS_FORCE_KEY_AUTH: 'false',
      },
      loadedFiles: [],
    },
    { platform: 'linux', processEnv: { PATH: '/usr/bin' } }
  );

  assert.equal(plan.mode, 'password');
  assert.equal(plan.command, 'sshpass');
  assert.equal(plan.args[0], '-e');
  assert.equal(plan.spawnEnv.SSHPASS, 'pw-1234');
});

test('resolveExecutionPlan applies insecure host options with platform null device', () => {
  const plan = resolveExecutionPlan(
    { cmd: 'uptime', positionals: [], insecure: true },
    { env: { VPS_HOST: 'h', VPS_USER: 'u', VPS_FORCE_KEY_AUTH: 'false' }, loadedFiles: [] },
    { platform: 'win32', processEnv: {} }
  );

  assert.equal(plan.strictHostKeyChecking, false);
  assert.ok(plan.args.includes('StrictHostKeyChecking=no'));
  assert.ok(plan.args.includes(`UserKnownHostsFile=${nullDeviceFor('win32')}`));
});

test('printablePlan masks SSHPASS in payload', () => {
  const view = printablePlan({
    mode: 'password',
    command: 'sshpass',
    args: ['-e', 'ssh', 'root@host', 'uptime'],
    timeoutMs: 1000,
    strictHostKeyChecking: true,
    loadedFiles: [],
  });

  assert.equal(view.spawnEnv.SSHPASS, '[REDACTED]');
});

test('parseInteger strict mode rejects mixed characters via planning fallback', () => {
  const plan = resolveExecutionPlan(
    { cmd: 'uptime', port: '22abc', timeoutMs: '45000ms', positionals: [] },
    { env: { VPS_HOST: 'h', VPS_USER: 'u', VPS_KEY_PATH: __filename }, loadedFiles: [] },
    { platform: 'linux', processEnv: {} }
  );

  assert.ok(plan.args.includes('22'));
  assert.ok(plan.args.includes('ConnectTimeout=45'));
});

test('normalizeKeyPath converts /e/... to E:\\... on win32', () => {
  const normalized = normalizeKeyPath('/e/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/vps-control/keys/id_ed25519_vps_control', {
    platform: 'win32',
    cwd: 'E:\\anmh1205\\IoT_Vehicle_Tracking_System',
    home: 'C:\\Users\\Admin',
  });

  assert.equal(
    normalized,
    'E:\\anmh1205\\IoT_Vehicle_Tracking_System\\.claude\\skills\\vps-control\\keys\\id_ed25519_vps_control'
  );
});
