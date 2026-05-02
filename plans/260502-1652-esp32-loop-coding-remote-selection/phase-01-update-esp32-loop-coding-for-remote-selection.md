# Context Links
- Skill: `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/SKILL.md`
- Scripts: `scripts/com_detector.py`, `serial_reader.py`, `wait_and_flash.py`, `loop_runner.py`
- Env loader: `scripts/env_loader.py`
- Tests: `scripts/tests/`

# Overview
- Priority: P2
- Status: pending
- Add first-run mode selection: local vs remote(machine A), then COM selection. Preserve current local defaults.

# Key Insights
- Current flow already separates detect/monitor/flash. Reuse that.
- `SKILL.md` can own AskUserQuestion behavior; scripts should stay CLI-first.
- Remote path should execute scripts on machine A over SSH, not emulate serial on Windows.

# Requirements
- First use: ask mode.
- First use per mode: ask/select COM; reuse chosen COM for session.
- Remote mode: detect COM, monitor, wait-and-flash on machine A via SSH.
- Local mode unchanged.

# Architecture
- Add minimal shared options/env: `ESP32_RUN_MODE`, `ESP32_REMOTE_HOST`, `ESP32_REMOTE_SKILL_ROOT`, optional `ESP32_REMOTE_FIRMWARE_DIR`, `ESP32_REMOTE_SSH_KEY`.
- `com_detector.py`: optional `--remote-host` wrapper or separate helper logic returning same JSON shape.
- `serial_reader.py` and `wait_and_flash.py`: support remote command execution, return same result schema.
- `loop_runner.py`: branch by mode, reuse same log naming, keep analyzer logic local.

# Related Code Files
- Modify: `SKILL.md`, `.env.example`, `scripts/com_detector.py`, `scripts/serial_reader.py`, `scripts/wait_and_flash.py`, `scripts/loop_runner.py`, related tests.
- Create: none unless a tiny shared `ssh_runner.py` removes duplication.
- Delete: none.

# Implementation Steps
1. Update `SKILL.md` bootstrap to ask mode once, then COM once, with explicit remote command templates.
2. Add remote env examples and defaults in `.env.example`.
3. Extract tiny SSH subprocess helper only if duplication appears in 2+ scripts.
4. Extend `com_detector.py` to fetch remote port list with unchanged JSON contract.
5. Extend `serial_reader.py` to run remote monitor and stream/append logs locally or return remote log path.
6. Extend `wait_and_flash.py` to run remote probe/flash on machine A.
7. Update `loop_runner.py` to orchestrate local/remote paths while preserving current local behavior.
8. Add/adjust tests for mode selection plumbing, remote command building, JSON compatibility, local regression.

# Todo List
- [ ] Define minimal remote env contract
- [ ] Define first-run prompt text in skill doc
- [ ] Add remote detect path
- [ ] Add remote monitor path
- [ ] Add remote flash path
- [ ] Keep local tests green

# Success Criteria
- Local commands still work unchanged.
- Remote mode can detect COM, monitor, and flash via SSH to machine A.
- JSON outputs remain backward compatible.
- No extra orchestration beyond minimal helper/env.

# Risk Assessment
- Biggest risk: path drift between Windows host and machine A.
- Mitigation: require explicit remote repo/skill paths in env.

# Security Considerations
- Do not hardcode secrets.
- Reuse existing SSH key path/env; avoid printing private key material.
- Quote remote paths/args defensively.

# Next Steps
- Implement in order: docs/env -> detect -> monitor -> flash -> loop runner -> tests.

# Unresolved Questions
- Should remote monitoring append logs on Windows, on machine A, or both?
- Is machine A guaranteed to have identical repo path and Python deps?
