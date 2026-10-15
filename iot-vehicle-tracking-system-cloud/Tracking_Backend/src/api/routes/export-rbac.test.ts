import { describe, expect, it, vi } from 'vitest';
import type { Router } from 'express';
import router from './export.routes';

type Handler = (req: unknown, res: unknown, next: (error?: Error) => void) => void;
type RouteLayer = { route?: { path: string; methods: Record<string, boolean>; stack: { handle: Handler }[] } };

const getGuard = (method: string, path: string): Handler => {
  const layer = (router as Router & { stack: RouteLayer[] }).stack.find(
    (item) => item.route?.path === path && item.route.methods[method],
  );
  expect(layer?.route?.stack.length).toBeGreaterThanOrEqual(2);
  return layer!.route!.stack[0].handle;
};

describe('Full-fleet export access requires a privileged role', () => {
  for (const [method, path] of [
    ['get', '/'],
    ['post', '/'],
    ['get', '/:id'],
    ['get', '/:id/download'],
  ] as const) {
    it(`${method.toUpperCase()} ${path} denies viewer and manager, permits admin`, () => {
      const guard = getGuard(method, path);
      for (const role of ['viewer', 'manager']) {
        const denied = vi.fn();
        guard({ user: { role } }, {}, denied);
        expect(denied.mock.calls[0]?.[0]).toBeInstanceOf(Error);
      }
      const allowed = vi.fn();
      guard({ user: { role: 'admin' } }, {}, allowed);
      expect(allowed).toHaveBeenCalledWith();
    });
  }
});
