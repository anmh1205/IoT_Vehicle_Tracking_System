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
import { startSimulation } from './simulator.service';

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
});
