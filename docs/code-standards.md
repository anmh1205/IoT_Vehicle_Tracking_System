# Code Standards

## Accessibility Standards (Web + Mobile)
- Use semantic landmarks and landmarks-first navigation (for example, skip links to `#main-content`).
- Every non-text control should have an explicit accessible name (`aria-label` when icon-only).
- Error and status feedback affecting user action should use appropriate live regions (`role="alert"` with `aria-live` where applicable).
- Keyboard interaction must be supported for custom interactive elements using Enter and Space handlers.
- Pressed state for toggle buttons should be explicit via `aria-pressed`.
- Decorative icons inside buttons should be marked with `aria-hidden="true"`.
- For high-touch targets, set minimum target size near WCAG AAA touch guidance (targeting 44px equivalent).
- Mobile-first components should keep explicit hit areas larger than compact defaults for frequent actions.

## Layout / Viewport Standards
- Use `100dvh` for full-height panels that depend on viewport size, especially when mobile browser UI changes can distort `100vh`.
- Wrap viewport-root content with a stable element id to support keyboard skip navigation.

## Flutter Accessibility Standards
- Use semantics-aware Flutter widgets for key loading/error state surfaces and set `liveRegion: true` for status messages.
- Keep retry/load actions with clear Vietnamese/locale-aware labels.
- Maintain touch targets >=48dp where possible for full-screen action buttons.

## Cross-File Conventions
- Keep Vietnamese UI strings in feature modules consistent (UI copy should match locale style used in parent feature).
- Keep accessibility changes minimal and local to impacted components to reduce regression risk.
- Update project docs (`docs/development-roadmap.md`, `docs/project-changelog.md`, `docs/system-architecture.md`, `docs/codebase-summary.md`) whenever accessibility standards change or are adopted.

## API Response Contract Standards
- Success responses must use the shared envelope shape `{ data, requestId, meta? }`.
- Error responses must serialize to RFC7807 problem details and include `requestId` plus `errors[]` for validation detail.
- Frontend API clients should unwrap the success envelope before data reaches feature code.
- Error parsers should treat problem-details responses as the canonical server failure shape.
- Keep request-scoped identifiers and response contract fields consistent across middleware, health, metrics, policy, and rate-limit paths.

## Cloud Policy Standards
- Policy types must remain explicit and limited to the supported backend contract: `ADMIN_BOUNDARY`, `RADIUS`, and `DISTANCE_QUOTA`.
- Geofence boundary checks should keep strict boundary semantics unless the policy contract is updated.
- Distance quota evaluation must preserve cycle-based accumulation and reset behavior.
- Policy mutation and evaluation paths should keep validation local to the affected controller or service and avoid ad hoc request parsing.
- Metrics labels for policy evaluation must stay low-cardinality and use policy type / result / severity / cycle only.

## Thesis Asset Readability Standards
- Keep thesis final markdown and Mermaid labels short, self-standing, and glossary-aligned.
- Preserve technical names, protocol names, and library names exactly when they are load-bearing.
- Prefer Vietnamese descriptive prose for explanatory copy; keep English only for canonical product/tool names.
- Update the related thesis assets and docs together so captions, labels, and summaries do not drift.

## MQTT and Realtime Contract Standards
- Treat MQTT as the canonical ingest path for both real devices and simulator flows.
- Remove legacy runtime exposure such as `/iot/data` rather than keeping parallel entry points.
- Use colon-style realtime event names as the canonical contract and update consumers in lockstep when names change.
- Treat simulator token handling as security-sensitive; do not rely on stored token hashes as replayable bearer material.
- Apply rollback/race mitigations around simulator publish flows when state transitions can overlap.
- Keep deterministic simulator artifacts, fault catalogs, checkpoint thresholds, and stop conditions in `resources/mock-data/simulator-specs/` so ops automation stays reproducible.
- Keep VPS fix-loop restarts allowlisted and targeted to one service per remediation attempt; avoid broad restarts that hide the failing boundary.
- If a fix-loop uses replay inputs, support both NDJSON and array-form outputs when the same toolchain can emit both.

## Firmware GNSS Reliability Standards
- GNSS polling should keep retry and self-heal behavior bounded with explicit cooldowns to prevent modem thrash.
- Log GNSS transport failures, parse failures, no-fix streaks, and fix-success streaks separately so recovery behavior stays observable.
- Re-arm GNSS from the tracker state machine after LTE recovery or repeated GNSS poll failures, not from ad hoc caller loops.
- Keep GNSS power-cycle recovery localized to the modem/GNSS layer and state machine lifecycle, not spread across unrelated subsystems.
