import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { getDashboardBreadcrumbs } from '../src/config/dashboard-route-registry';
import { isDateInputRangeValid } from '../src/lib/utils/date/range';
import { proxy } from '../src/proxy';

test('sign-in preserves the map selection and view from a protected deep link', () => {
  const target = '/dashboard/operations/map?device=QA-001&z=12';
  const response = proxy(new NextRequest(`http://localhost:4001${target}`));
  assert.equal(response.status, 307);
  const location = new URL(response.headers.get('location')!);
  assert.equal(location.pathname, '/login');
  assert.equal(location.searchParams.get('redirect'), target);
});

test('dashboard entity IDs can contain dots without becoming public assets', () => {
  const response = proxy(new NextRequest('http://localhost:4001/dashboard/fleet/devices/tracker.1'));
  assert.equal(response.status, 307);
});

test('reports have localized breadcrumbs in the operations section', () => {
  assert.deepEqual(getDashboardBreadcrumbs('/dashboard/statistics').map(({ title }) => title), ['Vận hành', 'Thống kê']);
  assert.deepEqual(getDashboardBreadcrumbs('/dashboard/fuel').map(({ title }) => title), ['Vận hành', 'Nhiên liệu']);
});

test('report dates must both be set and in chronological order', () => {
  assert.equal(isDateInputRangeValid({ from: '', to: '2026-11-27' }), false);
  assert.equal(isDateInputRangeValid({ from: '2026-11-28', to: '2026-11-27' }), false);
  assert.equal(isDateInputRangeValid({ from: '2026-11-27', to: '2026-11-27' }), true);
});
