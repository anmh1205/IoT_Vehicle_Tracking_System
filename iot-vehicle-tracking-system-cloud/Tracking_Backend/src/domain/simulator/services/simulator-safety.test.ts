import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SimulatorStartInput } from '@/domain/simulator/types/simulator.types';

vi.mock('@/infrastructure/database/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('@/infrastructure/logger', () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock('@/infrastructure/realtime', () => ({ publishEvent: vi.fn() }));
vi.mock('@/config/env', () => ({
  appConfig: { nodeEnv: 'development', isProduction: false },
  dbConfig: { database: 'ivts_simulator_local' },
  mqttConfig: { host: 'isolated-broker.local' },
}));

import { pool } from '@/infrastructure/database/pool';
import { appConfig } from '@/config/env';
import { publishEvent } from '@/infrastructure/realtime';
import { startSimulation, clearRetainedSimulatorStatus, resolveSimulatorDeviceToken } from './simulator.service';
import { hashToken } from '@/shared/utils/crypto.util';

const input: SimulatorStartInput = {
  deviceIds: ['SIM-TEST-01'], intervalSec: 5, durationMin: 1,
  speedMin: 0, speedMax: 30,
  imuAccelDeltaMinMps2: 0, imuAccelDeltaMaxMps2: 3,
  batteryMin: 30, batteryMax: 100,
  lat: 10.7, lon: 106.7,
};
const db = vi.mocked(pool.query);

describe('simulator production safety boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(appConfig, { isProduction: false, nodeEnv: 'development' });
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', '');
    vi.stubEnv('SIMULATOR_ISOLATED_DATABASE', '');
    vi.stubEnv('SIMULATOR_ISOLATED_BROKER_HOST', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('deletes retained simulator status without sending the original hashed device credential', async () => {
    const publish = vi.fn((topic: string, payload: string,
      options: { qos: number; retain?: boolean },
      callback: (error?: Error | null) => void) => callback(null));
    await clearRetainedSimulatorStatus({ publish } as never, 'SIM-TEST-01');
    expect(publish).toHaveBeenCalledWith(
      'v1/SIM-TEST-01/status', '', { qos: 1, retain: true }, expect.any(Function),
    );
    expect(publish.mock.calls[0][1]).toBe('');
  });

  it('denies by default before any device lookup or credential write', async () => {
    await expect(startSimulation(input, 1)).rejects.toMatchObject({ status: 403 });
    expect(db).not.toHaveBeenCalled();
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('denies production even if unsafe test environment variables are set', async () => {
    Object.assign(appConfig, { isProduction: true, nodeEnv: 'production' });
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', 'true');
    vi.stubEnv('SIMULATOR_ISOLATED_DATABASE', 'ivts_simulator_local');
    vi.stubEnv('SIMULATOR_ISOLATED_BROKER_HOST', 'isolated-broker.local');
    await expect(startSimulation(input, 1)).rejects.toMatchObject({ status: 403 });
    expect(db).not.toHaveBeenCalled();
  });

  it('denies isolated toggle if database or MQTT broker is not explicitly matched', async () => {
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', 'true');
    vi.stubEnv('SIMULATOR_ISOLATED_DATABASE', 'ivts_simulator_local');
    await expect(startSimulation(input, 1)).rejects.toMatchObject({ status: 403 });
    expect(db).not.toHaveBeenCalled();
  });

  it('rejects real device identity even in explicitly configured test environment', async () => {
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', 'true');
    vi.stubEnv('SIMULATOR_ISOLATED_DATABASE', 'ivts_simulator_local');
    vi.stubEnv('SIMULATOR_ISOLATED_BROKER_HOST', 'isolated-broker.local');
    await expect(startSimulation({ ...input, deviceIds: ['TRACKER_001'] }, 1))
      .rejects.toMatchObject({ status: 403 });
    expect(db).not.toHaveBeenCalled();
  });

  it('allows lookup only for dedicated SIM- identities in a test environment', async () => {
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', 'true');
    vi.stubEnv('SIMULATOR_ISOLATED_DATABASE', 'ivts_simulator_local');
    vi.stubEnv('SIMULATOR_ISOLATED_BROKER_HOST', 'isolated-broker.local');
    db.mockResolvedValueOnce({ rows: [] } as never);
    await expect(startSimulation(input, 1)).rejects.toMatchObject({ status: 400 });
    expect(db).toHaveBeenCalledOnce();
    expect(String(db.mock.calls[0][0])).toContain('SELECT device_id, auth_token');
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('rejects active sessions without changing credentials or closing session rows', async () => {
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', 'true');
    vi.stubEnv('SIMULATOR_ISOLATED_DATABASE', 'ivts_simulator_local');
    vi.stubEnv('SIMULATOR_ISOLATED_BROKER_HOST', 'isolated-broker.local');

    db.mockResolvedValueOnce({
      rows: [{
        device_id: 'SIM-TEST-01',
        auth_token: 'existing-hash',
        latitude: null,
        longitude: null,
      }],
    } as never);
    db.mockResolvedValueOnce({ rows: [{ id: 777 }] } as never);

    await expect(startSimulation(input, 1)).rejects.toMatchObject({ status: 400 });
    expect(db).toHaveBeenCalledTimes(2);
    expect(db.mock.calls.some(([sql]) => /UPDATE\s+(devices|device_sessions)/i.test(String(sql))))
      .toBe(false);
    expect(publishEvent).not.toHaveBeenCalled();
  });

  it('accepts only pre-provisioned SIM test credentials matching the database hash', () => {
    const token = 'isolated-device-token-01';
    vi.stubEnv('SIMULATOR_DEVICE_TOKENS_JSON', JSON.stringify({ 'SIM-TEST-01': token }));
    expect(resolveSimulatorDeviceToken('SIM-TEST-01', hashToken(token))).toBe(token);
    expect(() => resolveSimulatorDeviceToken('SIM-TEST-01', hashToken('different-token')))
      .toThrow(/credentials do not match/i);
    expect(() => resolveSimulatorDeviceToken('SIM-OTHER', hashToken(token)))
      .toThrow(/credentials do not match/i);
  });

  it('rejects malformed or missing simulator credential configuration', () => {
    expect(() => resolveSimulatorDeviceToken('SIM-TEST-01', hashToken('secret')))
      .toThrow(/pre-provisioned/i);
    vi.stubEnv('SIMULATOR_DEVICE_TOKENS_JSON', '{bad-json');
    expect(() => resolveSimulatorDeviceToken('SIM-TEST-01', hashToken('secret')))
      .toThrow(/Invalid simulator device credential/i);
    vi.stubEnv('SIMULATOR_DEVICE_TOKENS_JSON', '[]');
    expect(() => resolveSimulatorDeviceToken('SIM-TEST-01', hashToken('secret')))
      .toThrow(/Invalid simulator device credential/i);
  });

  it('denies simulator start without pre-provisioned token before any credential updates', async () => {
    vi.stubEnv('SIMULATOR_ISOLATED_TEST_MODE', 'true');
    vi.stubEnv('SIMULATOR_ISOLATED_DATABASE', 'ivts_simulator_local');
    vi.stubEnv('SIMULATOR_ISOLATED_BROKER_HOST', 'isolated-broker.local');
    db.mockResolvedValueOnce({ rows: [{
      device_id: 'SIM-TEST-01', auth_token: hashToken('original-secret'),
      latitude: null, longitude: null,
    }] } as never);
    db.mockResolvedValueOnce({ rows: [] } as never);
    await expect(startSimulation(input, 1)).rejects.toMatchObject({ status: 403 });
    expect(db.mock.calls.some(([sql]) => /UPDATE\s+devices/i.test(String(sql)))).toBe(false);
  });

});
