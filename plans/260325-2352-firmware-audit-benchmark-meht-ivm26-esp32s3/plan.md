---
title: "Firmware audit plan: benchmark vs MEHT-IVM26-ESP32S3"
description: "Kế hoạch audit firmware hiện tại bằng benchmark đối chiếu, ưu tiên ESP32 telemetry và SD-card storage."
status: pending
priority: P2
effort: 26h
branch: feature/cicd
tags: [firmware, audit, esp32, telemetry, sd-card, benchmark]
created: 2026-03-25
---

# Mục tiêu
- So sánh firmware local với benchmark repo `MEHT-IVM26-ESP32S3` để tìm gap kiến trúc + độ tin cậy.
- Tạo backlog audit ưu tiên rủi ro cho ESP32 + telemetry + SD-card storage.
- Chỉ lập kế hoạch audit, không triển khai code.

# Input chính
- `research/researcher-01-external-benchmark-report.md`
- `research/researcher-02-local-firmware-baseline-report.md`
- `docs/codebase-summary.md`, `docs/system-architecture.md`, `README.md`

# Scope audit (in)
- BLE OBD2 pipeline (scan/connect/discovery/rx-tx/timeout/recovery).
- Telemetry reliability (schema, QoS, retry policy, buffering, flush semantics).
- SD-card/offline storage (integrity, corruption handling, replay policy, store-forward-delete semantics: mất mạng thì lưu đầy đủ bản tin + timestamp hiện tại vào SD; có mạng thì gửi lại và xóa bản lưu trên SD sau khi gửi thành công).
- Security baseline firmware (OTA trust, config surface, topic ACL assumptions).

# Out of scope
- Refactor firmware, thay đổi phần cứng, rewrite protocol.
- Backend/frontend feature development.

# Phase roadmap
| Phase | File | Effort | Output | Status |
|---|---|---:|---|---|
| 01 | `phase-01-firmware-comparison-baseline-and-scope-freeze.md` | 6h | Comparison matrix + scope freeze | pending |
| 02 | `phase-02-audit-design-esp32-telemetry-sd-storage.md` | 8h | Audit design + evidence model | pending |
| 03 | `phase-03-risk-prioritized-audit-execution-backlog.md` | 8h | Risk backlog + execution waves | pending |
| 04 | `phase-04-audit-readiness-gates-and-handover.md` | 4h | Readiness gates + handover checklist | pending |

# Dependency map
- P02 blocked by P01 (cần matrix và scope freeze).
- P03 blocked by P02 (cần tiêu chí audit + evidence model).
- P04 blocked by P03 (cần backlog có ưu tiên rủi ro).

# Deliverables
- 01 plan overview + 04 phase plans.
- Comparison matrix rõ tiêu chí kỹ thuật, maturity, security, vận hành.
- Audit backlog có risk score, owner role, artifact đầu ra, exit criteria.

# Acceptance criteria
- Có ma trận so sánh explicit local vs benchmark, không mơ hồ.
- Có backlog audit theo mức P0/P1/P2 và phụ thuộc rõ ràng.
- Có security controls cần kiểm chứng: OTA, portal/config path, storage integrity.
- Có unresolved questions để khóa scope vòng audit đầu.

# Rủi ro tới hạn
- Benchmark khác domain (industrial vibration vs vehicle tracking) => nguy cơ map sai.
- Thiếu bằng chứng module SD/telemetry local production path => audit trượt phạm vi.
- Chưa rõ contract schema/versioning => khó định nghĩa pass/fail khách quan.

# Unresolved questions
- Firmware production local nằm ở path nào ngoài `resources/references/example/esp32-obd2-meter/`?
- SD-card subsystem local đang implement hay mới concept?
- OTA authenticity hiện dùng TLS-only hay có chữ ký image?

## Validation Log

### Session 1 — 2026-03-25
**Trigger:** Initial plan creation validation trước khi bắt đầu implementation/audit execution.
**Questions asked:** 4

#### Questions & Answers

1. **[Architecture/Scope]** Với repo benchmark khác domain (vibration monitor), bạn muốn dùng nó theo cách nào trong audit này?
   - Options: Chỉ dùng pattern (Recommended) | Dùng làm chuẩn mạnh | Giảm trọng số benchmark
   - **Answer:** Other
   - **Custom input:** chi tham khao, hoc hoi luong, code tinh nang, ...
   - **Rationale:** Chặn rủi ro map sai chức năng OBD2 từ benchmark khác domain; benchmark chỉ để học pattern, không làm chuẩn feature parity.

2. **[Assumptions/Risk]** Nếu chưa xác định được production firmware path local cho SD/telemetry, audit wave đầu nên xử lý thế nào?
   - Options: Gate cứng trước Wave-1 (Recommended) | Audit song song | Tạm khóa SD scope
   - **Answer:** Gate cứng trước Wave-1 (Recommended)
   - **Rationale:** Nếu chưa chốt path/evidence thật, deep audit sẽ tạo false finding và backlog sai ưu tiên.

