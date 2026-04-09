# Planner report: modem RDY-gated recovery

## Scope
- Plan only, no code change.
- Fix LTE SIM7600 reset/pwrkey storm after AT timeout.

## Inputs used
- `research/researcher-01-root-cause-and-rdy-gating.md`
- `research/researcher-02-fsm-recovery-and-backoff.md`
- `docs/codebase-summary.md` (+ standards/architecture/overview docs)

## Key synthesis
- Root issue: AT timeout path is timeout-driven, not modem-ready-driven.
- Required canonical startup: `power on -> wait RDY -> AT sync -> ATE0 -> CPIN`.
- Recovery must re-enter same canonical flow and wait RDY again.
- Add anti-storm controls (cooldown + bounded retries + backoff).
- Keep changes minimal in existing firmware files (`modem_lte.c`, `modem_at.c/.h`, optional `modem_lte.h`).

## Plan artifacts generated
- `plan.md`
- `phase-01-rdy-event-and-startup-gate.md`
- `phase-02-recovery-backoff-and-storm-protection.md`
- `phase-03-debug-cleanup-and-observability.md`
- `phase-04-verification-and-acceptance.md`
- `scout/scout-01-skipped-codebase-scan.md`

## Unresolved questions
- RDY physical pin availability/polarity on current board.
- Final numeric constants for RDY wait/cooldown/backoff.
- Final pass/fail tolerance for transient `+CME ERROR: SIM not inserted` before recovery.
