# Phase 08 - Rollout, Verification, And Deprecation

## Objective

Ship the new model safely with measurable parity and a clean retirement path for the old overloaded status contract.

## Rollout Plan

### Stage 1

- Ship backend and bridge compatibility readers
- Ship DB migrations with nullable additions
- No UI cutover yet

### Stage 2

- Ship firmware payload enrichment
- Start dual-write / dual-read
- Enable log and metric comparison dashboards

### Stage 3

- Switch frontend quick views to canonical model with fallback adapter
- Validate map/device views in UAT

### Stage 4

- Switch bridge session logic to canonical state rules
- Monitor regressions in runtime/session analytics

### Stage 5

- Remove legacy-only frontend heuristics
- Deprecate or isolate old `running/stopped/heartbeat` contract

## Verification Matrix

- Firmware bench tests:
  - ign on + stationary
  - ign on + moving
  - ign off + stationary
  - ign off + motion wake
- MQTT bridge replay tests:
  - legacy payloads
  - canonical payloads
  - mixed rollout ordering
- Backend contract tests:
  - DTO shapes
  - realtime payload shapes
  - metrics exposure
- Frontend UAT:
  - operations map bottom summary
  - selected device quick view
  - device list card
  - device detail
  - mobile drawer

## Rollback Plan

- Keep compatibility adapter in bridge/backend until cutover is stable
- Frontend can fall back to legacy mapping if canonical state block missing
- DB schema additions are additive-first to keep rollback simple

## Done Criteria

- No user-facing surface relies on `running = moving`
- No device can be shown as `tắt máy` just because it is stationary
- Device alerts and ECU alerts are queryable and renderable separately
- Operators can read the bottom map bar quickly and diagnose deeper only when expanding
