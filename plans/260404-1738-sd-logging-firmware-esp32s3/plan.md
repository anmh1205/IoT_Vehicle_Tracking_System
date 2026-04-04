---
title: "SD logging firmware ESP32-S3 (SDMMC 4-bit)"
description: "Plan triển khai SD logging bền vững với fsync/record, FIFO replay và ignition-only session."
status: pending
priority: P2
effort: 26h
branch: feature/cicd
tags: [firmware, sd-logging, esp32s3, sdmmc]
created: 2026-04-04
---

# Mục tiêu
- Thêm SD logging native SDMMC 4-bit, bền vững khi mất nguồn.
- Replay offline->online theo FIFO, có ack pointer, retry/backoff, backpressure.
- Chỉ mở session khi ignition ON; giữ logic đơn giản, dễ vận hành.

# Ràng buộc đã chốt
- SD mode: SDMMC 4-bit ngay từ đầu.
- Durability: fsync mỗi record.
- Retention: quota dung lượng + FIFO GC khi đầy.
- Session rule: ignition-only.

# Phases
1. **Phase 01**: SD storage layout + mount/unmount + card detect + wiring risk [phase-01-sd-storage-layout-and-mount-lifecycle.md](./phase-01-sd-storage-layout-and-mount-lifecycle.md)
2. **Phase 02**: Record model + internet/GPS matrix + offline queue/replay [phase-02-offline-online-queue-replay-and-backpressure.md](./phase-02-offline-online-queue-replay-and-backpressure.md)
3. **Phase 03**: Ignition session lifecycle + deep sleep/reboot/power-loss recovery [phase-03-ignition-session-state-machine-and-power-recovery.md](./phase-03-ignition-session-state-machine-and-power-recovery.md)
4. **Phase 04**: Observability + security/privacy + validation plan [phase-04-observability-security-and-validation.md](./phase-04-observability-security-and-validation.md)
5. **Phase 05**: Integration roll-out theo điểm chạm code hiện tại [phase-05-integration-rollout-and-acceptance.md](./phase-05-integration-rollout-and-acceptance.md)

# Dependency chính
- P01 -> P02 -> P03 -> P04 -> P05 (tuần tự, giảm rủi ro).
- Pin SDMMC + card-detect phải xác minh xong trước khi code I/O.
- MQTT publish ACK exposure cần rõ để chốt ack pointer semantics.

# Kết quả mong đợi
- Khi mất mạng: dữ liệu vẫn ghi SD, không block state machine.
- Khi có mạng lại: replay đúng thứ tự, không lặp vô hạn, không tràn quota.
- Khi ignition OFF: session đóng chuẩn, checkpoint an toàn trước sleep/reboot.
- Khi rút/tháo thẻ: hệ thống fail-safe, không crash, không ghi bậy.

# KPI/DoD tổng
- Không mất thứ tự record trong replay.
- fsync per record hoạt động; power-cut test không corrupt toàn bộ queue.
- Quota + FIFO GC giữ hệ thống sống liên tục.
- Có counters/events đủ debug queue depth, retry, SD health, puback lag.

# File đích dự kiến (high-level)
- Sửa: `main/src/state_machine.c`, `main/src/mqtt_client.c`, `main/inc/pin_map.h`, `main/CMakeLists.txt`, `main/main.c`.
- Thêm mới (gợi ý): `main/inc/sd_log_store.h`, `main/src/sd_log_store.c`, `main/inc/offline_queue.h`, `main/src/offline_queue.c`, `main/inc/session_mgr.h`, `main/src/session_mgr.c`, `main/inc/telemetry_counters.h`, `main/src/telemetry_counters.c`.

# Unresolved questions
- Ai là owner ký nhận hardware risk R29 (SD-CLK pull-up) sau bench test?
- Ngưỡng replay lag tối đa chấp nhận cho reconnect dài là bao nhiêu giây?

## Validation Log

### Session 1 — 2026-04-04
**Trigger:** Initial validation after plan creation (/plan:validate)
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Với rawdata không critical, bạn muốn chốt ACK semantics nào?
   - Options: QoS0 best-effort (Recommended) | ACK cho mọi record | ACK theo lô
   - **Answer:** QoS0 best-effort (Recommended)
   - **Rationale:** Giữ throughput và độ trễ replay ổn định; chỉ record critical mới khóa theo ACK pointer.

2. **[Tradeoffs]** Khi quota SD đầy, chính sách xóa nào cần chốt cho release đầu?
   - Options: Ưu tiên giữ critical (Recommended) | FIFO đồng đều | Dừng ghi mới
   - **Answer:** Ưu tiên giữ critical (Recommended)
   - **Rationale:** Bảo toàn dữ liệu quan trọng (event/status/firmware) khi tài nguyên giới hạn, giảm rủi ro mất tín hiệu vận hành.

3. **[Scope]** Khi ignition OFF, bạn muốn drain backlog trong bao lâu trước khi đóng session?
   - Options: Drain 3 giây (Recommended) | Stop ngay | Drain tối đa 30 giây
   - **Answer:** Drain 3 giây (Recommended)
   - **Rationale:** Cân bằng battery budget và độ đầy đủ dữ liệu cuối phiên, tránh kéo dài thời gian awake.

4. **[Security]** Record-level encryption trên SD cho release đầu bạn muốn mức nào?
   - Options: Hoãn encryption (Recommended) | Bắt buộc encryption ngay | Encryption cho critical-only
   - **Answer:** Hoãn encryption (Recommended)
   - **Rationale:** Giữ phạm vi release đầu gọn theo YAGNI; áp redaction + không log secret trước, để encryption thành phase sau khi có compliance trigger.

#### Confirmed Decisions
- ACK rawdata: QoS0 best-effort — không ràng ACK pointer cho rawdata.
- Quota-full policy: ưu tiên giữ critical — GC xóa rawdata cũ trước.
- Ignition OFF drain: 3 giây trước khi đóng session.
- SD encryption release đầu: hoãn, chưa bắt buộc.

#### Action Items
- [ ] Cập nhật P02: khóa ACK pointer cho critical-only; rawdata best-effort.
- [ ] Cập nhật P02: GC policy ưu tiên giữ critical khi quota đầy.
- [ ] Cập nhật P03: cố định drain timeout ignition OFF = 3 giây.
- [ ] Cập nhật P04: baseline security release đầu không gồm record-level encryption.

#### Impact on Phases
- Phase 02: cập nhật Requirements/Architecture/Unresolved theo ACK policy và quota policy mới.
- Phase 03: cập nhật Implementation Steps + Todo + Unresolved để chốt drain 3 giây.
- Phase 04: cập nhật Security Considerations + Unresolved để hoãn encryption release đầu.
