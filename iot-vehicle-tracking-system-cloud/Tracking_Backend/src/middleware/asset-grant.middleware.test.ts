import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '@/shared/types/common.types';

vi.mock('@/domain/asset/repositories/asset-grant.repository', () => ({
  hasAssetGrant: vi.fn(),
}));
import { hasAssetGrant } from '@/domain/asset/repositories/asset-grant.repository';
import { requireAssignedAssetWrite, requireAssignedVehicleRoute } from './asset-grant.middleware';

const runGuard = async (
  policy: Parameters<typeof requireAssignedAssetWrite>[0],
  role: 'root'|'admin'|'manager'|'operator'|'viewer',
  mode: 'all'|'assigned',
  id?: string,
  body?: Record<string, unknown>,
) => {
  const next = vi.fn() as NextFunction;
  const req = {
    user: { id: 101, role, deviceAccessMode: mode },
    params: id ? { id } : {},
    body,
  } as unknown as AuthenticatedRequest;
  await requireAssignedAssetWrite(policy)(req, {} as Response, next);
  return next;
};

describe('asset mutation barrier for assigned roles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasAssetGrant).mockResolvedValue(true);
  });

  it('allows authorized vehicle update only after checking current grant', async () => {
    const next = await runGuard({ existing: 'vehicleRow', forbidDeviceReassignment: true }, 'manager', 'assigned', '7', { notes: 'safe' });
    expect(hasAssetGrant).toHaveBeenCalledWith(101, 'vehicleRow', 7);
    expect(next).toHaveBeenCalledWith();
  });

  it('fails closed on ID guesses, revoked grants and reassignments', async () => {
    vi.mocked(hasAssetGrant).mockResolvedValue(false);
    const denied = await runGuard({ existing: 'vehicleRow' }, 'manager', 'assigned', '1003');
    expect(denied.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
    const reassignment = await runGuard(
      { existing: 'vehicleRow', forbidDeviceReassignment: true }, 'operator',
      'assigned', '7', { deviceId: 'D2' },
    );
    expect(reassignment.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
    const missing = await runGuard({ existing: 'tripRow' }, 'operator', 'assigned', 'bad-id');
    expect(missing.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
  });

  it('checks both existing and replacement trip references', async () => {
    vi.mocked(hasAssetGrant).mockImplementation(async (_, kind, value) => kind !== 'deviceId' || value !== 'D2');
    const denied = await runGuard({ existing: 'tripRow' }, 'manager', 'assigned', '12',
      { vehicleId:'V1', deviceId:'D2' });
    expect(hasAssetGrant).toHaveBeenCalledWith(101, 'tripRow', 12);
    expect(hasAssetGrant).toHaveBeenCalledWith(101, 'vehicleId', 'V1');
    expect(hasAssetGrant).toHaveBeenCalledWith(101, 'deviceId', 'D2');
    expect(denied.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
  });

  it('requires an asset reference for new assigned-manager trip/maintenance records', async () => {
    const denied = await runGuard({ requireBodyReference: true }, 'manager', 'assigned', undefined, { title:'unsafe' });
    expect(denied.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
    expect(hasAssetGrant).not.toHaveBeenCalled();
  });

  it('permits root/admin and explicit fleet-wide access without grant lookups', async () => {
    for (const role of ['root', 'admin'] as const) {
      expect(await runGuard({ existing:'tripRow' }, role, 'assigned', '50')).toHaveBeenCalledWith();
    }
    expect(await runGuard({ existing:'tripRow' }, 'manager', 'all', '50')).toHaveBeenCalledWith();
    expect(hasAssetGrant).not.toHaveBeenCalled();
  });
});

describe('vehicle-id based geofence and location preview routes', () => {
  const check = async (role: string, mode: string, vehicleId: string | undefined) => {
    const next = vi.fn() as NextFunction;
    const req = { user: { id: 101, role, deviceAccessMode: mode },
      params: vehicleId === undefined ? {} : { vehicleId } } as unknown as AuthenticatedRequest;
    await requireAssignedVehicleRoute(req, {} as Response, next);
    return next;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasAssetGrant).mockResolvedValue(true);
  });

  it('allows assigned vehicle preview only after checking its live grant', async () => {
    const next = await check('viewer', 'assigned', 'V1');
    expect(hasAssetGrant).toHaveBeenCalledWith(101, 'vehicleId', 'V1');
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects another fleet vehicle and absent route identity', async () => {
    vi.mocked(hasAssetGrant).mockResolvedValue(false);
    const foreign = await check('manager', 'assigned', 'V2');
    expect(foreign.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
    const missing = await check('viewer', 'assigned', undefined);
    expect(missing.mock.calls[0]?.[0]).toMatchObject({ status: 403 });
  });

  it('retains global admin and explicit fleet-wide view behavior', async () => {
    expect(await check('admin', 'assigned', 'V1')).toHaveBeenCalledWith();
    expect(await check('operator', 'all', 'V2')).toHaveBeenCalledWith();
    expect(hasAssetGrant).not.toHaveBeenCalled();
  });
});
