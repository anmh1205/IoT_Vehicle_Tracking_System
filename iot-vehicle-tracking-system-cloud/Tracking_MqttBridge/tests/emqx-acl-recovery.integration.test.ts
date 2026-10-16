import assert from 'node:assert/strict';
import { test } from 'node:test';
import mqtt, { type MqttClient } from 'mqtt';
import { DEVICE_TOPICS } from '../src/constants/topics';
import { trackDeviceSubscriptions } from '../src/mqtt/subscriptions';

const integration = process.env.IVTS_EMQX_INTEGRATION === '1' ? test : test.skip;
const apiBase = 'http://127.0.0.1:18083/api/v5';

async function callApi(
  path: string,
  token: string | null,
  method = 'GET',
  data?: unknown,
): Promise<unknown> {
  const response = await fetch(apiBase + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = await response.text();
  assert.ok(response.ok, `EMQX API ${method} ${path}: ${response.status} ${body.slice(0, 350)}`);
  return body ? JSON.parse(body) as unknown : undefined;
}

function permissionRules(denyEvents: boolean) {
  return Object.values(DEVICE_TOPICS).map((topic) => ({
    action: 'subscribe',
    permission: denyEvents && topic === DEVICE_TOPICS.EVENTS ? 'deny' : 'allow',
    topic,
    qos: [0, 1],
  }));
}

function waitForConnection(client: MqttClient) {
  return new Promise<void>((resolve, reject) => {
    client.once('connect', () => resolve());
    client.once('error', reject);
  });
}

function end(client: MqttClient | null): Promise<void> {
  return new Promise((resolve) => {
    if (!client) return resolve();
    client.end(true, {}, resolve);
  });
}

integration('EMQX ACL denial degrades subscriptions, then reconnect with restored grants recovers', {
  timeout: 50_000,
}, async () => {
  const adminPassword = process.env.IVTS_EMQX_TEST_ADMIN_PASSWORD;
  assert.ok(adminPassword, 'Only isolated CI broker is permitted for ACL modifications');
  const login = await callApi('/login', null, 'POST', {
    username: 'admin',
    password: adminPassword,
  }) as { token: string };
  assert.ok(login.token);
  const token = login.token;

  // Only this disposable broker is used. Remove the default permissive file
  // authorizer so a later source cannot short-circuit the client-specific ACL.
  const sources = await callApi('/authorization/sources', token) as Array<{ type: string }>;
  for (const source of sources) {
    if (source.type !== 'built_in_database') {
      await callApi(`/authorization/sources/${encodeURIComponent(source.type)}`, token, 'DELETE');
    }
  }
  if (!sources.some((source) => source.type === 'built_in_database')) {
    await callApi('/authorization/sources', token, 'POST', {
      type: 'built_in_database',
      enable: true,
      max_rules: 100,
    });
  }
  await callApi('/authorization/settings', token, 'PUT', {
    no_match: 'deny',
    deny_action: 'ignore',
    cache: { enable: false },
  });

  const clientId = `ivts-ci-acl-${process.env.GITHUB_RUN_ID ?? process.pid}`;
  const rulesPath = '/authorization/sources/built_in_database/rules/clients';
  await callApi(rulesPath, token, 'POST', [{
    clientid: clientId,
    rules: permissionRules(true),
  }]);

  let client: MqttClient | null = null;
  try {
    client = mqtt.connect('mqtt://127.0.0.1:1883', {
      clientId, clean: false, reconnectPeriod: 0, connectTimeout: 10_000,
    });
    const errors: Error[] = [];
    const ready: boolean[] = [];
    let resolveRecovered!: () => void;
    const recovered = new Promise<void>((resolve) => { resolveRecovered = resolve; });
    client.on('error', (error) => errors.push(error));
    const started = trackDeviceSubscriptions(client, (state, error) => {
      ready.push(state);
      if (error) errors.push(error);
      if (state) resolveRecovered();
    });
    await waitForConnection(client);
    await assert.rejects(started, /subscribe|granted|denied/i);
    assert.equal(ready.at(-1), false);
    assert.ok(errors.length > 0, 'Denied SUBACK must be surfaced in health error');

    await callApi(`${rulesPath}/${encodeURIComponent(clientId)}`, token, 'PUT', {
      clientid: clientId,
      rules: permissionRules(false),
    });

    // Revalidate grants on a NEW broker connection, not on a local mock
    // or by merely assuming the authorization configuration has changed.
    client.reconnect();
    await Promise.race([
      recovered,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('No healthy subscriptions after ACL recovery')), 15_000)),
    ]);
    assert.equal(ready.at(-1), true);
  } finally {
    await end(client);
    await callApi(`${rulesPath}/${encodeURIComponent(clientId)}`, token, 'DELETE');
  }
});
