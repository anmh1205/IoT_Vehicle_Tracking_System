Keep local path unchanged. Add thin remote mode over SSH to machine A; no COM forwarding.

Plan:
- First-run UX lives in `SKILL.md`: ask `local` or `remote(machine A)` once, then ask COM once for chosen mode; reuse session choice.
- Reuse existing script split. Add optional remote args/env, keep JSON outputs same.
- Remote flow runs `com_detector.py`, `serial_reader.py`, `wait_and_flash.py` on machine A over SSH.
- `loop_runner.py` only orchestrates mode switch; avoid embedding SSH logic everywhere unless a tiny shared helper is needed.

Likely files:
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/SKILL.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/.env.example`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/com_detector.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/serial_reader.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/wait_and_flash.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/loop_runner.py`
- related tests under `scripts/tests/`

Recommended order:
1. `SKILL.md` prompt flow
2. `.env.example` remote config
3. remote COM detect
4. remote monitor
5. remote wait-and-flash
6. `loop_runner.py` mode orchestration
7. regression + remote command-build tests

Unresolved questions:
- Remote logs stored on Windows, machine A, or both?
- Exact remote repo/skill/firmware paths on machine A fixed yet?