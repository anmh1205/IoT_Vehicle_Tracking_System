# Researcher #02 — VictoriaMetrics production-ready admin CRUD best practices

Work context: E:/anmh1205/IoT_Vehicle_Tracking_System
Reports path: E:/anmh1205/IoT_Vehicle_Tracking_System/plans/reports/
Plan path: E:/anmh1205/IoT_Vehicle_Tracking_System/plans/

## Scope
Focus: admin CRUD for VictoriaMetrics stack in web system-admin, especially datasource/query templates, vmalert rules, tenant/retention/access control, and production guardrails.

## Findings
- `vmalert` reads alerting/recording rules from `-rule` sources, evaluates against `-datasource.url`, and sends notifications via `-notifier.url`; recording rules need `-remoteWrite.url` for persistence. Use rule files that are small, versioned, and testable. [1][2][9]
- `vmalert-tool` can unit-test alerting and recording rules; production CRUD should run validation before save/activate to catch broken PromQL or wrong expected outputs early. [10]
- `vmauth` is the control point for authorizing, routing, and load-balancing requests across VictoriaMetrics backends; for multi-tenant admin, use it as the front door for tenant-aware routing and token-based access control. [5][8]
- VictoriaMetrics cluster splits responsibilities: `vminsert` ingests, `vmselect` serves queries, `vmstorage` stores data. Admin UX should expose role-specific config, not one generic endpoint blob. [4][5]
- VictoriaMetrics supports Prometheus-compatible query API and URL patterns; query templates should stay API-compatible and parameterized, with safe defaults and strict escaping to avoid query injection and accidental high-cardinality scans. [3][8]
- VictoriaMetrics docs explicitly recommend reading the component docs for `vmalert`, `vmauth`, and operator resources; treat the upstream docs as source of truth for field names and flags. [1][5][7][10]

## Constraints and best practices
### Datasource + query templates
- Support separate datasource types for `vmselect`, `vmalert`, `vmauth`-fronted endpoints, and optional read-only URLs.
- Template variables must be validated server-side: time range, tenant, cluster, metric, label matchers, step, and aggregation scope.
- Enforce query cost guardrails: max time range, max step, max result size, disallow raw `.*` label matchers unless explicitly allowed.
- Prefer saved templates over free-form query strings for common admin actions; keep raw PromQL only for advanced mode.

### Alert rules + recording rules
- Validate rule syntax before save; reject rules that do not parse or that reference unknown datasource/tenant.
- Separate alert rules from recording rules in UX and storage; recording rules need clear output series naming conventions.
- Add dry-run/test endpoint that invokes rule validation/unit tests before activation.
- Version rule packs and record the active revision, creator, approver, and activation timestamp.

### Tenant + retention + access control
- Use tenant-scoped configs; never let a non-superadmin switch tenant implicitly.
- Make retention edits privileged and auditable; show impact estimate and irreversible warning.
- Route all admin actions through vmauth or an equivalent auth layer; do not expose vmselect/vminsert directly to browsers.
- Prefer token-based auth with explicit role mapping: viewer, operator, admin, superadmin.

## Security checklist
- Strong authn/authz on every CRUD action.
- CSRF protection for browser sessions, or use stateless API tokens.
- Server-side validation for all rule/query fields; no trust in client-side checks.
- Audit log all create/update/delete/activate/rollback actions with actor, tenant, diff, and request id.
- Redact secrets, tokens, and backend URLs in logs/UI unless user has explicit permission.
- Rate-limit query execution and rule validation to prevent abuse.

## Auditability
- Store immutable revision history for datasource, template, rule, tenant, and retention objects.
- Capture before/after diff, approval status, and deployment result.
- Link each activation to the exact backend config snapshot and operator user.

## Idempotency
- Use stable resource IDs and version checks (ETag/revision) for PUT/PATCH/DELETE.
- Reapplying the same config should be a no-op and produce the same revision hash.
- UI should disable duplicate submits and backend should reject stale versions.

## Rollback / backfill
- Keep previous active config until new config is validated and promoted.
- Provide one-click rollback to the last known-good revision.
- For recording rules, define safe backfill flow: create new rule, validate on historical window, then switch active output name only when safe.
- Never overwrite live rules in-place without revision backup.

## API / UX guardrails
- Require preview/validate step before save/activate.
- Show blast radius: tenant, datasource, rules affected, retention window, estimated query cost.
- Warn on destructive ops: delete datasource, shorten retention, disable auth, widen query scope.
- Use optimistic locking, explicit confirmation, and change summaries.
- Add “read-only mode” for emergency incident use.

## Citations
1. https://docs.victoriametrics.com/victoriametrics/vmalert/
2. https://github.com/VictoriaMetrics/VictoriaMetrics/blob/master/docs/victoriametrics/vmalert.md
3. https://docs.victoriametrics.com/
4. https://hub.docker.com/r/victoriametrics/vmselect
5. https://docs.victoriametrics.com/victoriametrics/vmauth/
6. https://docs.victoriametrics.com/victoriametrics-cloud/alerting-vmalert-victoria-metrics-cloud/
7. https://docs.victoriametrics.com/operator/resources/vmrule/
8. https://github.com/VictoriaMetrics/VictoriaMetrics/blob/master/docs/victoriametrics/vmauth.md
9. https://hagen1778.github.io/docs-test/vmalert.html
10. https://docs.victoriametrics.com/victoriametrics/vmalert-tool/

## Unresolved questions
- Which auth model is already used by current system-admin UI: session cookie, JWT, or API token?
- Do we need per-tenant datasource isolation in UI, or only shared infra with tenant selector?
- Should rule validation call a live VictoriaMetrics backend, or only static syntax/unit checks?
