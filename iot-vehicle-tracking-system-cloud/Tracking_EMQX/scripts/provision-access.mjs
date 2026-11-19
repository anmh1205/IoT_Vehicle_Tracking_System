/**
 * Explicit, idempotent EMQX 5.x MQTT identity/ACL provisioning.
 * Dry-run by default; --apply requires short-lived admin and account secrets
 * in environment variables. Nothing ever writes secrets to disk or stdout.
 */
import { pathToFileURL } from 'node:url';

const API_AUTHN_USERS = '/authentication/password_based%3Abuilt_in_database/users';
const API_AUTHZ_USERS = '/authorization/sources/built_in_database/rules/users';
const publish = (topic) => ({ action: 'publish', permission: 'allow', topic });
const subscribe = (topic) => ({ action: 'subscribe', permission: 'allow', topic, qos: [0, 1] });

export const buildRoleRules = ({ role, deviceId }) => {
  if (!['device', 'bridge', 'backend'].includes(role)) throw new Error('role must be device, bridge or backend');
  if (role === 'device') {
    if (!/^[A-Za-z0-9_-]{3,80}$/.test(deviceId || '')) throw new Error('device role requires a safe IVTS_MQTT_DEVICE_ID');
    return [
      'rawdata', 'status', 'events', 'firmware', 'commands/ack'
    ].map((name) => publish('v1/' + deviceId + '/' + name))
      .concat([subscribe('v1/' + deviceId + '/commands/#')]);
  }
  if (role === 'bridge') {
    return [
      ...['rawdata', 'status', 'events', 'firmware', 'commands/ack']
        .map((name) => subscribe('v1/+/' + name)),
      publish('v1/+/commands/#'),
      publish('internal/events/device/#'),
    ];
  }
  return [subscribe('internal/events/device/#'), publish('v1/+/commands/#')];
};

export const validateApiUrl = (value) => {
  const parsed = new URL(value);
  if (parsed.username || parsed.password) throw new Error('No admin secrets permitted in EMQX URL');
  if (parsed.protocol !== 'https:' && !(
    parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  )) throw new Error('EMQX dashboard API must use HTTPS (or localhost for a local tunnel)');
  if (parsed.pathname.replace(/\/$/, '') !== '/api/v5') {
    throw new Error('IVTS_EMQX_API_URL must end in /api/v5');
  }
  return parsed.toString().replace(/\/$/, '');
};

const unpack = (value) =>
  Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data :
    Array.isArray(value?.sources) ? value.sources : null;

export const applyProvisioning = async (settings, transport = fetch) => {
  const apiBase = validateApiUrl(settings.apiBase);
  const { username, password, role, deviceId, adminUsername, adminPassword } = settings;
  if (!username || !/^[A-Za-z0-9_.@-]{3,80}$/.test(username)) throw new Error('Safe IVTS_MQTT_USERNAME required');
  if (!password || password.length < 16) throw new Error('IVTS_MQTT_PASSWORD must have at least 16 characters');
  if (!adminUsername || !adminPassword) throw new Error('EMQX dashboard admin credentials required');
  const rules = buildRoleRules({ role, deviceId });
  const request = async (path, token, method = 'GET', body, optional404 = false) => {
    const response = await transport(apiBase + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(12000),
    });
    if (optional404 && response.status === 404) return null;
    const content = await response.text();
    if (!response.ok) throw new Error('EMQX ' + method + ' ' + path + ' failed status=' + response.status);
    return content ? JSON.parse(content) : undefined;
  };

  const login = await request('/login', null, 'POST', { username: adminUsername, password: adminPassword });
  if (!login?.token) throw new Error('Dashboard login did not provide an EMQX API token');
  const token = login.token;
  const authentication = unpack(await request('/authentication', token));
  if (!authentication) throw new Error('Unrecognized authentication source list; refusing changes');
  const nonBuiltinAuthn = authentication.filter((item) =>
    item.enable !== false && (item.mechanism !== 'password_based' || item.backend !== 'built_in_database'));
  if (nonBuiltinAuthn.length) {
    throw new Error('Other authenticators are active; audit their policy and disable before provisioning');
  }
  if (!authentication.some((item) => item.mechanism === 'password_based' &&
      item.backend === 'built_in_database' && item.enable !== false)) {
    await request('/authentication', token, 'POST', {
      mechanism: 'password_based',
      backend: 'built_in_database',
      user_id_type: 'username',
      password_hash_algorithm: { name: 'sha256', salt_position: 'suffix' },
      enable: true,
    });
  }

  const sources = unpack(await request('/authorization/sources', token));
  if (!sources) throw new Error('Unrecognized authorization source list; refusing changes');
  if (sources.some((entry) => entry.enable !== false && entry.type !== 'built_in_database')) {
    throw new Error('Other authorization sources are enabled; remove permissive file/HTTP sources first');
  }
  if (!sources.some((entry) => entry.type === 'built_in_database' && entry.enable !== false)) {
    await request('/authorization/sources', token, 'POST', {
      type: 'built_in_database',
      enable: true,
      max_rules: 100,
    });
  }
  // Reject by default, including unknown identity/topic; no permissive fallback.
  await request('/authorization/settings', token, 'PUT', {
    no_match: 'deny', deny_action: 'ignore', cache: { enable: false },
  });

  const existing = await request(API_AUTHN_USERS + '/' + encodeURIComponent(username), token, 'GET', undefined, true);
  if (!existing) {
    await request(API_AUTHN_USERS, token, 'POST', {
      user_id: username, password, is_superuser: false,
    });
  } else if (existing.is_superuser !== false) {
    throw new Error('Existing MQTT user has superuser privileges; refusing to retain broad access');
  }

  const rulePath = API_AUTHZ_USERS + '/' + encodeURIComponent(username);
  const previousRules = await request(rulePath, token, 'GET', undefined, true);
  if (!previousRules) {
    await request(API_AUTHZ_USERS, token, 'POST', [{ username, rules }]);
  } else {
    await request(rulePath, token, 'PUT', { username, rules });
  }
  return { role, username, deviceId: role === 'device' ? deviceId : undefined, rules: rules.length,
    credentialsCreated: !existing, status: 'applied' };
};

export const main = async (args = process.argv.slice(2), env = process.env) => {
  const settings = {
    apiBase: env.IVTS_EMQX_API_URL || 'http://127.0.0.1:18083/api/v5',
    role: env.IVTS_MQTT_ROLE,
    deviceId: env.IVTS_MQTT_DEVICE_ID,
    username: env.IVTS_MQTT_USERNAME,
    password: env.IVTS_MQTT_PASSWORD,
    adminUsername: env.IVTS_EMQX_ADMIN_USERNAME || 'admin',
    adminPassword: env.IVTS_EMQX_ADMIN_PASSWORD,
  };
  const rules = buildRoleRules(settings);
  if (!args.includes('--apply')) {
    // Do not include credential values in preview output.
    console.log(JSON.stringify({ mode: 'dry-run', role: settings.role,
      username: settings.username, deviceId: settings.deviceId, rules }, null, 2));
    return;
  }
  const result = await applyProvisioning(settings);
  console.log(JSON.stringify(result));
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('EMQX provisioning refused: ' + error.message);
    process.exitCode = 1;
  });
}
