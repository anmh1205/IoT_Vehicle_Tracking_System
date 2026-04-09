---
title: "SIM7600 RDY-gated recovery plan"
description: "Loại bỏ reset/pwrkey vô cớ bằng gate RDY + recovery/backoff tối giản cho FSM modem LTE."
status: pending
priority: P2
effort: 12h
branch: feature/cicd
tags: [firmware, sim7600, modem, rdy-gating, recovery, backoff]
created: 2026-04-09
---

# Implementation plan overview

Goal workflow (must): `power on -> wait RDY -> AT sync -> ATE0 -> CPIN`.
No arbitrary reset. If recover/reset xảy ra, luôn quay lại flow chuẩn và chờ RDY trước khi AT.

## Phases

1. **Phase 01 — RDY event/token startup gate**  
   Status: pending | Progress: 0%  
   File: [phase-01-rdy-event-and-startup-gate.md](./phase-01-rdy-event-and-startup-gate.md)

2. **Phase 02 — Recovery/backoff anti-storm**  
   Status: pending | Progress: 0%  
   File: [phase-02-recovery-backoff-and-storm-protection.md](./phase-02-recovery-backoff-and-storm-protection.md)

3. **Phase 03 — Debug cleanup + observability hygiene**  
   Status: pending | Progress: 0%  
   File: [phase-03-debug-cleanup-and-observability.md](./phase-03-debug-cleanup-and-observability.md)

4. **Phase 04 — Verification and acceptance**  
   Status: pending | Progress: 0%  
   File: [phase-04-verification-and-acceptance.md](./phase-04-verification-and-acceptance.md)

## Dependencies
- P02 blocked by P01 (recovery phải dùng RDY gate mới).
- P03 blocked by P01+P02 (cleanup theo hành vi mới).
- P04 blocked by P01+P02+P03.

## Key files for implementation
- `iot-vehicle-tracking-system-firmware/main/src/modem_lte.c` (primary)
- `iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
- `iot-vehicle-tracking-system-firmware/main/inc/modem_at.h`
- `iot-vehicle-tracking-system-firmware/main/inc/modem_lte.h` (only if new API/flags needed)

## Non-goals (YAGNI)
- Không redesign toàn bộ FSM.
- Không đổi kiến trúc transport ngoài nhu cầu RDY gate/recovery storm.
- Không mở rộng feature network attach beyond bug fix.

## Validation Log

### Session 1 — 2026-04-09
**Trigger:** Initial plan validation trước khi implement.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Nguồn RDY nào sẽ là canonical cho gate mở AT_SYNC?
   - Options: Pin ưu tiên, token fallback (Recommended) | Chỉ parser token RDY | Chỉ pin RDY
   - **Answer:** Other
   - **Custom input:** ban tin uart tu module sim
   - **Rationale:** Chốt nguồn RDY theo UART token giúp bỏ phụ thuộc wiring RDY pin và khớp thực tế board hiện tại.

2. **[Assumptions]** Khi CPIN trả '+CME ERROR: SIM not inserted', policy nào đúng cho lần triển khai này?
   - Options: Retry mềm rồi mới recover (Recommended) | Recover phần cứng ngay | Fail-fast và vào backoff
   - **Answer:** Retry mềm rồi mới recover (Recommended)
   - **Rationale:** Tránh coi lỗi CPIN tức thời là lỗi phần cứng, giảm reset/pwrkey không cần thiết.

3. **[Risks]** Đặt chiến lược cooldown/backoff anti-storm thế nào?
   - Options: Conservative anti-storm (Recommended) | Aggressive reconnect | Không đổi hằng số hiện tại
   - **Answer:** Conservative anti-storm (Recommended)
   - **Rationale:** Ưu tiên ổn định FSM, tránh loop recover dày đặc gây kéo dài downtime thực tế.

4. **[Scope]** Phạm vi cleanup debug code cũ nên chốt ở mức nào?
   - Options: Giữ log vận hành tối thiểu (Recommended) | Giữ gần như toàn bộ log cũ | Cắt log rất mạnh
   - **Answer:** Giữ log vận hành tối thiểu (Recommended)
   - **Rationale:** Giữ đủ dữ liệu vận hành/acceptance, đồng thời giảm nhiễu log debug tạm.

#### Confirmed Decisions
- RDY canonical source: UART token từ modem SIM — không phụ thuộc pin RDY.
- CPIN policy: bounded soft-retry trước khi cho recover phần cứng.
- Recovery policy: conservative cooldown + bounded attempts + exponential backoff.
- Cleanup scope: giữ minimal operational logs, bỏ debug rác.

#### Action Items
- [ ] Update Phase 01 để chốt RDY source = UART token canonical.
- [ ] Update Phase 02 để ghi rõ CPIN soft-retry và conservative anti-storm constants.
- [ ] Update Phase 03 để chốt phạm vi log tối thiểu vận hành.
- [ ] Update Phase 04 để thêm acceptance cho CPIN soft-retry trước recover.

#### Impact on Phases
- Phase 01: Cập nhật Requirements/Architecture, bỏ ưu tiên RDY pin; dùng UART RDY token làm nguồn canonical.
- Phase 02: Cập nhật Requirements/Architecture, ràng buộc CPIN soft-retry trước recover + conservative anti-storm policy.
- Phase 03: Cập nhật Requirements, chốt chuẩn “minimal operational logs”.
- Phase 04: Cập nhật Requirements/Success Criteria, xác nhận CPIN soft-retry trước recover là tiêu chí pass.
