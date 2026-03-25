# Research: rollout strategy, CI safety gates, rollback, SLOs for IoT ingestion

## Scope
- Progressive rollout/canary for message routing changes
- Data contract testing in CI
- Rollback patterns for broker/routing/schema changes
- SLO baselines for ingest pipelines

## Findings
1. Progressive rollout should be traffic-weighted, analysis-gated, and reversible.
   - Canary works best when traffic shifts gradually and each step is blocked by live metrics.
   - Use automated promotion/rollback, not manual handoffs.
2. CI safety gates for messaging systems should test the real consumer interface.
   - Pact is a contract gate, not a full integration test.
   - Keep interactions small, deterministic, and tied to the actual HTTP/message client path.
   - Use provider verification and `can-i-deploy` as the release gate.
3. Schema change safety depends on compatibility mode.
   - Default-safe posture is backward compatibility; upgrade consumers before producing new shapes.
   - For incompatible changes, cut a new topic/subject and migrate rather than forcing mixed versions.
4. Rollback for broker/routing changes must be operationally simple.
   - Keep previous revisions available, retain rollback history, and support pause/resume.
   - For schema mistakes, removing bad versions or reverting to a prior version is safer than broad in-place edits.
5. SLOs for ingest should start from user-visible outcomes, not internal averages.
   - Prefer a few SLIs: publish success, end-to-end delivery latency, processing lag, and data correctness.
   - Track error budgets and use them to slow releases when burn rate is high.

## Practical rollout pattern for message-routing changes
- Stage 0: deploy code dark; no routing exposure.
- Stage 1: 1-5% canary traffic on a small topic/tenant set.
- Stage 2: expand to 25% after passing metric checks.
- Stage 3: 50%, then 100% only after burn-rate and error checks stay green.
- Promotion gates: delivery success, consumer lag, retry rate, poison-message rate, broker errors.
- Rollback triggers: error spike, lag growth, schema mismatch, dead-letter growth, or missing telemetry.

## CI safety gates
- Contract tests for each producer/consumer pair.
- Verify against the actual message/client layer, not mocked transport.
- Stable examples only; no random payloads in pact artifacts.
- Schema compatibility check before merge.
- Deployability check (`can-i-deploy` or equivalent) before promotion.
- At least one smoke test against staging broker + routing path.

## Rollback patterns
- Broker/routing: pause rollout, revert route weights, restore previous config, keep old consumers alive until lag drains.
- Schema: keep prior compatible schema versions; if incompatible, write to a new topic/subject and dual-publish during migration.
- Deployment: use revision history, pause/resume, and automated rollback on failed analysis.
- Operational rule: never delete the last known-good path until the new path has been stable long enough for backlog to clear.

## Suggested SLO baselines for ingest pipelines
These are starting points, not universal standards.
- Availability of ingest path: 99.9% to 99.95% monthly.
- Message acceptance success: >= 99.9% for valid device traffic.
- End-to-end delivery latency: p95 under 2-5s; p99 under 10-30s for non-batch telemetry.
- Broker ack/publish latency: p95 under 300-500ms.
- Consumer lag / processing delay: p95 under 30-120s, depending on workload.
- Data correctness / drop rate: target near-zero; any unexplained loss should burn error budget fast.
- Alerting: page on burn-rate spikes, not on one-off transient blips.

## Risk matrix
| Risk | Likelihood | Impact | Mitigation |
|---|---:|---:|---|
| Canary exposes routing bug | Medium | High | Small canary, weighted traffic, automatic rollback on lag/error thresholds |
| Contract drift between producer and consumer | High | High | Pact CI gate, provider verification, `can-i-deploy` before promotion |
| Schema incompatibility breaks consumers | Medium | High | Backward compatibility by default, compatibility check in CI, new topic/subject for breaking changes |
| Rollback is slow or incomplete | Medium | High | Keep revision history, automate config restore, preserve old consumers until backlog drains |
| SLOs too weak or too strict | Medium | Medium | Start with a few user-centered SLIs, review weekly, tune by observed traffic |
| Missing telemetry hides failure | Medium | High | Gate rollout on metrics availability; no metrics, no promotion |

## Sources
1. Argo Rollouts README — canary, analysis, weighted traffic shifting, automated rollback
   https://github.com/argoproj/argo-rollouts
2. Pact consumer guidance — consumer-driven contract testing, small isolated interactions, loose matching
   https://docs.pact.io/consumer
3. Pact matching guide — deterministic matching and provider verification behavior
   https://docs.pact.io/implementation_guides/matching
4. Confluent Schema Registry schema evolution — compatibility modes and migration guidance
   https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html
5. Google SRE service level objectives — SLIs, SLOs, error budgets, practical target-setting
   https://sre.google/sre-book/service-level-objectives/

## Unresolved questions
- Current message format in the repo: Avro, JSON Schema, protobuf, or custom JSON?
- Which routing layer changes are planned: EMQX rules, bridge mapping, backend consumers, or all three?
- Current operational SLOs already in use, if any, so these baselines can be calibrated.