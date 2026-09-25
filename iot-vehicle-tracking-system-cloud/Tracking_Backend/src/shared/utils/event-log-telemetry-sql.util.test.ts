import {
  eventLogPositionExistsSql,
  eventLogPositionValueSql,
  eventLogValidPositionSql,
} from './event-log-telemetry-sql.util';

describe('event-log telemetry SQL', () => {
  it('uses normalized context exclusively when position_valid exists', () => {
    const sql = eventLogPositionValueSql('latitude', 'e');

    expect(sql).toContain("e.context ? 'position_valid'");
    expect(sql).toContain("THEN NULLIF(e.context->>'latitude', '')");
    expect(sql).toContain("e.context#>>'{raw_payload,data,latitude}'");
  });

  it('gates new event-log GPS on position_valid while retaining legacy fallback', () => {
    const sql = eventLogValidPositionSql('e');

    expect(sql).toContain("(e.context->>'position_valid')::boolean");
    expect(sql).toContain("e.context#>>'{raw_payload,data,latitude}'");
    expect(sql).toContain("e.context#>>'{raw_payload,data,longitude}'");
  });

  it('does not expose raw speed from a new event whose normalized position is invalid', () => {
    const sql = eventLogPositionExistsSql('speed');

    expect(sql).toContain("context ? 'position_valid'");
    expect(sql).toContain("(context->>'position_valid')::boolean");
  });
});
