import type { Router } from 'express';

import vehicle from './vehicle.routes';
import trip from './trip.routes';
import maintenance from './maintenance.routes';
import driver from './driver.routes';
import customer from './customer.routes';
import geofence from './geofence.routes';
import zones from './zones.routes';

type Handler = (req: unknown, res: unknown, next: (error?: Error) => void) => void;
type Route = { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Handler }> };
type RouterLayer = { route?: Route };

const routes = [
  [vehicle, 'post', '/import', 'admin'],
  [vehicle, 'post', '/', 'admin'],
  [vehicle, 'put', '/:id', 'operator'],
  [vehicle, 'delete', '/:id', 'admin'],
  [vehicle, 'put', '/:id/assign-device', 'admin'],
  [vehicle, 'put', '/:id/unassign-device', 'admin'],
  [vehicle, 'put', '/:id/device', 'admin'],
  [trip, 'post', '/', 'operator'],
  [trip, 'put', '/:id', 'operator'],
  [trip, 'delete', '/:id', 'admin'],
  [trip, 'put', '/:id/start', 'operator'],
  [trip, 'put', '/:id/end', 'operator'],
  [maintenance, 'post', '/', 'operator'],
  [maintenance, 'put', '/:id', 'operator'],
  [maintenance, 'delete', '/:id', 'admin'],
  [driver, 'get', '/', 'admin'],
  [driver, 'get', '/:id', 'admin'],
  [driver, 'post', '/', 'admin'],
  [driver, 'put', '/:id', 'admin'],
  [driver, 'delete', '/:id', 'admin'],
  [customer, 'get', '/', 'admin'],
  [customer, 'get', '/:id', 'admin'],
  [customer, 'post', '/', 'admin'],
  [customer, 'put', '/:id', 'admin'],
  [customer, 'delete', '/:id', 'admin'],
  [geofence, 'post', '/policies', 'manager'],
  [geofence, 'put', '/policies/:policyId', 'manager'],
  [geofence, 'put', '/vehicles/:vehicleId/allowed-zone', 'manager'],
  [geofence, 'delete', '/vehicles/:vehicleId/allowed-zone', 'admin'],
  [geofence, 'post', '/', 'manager'],
  [geofence, 'put', '/:id', 'manager'],
  [geofence, 'delete', '/:id', 'admin'],
  [geofence, 'post', '/:id/vehicles', 'manager'],
  [geofence, 'delete', '/:id/vehicles/:vehicleId', 'manager'],
  [zones, 'put', '/vehicles/:vehicleId', 'manager'],
  [zones, 'delete', '/vehicles/:vehicleId', 'admin'],
] as const satisfies ReadonlyArray<readonly [Router, string, string, string]>;

const getGuard = (router: Router, method: string, path: string): Handler => {
  const layers = (router as unknown as { stack: RouterLayer[] }).stack;
  const route = layers.find((layer) => layer.route?.path === path && layer.route.methods[method])?.route;
  expect(route, `No route for ${method.toUpperCase()} ${path}`).toBeDefined();
  expect(route!.stack.length, 'Mutating route must have a role guard before controller').toBeGreaterThan(1);
  return route!.stack[0].handle;
};

describe('REST personal-data read and write route authorization', () => {
  const roleOrder = ['viewer', 'operator', 'manager', 'admin', 'root'] as const;

  for (const [router, method, path, minimumRole] of routes) {
    it(`${method.toUpperCase()} ${path} enforces the entire role privilege matrix`, () => {
      const guard = getGuard(router, method, path);
      const threshold = roleOrder.indexOf(minimumRole);

      for (const role of roleOrder) {
        const next = vi.fn();
        guard({ user: { role } }, {}, next);
        if (roleOrder.indexOf(role) >= threshold) {
          expect(next, `${role} should be allowed on ${method.toUpperCase()} ${path}`).toHaveBeenCalledWith();
        } else {
          expect(next, `${role} must be denied on ${method.toUpperCase()} ${path}`).toHaveBeenCalledOnce();
          expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
        }
      }
    });
  }

  for (const [router, method, path, minimumRole] of routes) {
    it(`${method.toUpperCase()} ${path} denies viewers and allows its configured editor role`, () => {
      const guard = getGuard(router, method, path);
      const denied = vi.fn();
      guard({ user: { role: 'viewer' } }, {}, denied);
      expect(denied).toHaveBeenCalledOnce();
      expect(denied.mock.calls[0]?.[0]).toBeInstanceOf(Error);

      const permitted = vi.fn();
      guard({ user: { role: minimumRole } }, {}, permitted);
      expect(permitted).toHaveBeenCalledWith();
    });
  }
});
