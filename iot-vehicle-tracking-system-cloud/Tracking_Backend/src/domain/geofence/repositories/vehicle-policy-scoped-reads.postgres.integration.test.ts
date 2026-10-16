import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// A dedicated PostgreSQL client retains TEMP tables on one session and cannot
// contaminate other CI grant suites sharing the same integration database.
vi.mock('@/infrastructure/database/pool', async () => {
  const { Client } = await import('pg');
  return { pool: new Client({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: Number(process.env.PGPORT ?? '5432'),
    user: process.env.PGUSER ?? 'ivts_test',
    password: process.env.PGPASSWORD ?? 'ivts_test_password',
    database: process.env.PGDATABASE ?? 'ivts_test_assets',
  }) };
});

import { pool } from '@/infrastructure/database/pool';
import { listPolicies, getPolicyByIdForScope } from './vehicle-policy.repository';
import { listPolicyViolations } from './vehicle-policy-violation.repository';
import { findAll as listGeofences, findByIdForScope as getGeofenceForActor, findVehiclesByGeofenceIdForScope as scopedMemberships } from './geofence.repository';

const integration = process.env.IVTS_PG_INTEGRATION === '1' ? describe : describe.skip;
const u1 = { userId: 101, role: 'viewer', deviceAccessMode: 'assigned' };
const u2 = { userId: 102, role: 'manager', deviceAccessMode: 'assigned' };
const admin = { userId: 1, role: 'admin', deviceAccessMode: 'all' };

integration('geofence policies and violation search use live device grants', () => {
  beforeAll(async () => {
    if (process.env.PGDATABASE !== 'ivts_test_assets') throw new Error('Unsafe policy fixture database');
    await pool.connect();
    await pool.query('CREATE TEMP TABLE user_device_access(user_id int,device_id text)');
    await pool.query('CREATE TEMP TABLE vehicles(vehicle_id text,device_id text)');
    await pool.query(`CREATE TEMP TABLE vehicle_policies(
      id integer PRIMARY KEY, vehicle_id text, policy_type text, status text,
      params_json jsonb, effective_from timestamptz, effective_to timestamptz,
      created_by int, updated_by int, created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW())`);
    await pool.query(`CREATE TEMP TABLE violations(
      id integer PRIMARY KEY, policy_id int, vehicle_id text, policy_type text,
      violation_type text, severity text, acknowledged boolean DEFAULT FALSE,
      detected_at timestamptz, confirmed_at timestamptz, resolved_at timestamptz,
      evidence_json jsonb, dedupe_key text, correlation_id text,
      created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW())`);
    await pool.query('CREATE TEMP TABLE geofences(id integer PRIMARY KEY,created_by int,created_at timestamptz DEFAULT NOW(),is_active bool DEFAULT TRUE,geofence_type text,name text,description text)');
    await pool.query('CREATE TEMP TABLE geofence_vehicles(geofence_id int,vehicle_id text)');
    await pool.query("INSERT INTO geofences(id,created_by,name) VALUES(31,101,'Shared'),(32,102,'Foreign'),(33,101,'Own empty')");
    await pool.query("INSERT INTO geofence_vehicles VALUES(31,'V1'),(31,'V2'),(32,'V2')");
    await pool.query("INSERT INTO user_device_access VALUES(101,'D1'),(102,'D2')");
    await pool.query("INSERT INTO vehicles VALUES('V1','D1'),('V2','D2')");
    await pool.query(`INSERT INTO vehicle_policies(id,vehicle_id,policy_type,status,params_json)
      VALUES(11,'V1','RADIUS','active','{}'),(12,'V2','RADIUS','active','{}')`);
    await pool.query(`INSERT INTO violations(id,policy_id,vehicle_id,policy_type,violation_type,severity)
      VALUES(21,11,'V1','RADIUS','zone_exit','high'),(22,12,'V2','RADIUS','zone_exit','high')`);
  });
  afterAll(async () => { await pool.end(); });

  it('uses the identical grant predicate for policy counts and list rows', async () => {
    const a = await listPolicies({}, u1);
    expect(a.total).toBe(1);
    expect(a.policies.map((p) => p.vehicle_id)).toEqual(['V1']);
    const b = await listPolicies({}, u2);
    expect(b.total).toBe(1);
    expect(b.policies.map((p) => p.vehicle_id)).toEqual(['V2']);
    expect((await listPolicies({}, admin)).total).toBe(2);
  });

  it('denies guessed policy IDs and foreign vehicle filters', async () => {
    expect((await getPolicyByIdForScope(11, u1))?.vehicle_id).toBe('V1');
    expect(await getPolicyByIdForScope(12, u1)).toBeNull();
    expect((await listPolicies({ vehicleId: 'V2' }, u1)).total).toBe(0);
    expect((await getPolicyByIdForScope(12, admin))?.vehicle_id).toBe('V2');
  });

  it('restricts policy violation evidence in both count and result rows', async () => {
    const result = await listPolicyViolations({}, u1);
    expect(result.total).toBe(1);
    expect(result.violations.map((v) => v.vehicle_id)).toEqual(['V1']);
    expect((await listPolicyViolations({ vehicleId: 'V2' }, u1)).total).toBe(0);
    expect((await listPolicyViolations({}, admin)).total).toBe(2);
  });

  it('restricts geofence list, detail and membership identity to actor grants', async () => {
    const visible = await listGeofences({}, u1);
    expect(visible.total).toBe(2);
    expect(visible.geofences.map((g) => g.id).sort()).toEqual([31, 33]);
    expect((await listGeofences({}, admin)).total).toBe(3);
    expect((await listGeofences({ search: 'Foreign' }, u1)).total).toBe(0);
    expect(await getGeofenceForActor(32, u1)).toBeNull();
    expect((await getGeofenceForActor(31, u1))?.id).toBe(31);
    expect((await scopedMemberships(31, u1)).map((x) => x.vehicle_id)).toEqual(['V1']);
    expect((await scopedMemberships(31, admin)).map((x) => x.vehicle_id).sort()).toEqual(['V1','V2']);
    expect((await listGeofences({}, u2)).total).toBe(2);
  });
  it('immediately hides policies and violations after permission revocation', async () => {
    await pool.query("DELETE FROM user_device_access WHERE user_id=101 AND device_id='D1'");
    expect((await listPolicies({}, u1)).total).toBe(0);
    expect((await scopedMemberships(31, u1))).toEqual([]);
    expect((await listGeofences({}, u1)).total).toBe(2); // Own empty and owned shared zone remain visible
    expect(await getPolicyByIdForScope(11, u1)).toBeNull();
    expect((await listPolicyViolations({}, u1)).total).toBe(0);
    expect((await listPolicies({}, u2)).total).toBe(1);
  });
});