3. **[Tradeoff/Evidence]** Bạn muốn ưu tiên nguồn evidence nào để chấm pass/fail cho telemetry + SD controls?
   - Options: Runtime + static kết hợp (Recommended) | Ưu tiên static | Ưu tiên runtime
   - **Answer:** Runtime + static kết hợp (Recommended)
   - **Rationale:** Giảm bias một phía; static cho traceability, runtime cho hành vi thực tế và tính tái lập kết quả.

4. **[Security Gate]** Điều kiện go/no-go về security cho vòng audit đầu bạn muốn đặt ở mức nào?
   - Options: P0 security phải có owner+ETA (Recommended) | Cho phép mở nợ kỹ thuật | Chỉ theo dõi không gate
   - **Answer:** P0 security phải có owner+ETA (Recommended)
   - **Rationale:** Ép accountability cho rủi ro nghiêm trọng; tránh trạng thái “biết rủi ro nhưng không ai xử lý”.

#### Confirmed Decisions
- Benchmark policy: Chỉ tham khảo/học pattern, không dùng làm chuẩn chức năng.
- Production-path gate: Bắt buộc chốt local production firmware path trước Wave-1.
- Evidence model: Pass/fail dựa trên runtime + static combined evidence.
- Security gate: P0 security bắt buộc có owner và ETA trước kickoff/closure wave.

#### Action Items
- [ ] Cập nhật Phase 01 để khóa policy “benchmark tham khảo-only”.
- [ ] Cập nhật Phase 02 để bắt buộc combined evidence (runtime + static) trong control pass/fail.
- [ ] Cập nhật Phase 03 để thêm hard gate trước Wave-1 nếu chưa rõ production path.
- [ ] Cập nhật Phase 04 để gate P0 security owner+ETA cho go/no-go.

#### Impact on Phases
- Phase 01: Cố định benchmark usage policy = tham khảo pattern only; thêm guardrail chống feature-parity mapping.
- Phase 02: Chuẩn hóa evidence requirement = runtime + static (bắt buộc cả hai).
- Phase 03: Thêm điều kiện stop/go cho Wave-1 dựa trên production firmware path/evidence availability.
- Phase 04: Siết gate security: không go/no-go nếu P0 chưa có owner+ETA.

### Session 2 — 2026-03-26
**Trigger:** Bổ sung quyết định tiêu chí “gửi thành công” cho SD store-forward-delete.
**Questions asked:** 1

#### Questions & Answers

1. **[Telemetry/Delivery Semantics]** “Gửi thành công” dùng tiêu chí nào: MQTT PUBACK hay end-to-end ingest ACK?
   - Options: MQTT PUBACK | End-to-end ingest ACK | Khác
   - **Answer:** MQTT PUBACK
   - **Rationale:** Giảm độ phức tạp firmware vòng đầu, giữ tiêu chí xác nhận ở transport layer để chốt delete-after-success rõ ràng.

#### Confirmed Decisions
- Delivery success criterion: MQTT PUBACK.

#### Action Items
- [ ] Cập nhật Phase 02 control định nghĩa success = MQTT PUBACK cho delete-after-success.
- [ ] Cập nhật Phase 03 backlog item tương ứng để kiểm chứng PUBACK-gated deletion.

#### Impact on Phases
- Phase 02: Chuẩn hóa pass/fail SD replay-delete theo ACK = MQTT PUBACK.
- Phase 03: Bổ sung backlog item kiểm chứng không xóa bản SD khi chưa có PUBACK.

### Session 3 — 2026-03-26
**Trigger:** Chốt mức ACK mục tiêu nghiệp vụ cho vòng audit đầu.
**Questions asked:** 1

#### Questions & Answers

1. **[Scope/Delivery Guarantee]** Mục tiêu xác nhận gửi thành công ở vòng audit đầu là đến broker hay đến backend ingest?
   - Options: Đến broker | Đến backend ingest | Khác
   - **Answer:** Đến broker
   - **Rationale:** Phù hợp mục tiêu firmware vòng đầu, giữ scope gọn và tránh tăng phụ thuộc vào ACK nghiệp vụ cloud.

#### Confirmed Decisions
- Delivery target cho vòng audit hiện tại: broker-level success là đủ.
- Delete-after-success tiếp tục dùng tiêu chí MQTT PUBACK.

#### Action Items
- [ ] Cập nhật Phase 02 ghi rõ broker-level ACK là tiêu chí chính thức cho vòng audit đầu.
- [ ] Cập nhật Phase 04 readiness gate theo broker-level guarantee.

#### Impact on Phases
- Phase 02: Khóa scope pass/fail ở broker-level ACK (PUBACK), chưa yêu cầu ingest ACK.
- Phase 04: Gate/closure đánh giá theo broker-delivery guarantee cho vòng hiện tại.
