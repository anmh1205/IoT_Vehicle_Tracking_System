# Operator Handover Checklist — MQTT/VPS Fix Loop

## Run Context
- [ ] Run ID
- [ ] Campaign/scenario ID
- [ ] Seed used
- [ ] Current iteration

## Evidence Package
- [ ] `decision.json`
- [ ] `trace.ndjson`
- [ ] Checkpoint outputs (health, docker state, logs)
- [ ] Last simulator `run-summary.json`
- [ ] Error summary before/after fix

## Technical Summary
- [ ] Primary classifier (network/auth/broker/bridge/backend/db)
- [ ] Actions applied (include exact restart command if used)
- [ ] Why hard-stop or handover triggered
- [ ] Risks if continue without manual review

## Security & Safety
- [ ] Secret redaction verified
- [ ] No forbidden command executed
- [ ] Targeted restart limit respected (<=1 per run)

## Ownership
- [ ] Escalated to Platform lead
- [ ] Time of handover
- [ ] Next explicit action owner
