# Research Report: IVM26 system-admin + VictoriaMetrics CRUD patterns

## Executive Summary
Repo IVM26 shows a split architecture that is useful for the target repo: UI/API concerns are isolated from VictoriaMetrics deployment concerns, while security/audit work is tracked in dedicated plan docs. The strongest reusable pattern is not a specific implementation detail, but the separation of concerns: admin/config UI, auth state, API client, and infrastructure deployment are not tangled.

For the VictoriaMetrics side, the main reusable idea is a deployment-first CRUD model: manage VM components via explicit config/deploy artifacts, then expose admin-facing operations through validated API boundaries. For the system-admin side, the repo structure suggests RBAC/auth guardrails belong in shared auth/state modules, not sprinkled into pages or services.

## Research Methodology
- Scope: system-admin, VictoriaMetrics, vmalert, vmauth, datasource/query templates, tenant, retention, access control, audit, rollout/rollback
- Source type: repository path inventory from IVM26 via grep-based discovery
- Evidence level: path-level structural evidence only; no code execution, no implementation changes
- Date: 2026-04-21

## Key Findings

### 1) System-admin pattern
- Admin-related work is likely centralized around repo planning/docs rather than scattered code, e.g.:
  - `E:/anmh1205/IVM26/plans/260228-1145-codebase-system-audit-improvement-plan/phase-01-immediate-security-hardening.md`
  - `E:/anmh1205/IVM26/plans/260228-1145-codebase-system-audit-improvement-plan/phase-02-auth-and-trust-boundary-consolidation.md`
  - `E:/anmh1205/IVM26/plans/260228-1145-codebase-system-audit-improvement-plan/phase-03-architecture-and-duplication-reduction.md`
- Reusable idea: keep admin workflows behind a trust-boundary plan, not direct page-level logic.

### 2) VictoriaMetrics deployment surface
- Dedicated VM area exists: `E:/anmh1205/IVM26/IVM26_VictoriaMetrics/docker-compose.yml`
- This is the clearest reusable artifact for rollout/rollback: compose-based infra makes version pinning and service restart flow explicit.
- Good fit for repo chính if you need deterministic deploy/rollback for VM stack components.

### 3) Auth/RBAC boundary
- Auth state and API client are split in frontend:
  - `E:/anmh1205/IVM26/IVM26_Frontend/frontend_v2/src/lib/store/auth-store.ts`
  - `E:/anmh1205/IVM26/IVM26_Frontend/frontend_v2/src/lib/api/http.ts`
  - `E:/anmh1205/IVM26/IVM26_Frontend/frontend_v2/src/lib/api/endpoints.ts`
  - `E:/anmh1205/IVM26/IVM26_Frontend/frontend_v2/src/types/auth.d.ts`
- Reusable pattern: centralize auth claims/session shape, then let API client enforce headers/refresh/unauthorized handling.

### 4) Audit / security emphasis
- Security work is tracked as first-class artifacts:
  - `E:/anmh1205/IVM26/resources/plan/security-audit-2026-02/comprehensive-audit-plan.md`
  - `E:/anmh1205/IVM26/resources/plan/security-audit-2026-02/action-items.md`
  - `E:/anmh1205/IVM26/resources/plan/security-audit-2026-02/session-processing-audit.md`
- Reusable idea: audit trail and security review should be explicit plan outputs, not implicit developer memory.

### 5) Real-time / ingestion adjacency
- Backend real-time and telemetry services are separate concerns:
  - `E:/anmh1205/IVM26/IVM26_Backend/backend_v1/src/realtime/socket-server.util.ts`
  - `E:/anmh1205/IVM26/IVM26_Backend/backend_v1/src/services/iot-data.service.ts`
- Reusable lesson: telemetry ingestion should stay isolated from admin CRUD so operational churn does not leak into admin API stability.

### 6) Likely datasource/query template pattern
- Frontend `endpoints.ts` + `http.ts` suggests API-driven configuration, which is the right place to expose datasource/query-template CRUD from the admin side.
- Recommendation for repo chính: treat query templates as validated records with versioned schema, not as free-form strings.

### 7) Tenant / retention / access control
- The grep surface shows explicit attention to access control and trust boundary consolidation in plan docs.
- Reusable pattern for VM: tenant, retention, and access rules should be admin-managed configuration with validation + audit logging on every change.

### 8) Rollout / rollback
- The compose-based VM repo and staged security plan imply a rollback-friendly model: change config in one place, re-deploy, verify, and revert by restoring prior compose/config state.
- Best practice: store previous effective config and emit change metadata for rollback traceability.

## What to learn
- Centralize auth/session shape and API transport.
- Keep infra/deployment artifacts separate from business UI.
- Make audit/security planning explicit.
- Use compose/config versioning for deterministic rollout and rollback.
- Treat VM tenant/retention/query templates as first-class validated admin resources.

## What to avoid
- Don’t embed VictoriaMetrics logic inside random pages/components.
- Don’t mix telemetry ingestion code with admin CRUD code.
- Don’t make query templates free-form without schema checks.
- Don’t rely on ad hoc permission checks scattered across controllers.
- Don’t make rollback depend on manual, undocumented steps.

## Suggested reuse for repo chính
- Build a dedicated system-admin module with:
  - RBAC guard at controller boundary
  - schema validation for every admin mutation
  - audit event on create/update/delete
  - versioned config records for VM-related settings
- Keep VM deploy/config separate from UI code.
- Mirror the auth-store + http-client split for admin session handling.

## Unresolved questions
- Need full-file inspection to confirm the exact RBAC roles and permission names in IVM26.
- Need direct code review of `IVM26_VictoriaMetrics/docker-compose.yml` to verify service topology, tenants, and rollback mechanics.
- Need full search for any hidden vmalert/vmauth config files outside the paths surfaced by grep.
- Need confirmation whether query templates are stored in code, DB, or external config in IVM26.
