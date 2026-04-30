# Phase 05: Docs and rollout

## Context links
- Plan: `plan.md`
- Depends on: Phases 01-04 validation.
- Project docs noted by repo rules: `docs/system-architecture.md`, `docs/code-standards.md`, `docs/development-roadmap.md`, `docs/project-changelog.md`, plus any existing realtime/API docs.

## Overview
- Priority: P2.
- Status: pending.
- Effort: 2h.
- Document realtime contract, fetch boundaries, rollout/rollback, and operational validation. Keep docs concise and aligned with actual implemented behavior.

## Key Insights
<!-- Updated: Validation Session 1 - mobile WebView scope and all polling conversion -->
- Docs must not claim full durable realtime replay if only snapshot fallback exists.
- Fetch is still correct for initial snapshot, pagination/history/export download/error retry.
- Mobile native socket is not found; WebView inherits frontend behavior.
- System/admin/simulator data-source polling is in scope for conversion; only UI-only timers remain acceptable.

## Requirements
- Functional: update docs with namespaces, path `/ws`, event names/envelope, room scope, reconnect fallback, testing commands, rollout checklist.
- Non-functional: no markdown outside plan dir during planning; during implementation docs-manager updates project docs as needed.
- Classification: docs must clearly mark critical fixed gaps, acceptable fetch, intentionally non-realtime.

## Architecture
- Document event model table: event name, namespace, scope/room, payload boundary, auth rule, client action.
- Document reconnect strategy: active snapshot refetch, no replay cursor in current phase.
- Document backpressure: coalesce latest position; bounded dedupe.
- Document rollout: feature branch -> build/test -> Docker validation -> UAT observe `/ws-health` -> monitor refetch and socket metrics.

## Related code files
- Modify during implementation: project docs under `docs/**` only after reading current docs.
- Modify if available: OpenAPI/realtime contract docs.
- No runtime code in this phase except documentation-linked config examples if already present.
- Create/Delete: avoid new docs unless no existing realtime doc exists.

## Implementation Steps
1. Read current architecture/code-standard/roadmap/changelog docs before updating.
2. Add concise realtime architecture section: namespaces, path, event envelope, scopes.
3. Add accepted fetch boundary list to avoid future over-removal of REST.
4. Add intentionally non-realtime list: admin/system/simulator, native mobile socket deferred.
5. Add validation checklist and rollback notes.
6. Update changelog/roadmap only after actual implementation, not during planning.
7. Ask code-reviewer/docs-manager per primary workflow after implementation.

## Todo list
- [ ] Update realtime architecture docs.
- [ ] Update event contract table.
- [ ] Document fetch boundaries.
- [ ] Document reconnect/backpressure behavior.
- [ ] Add rollout/rollback checklist.
- [ ] Update roadmap/changelog after feature lands.

## Success Criteria
- A developer can implement/listen to a realtime event without reading source first.
- Docs do not promise durable replay or native mobile socket if not implemented.
- Rollout checklist catches namespace/auth/event coverage regressions.
- Changelog/roadmap reflect actual shipped scope.

## Risk Assessment
- Docs can drift if contract changes during implementation; update after tests pass.
- Over-documenting optional future cursor may confuse scope; keep optional section clearly future.

## Security Considerations
- Docs must state server-side room authorization and no client-side security reliance.
- Payload examples must not include real tokens, customer data, or secrets.

## Next steps
- Optional future plan: durable event cursor/replay if UAT shows snapshot fallback insufficient.
- Unresolved questions: exact doc file canonical location for realtime contract; whether mobile native realtime gets separate roadmap item.
