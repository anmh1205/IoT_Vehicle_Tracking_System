# Planner Summary Report - SD logging firmware ESP32-S3

- Date: 2026-04-04
- Plan dir: `e:/anmh1205/IoT_Vehicle_Tracking_System/plans/260404-1738-sd-logging-firmware-esp32s3/`
- Scope: planning only, no implementation.

## Summary
- Đã tạo plan theo đúng ràng buộc: SDMMC 4-bit, fsync/record, quota+FIFO GC, ignition-only.
- Đã chia 5 phase tuần tự, ưu tiên giảm rủi ro phần cứng và tính bền dữ liệu trước.
- Đã thiết kế đầy đủ flow: storage layout, internet/GPS matrix, replay ACK/backoff/backpressure, session lifecycle, power-loss recovery, mount/unmount, observability, security/privacy.
- Đã nêu rõ hardware risk: netlist có R29 kéo SD-CLK lên V-MCU; cần verify bench vì không phải yêu cầu bắt buộc phổ biến theo docs.

## Phase snapshot
1. P01: SD storage + mount lifecycle + card detect + wiring risk.
2. P02: Queue/replay semantics + ordering/ACK/backoff/backpressure.
3. P03: Ignition-only session + deep sleep/reboot/power-loss recovery.
4. P04: Observability counters/events + privacy/security baseline.
5. P05: Integration rollout + acceptance gates.

## Unresolved questions
- Có bắt buộc record-level encryption ở release đầu không?
- ACK policy cho rawdata (QoS0) có cần pointer độc lập không?
- Drain timeout ignition OFF, replay lag budget, và owner ký nhận risk R29 chưa chốt.
