import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyProvisioning, buildRoleRules, validateApiUrl } from './provision-access.mjs';

test('per-device grants cannot publish another device telemetry, commands or internal events', () => {
  const rules = buildRoleRules({ role: 'device', deviceId: 'IVTS_A' });
  assert.ok(rules.some((r) => r.action === 'publish' && r.topic === 'v1/IVTS_A/rawdata'));
  assert.ok(rules.some((r) => r.action === 'subscribe' && r.topic === 'v1/IVTS_A/commands/#'));
  assert.ok(!rules.some((r) => r.topic.includes('/+/') || r.topic.includes('IVTS_B') ||
    r.topic.startsWith('internal/') || r.topic === 'v1/IVTS_A/commands/#' && r.action === 'publish'));
});
test('bridge grants only expected upstream ingress and internal publishing', () => {
  const rules = buildRoleRules({ role: 'bridge' });
  assert.ok(rules.some((r) => r.action === 'subscribe' && r.topic === 'v1/+/rawdata'));
  assert.ok(rules.some((r) => r.action === 'publish' && r.topic === 'internal/events/device/#'));
  assert.ok(!rules.some((r) => r.action === 'subscribe' && r.topic === '#'));
});
test('dashboard API refuses plaintext requests beyond local tunnel', () => {
  assert.throws(() => validateApiUrl('http://broker.example:18083/api/v5'), /HTTPS/);
  assert.equal(validateApiUrl('http://127.0.0.1:18083/api/v5'), 'http://127.0.0.1:18083/api/v5');
  assert.equal(validateApiUrl('https://broker.example/api/v5'), 'https://broker.example/api/v5');
});
test('existing permissive authorizer aborts before user ACL or credential mutation', async () => {
  const called = [];
  const responses = [
    { token: 'test-token' },
    [{ mechanism: 'password_based', backend: 'built_in_database', enable: true }],
    [{ type: 'file', enable: true }],
  ];
  const transport = async (url, options) => {
    called.push({ url, method: options.method });
    const payload = responses.shift();
    return { ok: true, status: 200, text: async () => JSON.stringify(payload) };
  };
  await assert.rejects(
    applyProvisioning({
      apiBase: 'http://127.0.0.1:18083/api/v5',
      role: 'device', deviceId: 'IVTS_A', username: 'device-test',
      password: 'a-long-nonproduction-password',
      adminUsername: 'admin', adminPassword: 'not-printed',
    }, transport),
    /authorization sources are enabled/,
  );
  assert.ok(!called.some((row) => row.url.includes('/rules/users')));
});
