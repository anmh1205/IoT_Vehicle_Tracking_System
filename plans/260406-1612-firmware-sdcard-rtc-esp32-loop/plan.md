---
title: "Firmware SD card + RTC integration plan (ESP32-S3)"
description: "Kế hoạch triển khai SDMMC + DS3231M tối giản, fail-safe, tích hợp loop/state machine."
status: completed
priority: P2
effort: 20h
branch: feature/cicd
tags: [firmware, esp32s3, sd-card, rtc, ds3231m, esp32-loop]
created: 2026-04-06
---

# Mục tiêu
- Tích hợp SDMMC + DS3231M trên ESP32-S3 theo hướng tối giản, fail-safe.
- Bảo đảm log offline bền vững và timestamp có độ tin cậy rõ ràng.
- Tích hợp sạch vào loop/state machine hiện có, không redesign lớn.

# Phạm vi
- Có trong scope: SD mount lifecycle, hardening ghi/đọc SD, driver RTC cơ bản, policy time-validity, replay integration, bench validation, compile/release gates.
- Ngoài scope: alarm/wake RTC nâng cao, encryption record-level, thay đổi format log sang nhị phân.

# Quyết định kiến trúc chính
- Giữ text log + meta hiện tại (KISS/DRY), chỉ siết lifecycle và pointer.
- RTC DS3231M làm clock source có cờ `valid`; không valid thì degrade sang uptime.
- Critical record (status/event/firmware) ưu tiên durability và ack; rawdata best-effort.

# Phases
1. [Phase 01 - SDMMC mount and storage hardening](./phase-01-sdmmc-mount-and-storage-hardening.md)
2. [Phase 02 - RTC DS3231M driver and time validity policy](./phase-02-rtc-ds3231m-driver-and-time-validity-policy.md)
3. [Phase 03 - Offline queue timestamp and replay integration](./phase-03-offline-queue-timestamp-and-replay-integration.md)
4. [Phase 04 - State machine loop integration and failsafe](./phase-04-state-machine-loop-integration-and-failsafe.md)
5. [Phase 05 - Validation bench, compile and release gates](./phase-05-validation-bench-compile-and-release-gates.md)

# Dependency
- Thứ tự bắt buộc: P01 -> P02 -> P03 -> P04 -> P05.
- P03 phụ thuộc policy time-valid từ P02.
- P04 phụ thuộc replay/pointer ổn định từ P03.

# Deliverables
- Bộ kế hoạch chi tiết đủ cho dev junior triển khai từng bước.
- Checklist kiểm thử bench + compile gate theo ESP-IDF trên Windows.
- Tiêu chí pass/fail rõ cho release nội bộ.

# Definition of Done toàn kế hoạch
- SD gắn/rút không crash, mount retry có backoff, dữ liệu critical không mất thứ tự replay.
- Timestamp record có nhãn trusted/untrusted nhất quán.
- Ignition/session stop vẫn fail-safe khi SD/RTC lỗi.
- Build firmware pass và checklist validation đạt.

# Unresolved questions
- Board production có route chân RTC alarm/wake hay không? (đã chốt hoãn scope alarm/wake ở release đầu, chỉ cần xác nhận để phase sau)

## Validation Log

### Session 1 — 2026-04-06
**Trigger:** Initial validation after plan creation (/plan:validate)
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture]** Khi RTC và network time lệch nhau, nguồn giờ nào sẽ là source-of-truth cho release đầu?
   - Options: Network ưu tiên (Recommended) | RTC ưu tiên | Hybrid theo ngưỡng
   - **Answer:** Network ưu tiên (Recommended)
   - **Rationale:** Chốt một nguồn giờ authoritative khi online để giảm drift tích lũy và giữ dữ liệu đồng nhất toàn hệ thống; RTC đóng vai trò fallback.

2. **[Scope]** Bạn muốn xử lý RTC alarm/wake thế nào trong phạm vi release đầu?
   - Options: Hoãn alarm/wake (Recommended) | Polling trạng thái | Làm full alarm
   - **Answer:** Hoãn alarm/wake (Recommended)
   - **Rationale:** Giữ phạm vi release đầu gọn, tránh mở rộng sang routing/power-wake chưa xác thực phần cứng.

3. **[Architecture]** Cờ trusted/untrusted timestamp nên áp dụng ở mức nào?
   - Options: Chỉ nội bộ (Recommended) | Publish MQTT | Cả nội bộ+MQTT
   - **Answer:** Cả nội bộ+MQTT
   - **Rationale:** Tăng khả năng quan sát end-to-end: firmware kiểm soát nội bộ tốt hơn và backend/client vẫn nhìn thấy chất lượng timestamp.

4. **[Tradeoffs]** Khi ignition OFF nhưng còn pending critical ACK, timeout drain trước sleep nên là bao lâu?
   - Options: 3 giây (Recommended) | 10 giây | Stop ngay
   - **Answer:** 3 giây (Recommended)
   - **Rationale:** Cân bằng tiêu thụ pin và độ đầy đủ dữ liệu cuối phiên, không kéo dài awake time quá mức.

#### Confirmed Decisions
- Source-of-truth thời gian: **Network ưu tiên** — RTC chỉ fallback khi offline/nguồn giờ mạng chưa sẵn sàng.
- RTC alarm/wake release đầu: **Hoãn** — không implement trong vòng này.
- Timestamp trust flag: **Cả nội bộ + MQTT** — giữ quan sát xuyên suốt firmware -> cloud.
- Ignition OFF drain timeout: **3 giây** trước sleep.

#### Action Items
- [ ] Cập nhật Phase 02: chốt policy network-first time authority + loại alarm/wake khỏi scope implementation.
- [ ] Cập nhật Phase 03: bổ sung yêu cầu publish trust flag ra MQTT cùng với lưu nội bộ.
- [ ] Cập nhật Phase 04: cố định drain timeout = 3 giây trong transition driving -> sleep.

#### Impact on Phases
- Phase 02: cập nhật Requirements/Architecture để network là nguồn giờ ưu tiên, RTC fallback; giữ alarm/wake ngoài scope release đầu.
- Phase 03: cập nhật Requirements/Architecture để trust flag tồn tại cả nội bộ queue và payload MQTT.
- Phase 04: cập nhật Implementation Steps/Success Criteria để áp timeout drain 3 giây khi ignition OFF còn pending critical ACK.
