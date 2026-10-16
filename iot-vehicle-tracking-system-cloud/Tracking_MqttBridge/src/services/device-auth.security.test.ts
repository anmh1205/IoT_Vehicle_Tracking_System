import { createHash } from 'node:crypto';

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock('pg', () => ({ Pool: vi.fn().mockImplementation(() => ({ query: queryMock })) }));
vi.mock('../config/env', () => ({
  dbConfig: { host: '127.0.0.1', port: 5432, user: 'test', password: 'test', database: 'test' },
}));
vi.mock('../infrastructure/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { validateDevice } from '../infrastructure/database';
import { verifyDeviceToken } from './device-auth.service';

const digest = (token: string): string => createHash('sha256').update(token).digest('hex');
const rawSecret = 'device-raw-secret';
const storedVerifier = digest(rawSecret);
const device = { id: '1', device_id: 'DEV-1', vehicle_id: 'V1', current_status: 'online',
  last_seen_at: null, state_updated_at: null, payload_updated_at: null };

const fakePostgres = (active = true) => {
  queryMock.mockImplementation(async (sql: string, params: unknown[]) => {
    expect(sql).toContain("auth_token = encode(sha256($2::bytea), 'hex')");
    expect(sql).toContain('is_active = true');
    expect(sql).not.toContain('OR auth_token =');
    expect(params).toHaveLength(2);
    const accepted = active && params[0] === 'DEV-1' &&
      typeof params[1] === 'string' && digest(params[1]) === storedVerifier;
    return { rows: accepted ? [device] : [] };
  });
};

describe('MQTT device identity authenticates only using the original secret', () => {
  beforeEach(() => { vi.clearAllMocks(); fakePostgres(); });

  it.each([
    ['rawdata', validateDevice],
    ['status/events/firmware', verifyDeviceToken],
  ])('%s accepts raw secret but rejects the database hash as a credential', async (_channel, check) => {
    await expect(check('DEV-1', rawSecret)).resolves.toEqual(device);
    await expect(check('DEV-1', storedVerifier)).resolves.toBeNull();
    await expect(check('DEV-1', 'incorrect')).resolves.toBeNull();
    await expect(check('unknown', rawSecret)).resolves.toBeNull();
    expect(queryMock).toHaveBeenCalledTimes(4);
  });

  it('rejects inactive device despite a matching raw secret', async () => {
    fakePostgres(false);
    await expect(validateDevice('DEV-1', rawSecret)).resolves.toBeNull();
    await expect(verifyDeviceToken('DEV-1', rawSecret)).resolves.toBeNull();
  });

  it('preserves existing fail-closed database error contracts', async () => {
    queryMock.mockRejectedValue(new Error('database down'));
    await expect(validateDevice('DEV-1', rawSecret)).resolves.toBeNull();
    await expect(verifyDeviceToken('DEV-1', rawSecret)).rejects.toThrow('database down');
  });
});
