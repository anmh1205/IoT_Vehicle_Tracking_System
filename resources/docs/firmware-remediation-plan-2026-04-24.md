# Firmware Remediation Plan (From 3 Audit Reports)

Date: 2026-04-24  
Input reports:
- `resources/docs/firmware-code-organization-audit-2026-04-24.md`
- `resources/docs/firmware-codebase-audit-2026-04-24.md`
- `resources/docs/firmware-coding-bug-audit-2026-04-24.md`

## Goal
- Đóng toàn bộ issue critical/high.
- Giảm complexity ở 3 điểm nóng: `state_machine.c`, `mqtt_client.c`, `nvs_config.c`.
- Đưa firmware về trạng thái có thể duyệt production sau vòng verify cuối.

## Execution Strategy
- Làm theo phase nhỏ, mỗi phase merge độc lập, không “big-bang refactor”.
- Ưu tiên: **Safety/Security + Correctness** trước, **Organization** sau.
- Mỗi phase có gate pass/fail rõ.

## Phase Plan

### Phase 0 - Backlog hợp nhất + chuẩn chốt scope (0.5 ngày)
Tasks:
1. Gom issue từ 3 report, de-dup, gắn tag: `security`, `correctness`, `organization`.
2. Chốt severity + owner + dependency.
3. Tạo checklist “Definition of Done” cho từng issue.

Deliverables:
- 1 backlog chuẩn hóa (single source).
- 1 ma trận mapping issue -> file/module -> phase.

Gate:
- Không còn item trùng/mâu thuẫn giữa 3 report.

---

### Phase 1 - P0 blockers (2-3 ngày)
Source: chủ yếu từ `firmware-codebase-audit-2026-04-24.md`

Tasks:
1. Gỡ hard-coded credential/token khỏi source/Kconfig/runtime tracked config.
2. Bật TLS verify đúng chuẩn cho MQTT + OTA (không dùng `authmode=0`).
3. Sửa đường init lỗi để trả error cho FSM retry, không reset cứng không kiểm soát.
4. Chặn/cảnh báo truncation payload offline queue theo policy rõ (reject/chunk/compress).

Deliverables:
- Patch security-hardening + config cleanup.
- Checklist secret scan sạch trong tree firmware.

Gate:
- Không còn credential cứng.
- MQTT/OTA handshake fail khi cert sai (đúng kỳ vọng verify).
- Không còn silent truncate payload.

---

### Phase 2 - Correctness bugfix (1.5-2 ngày)
Source: `firmware-coding-bug-audit-2026-04-24.md`

Tasks:
1. Siết prompt detection của MQTT input path (không match mọi `>`).
2. Đổi GNSS UTC timestamp parse sang conversion UTC đúng semantics.
3. Bắt buộc check result `sscanf` + validate range field timestamp.
4. Bỏ logic loại fix hợp lệ khi lat/lon bằng `0.0`.
5. Dọn error-path cleanup leak (`nvs_config`, `modem_at`).

Deliverables:
- Patch correctness + log/assert phù hợp.
- Bộ case verify parser/timestamp/prompt (test hoặc harness).

Gate:
- Các case tái hiện bug cũ pass.
- Không còn regression ở publish GNSS/MQTT path.

---

### Phase 3 - Organization refactor core files (5-8 ngày)
Source: `firmware-code-organization-audit-2026-04-24.md`

Tasks:
1. Tách `state_machine.c` theo domain:
   - `state_machine_core`
   - `network_orchestrator`
   - `sleep_controller`
   - `obd_orchestrator`
   - `ota_orchestrator`
2. Tách `mqtt_client.c`:
   - `mqtt_session`
   - `mqtt_urc_parser`
   - `mqtt_publish`
   - `mqtt_topics`
3. Tách `nvs_config.c`:
   - `app_config_defaults`
   - `config_store_nvs`
   - `ota_context_store_nvs`
4. Giảm shared global state; gom context struct.
5. Loại bỏ/đưa Kconfig cho dead-path (`fake_sleep`, `unused` flow).

Deliverables:
- Refactor patch theo nhiều PR nhỏ, không đổi behavior ngoài ý muốn.
- Sơ đồ module boundary mới.

Gate:
- Build pass.
- Runtime smoke pass.
- `state_machine.c` và `mqtt_client.c` giảm kích thước rõ (mục tiêu < 1200 lines/file cho bước 1).

---

### Phase 4 - Naming + consistency cleanup (1-2 ngày)
Source: `firmware-code-organization-audit-2026-04-24.md`

Tasks:
1. Chuẩn hóa naming `TAG` toàn bộ module.
2. Thay cặp bool trạng thái dễ mâu thuẫn bằng enum trạng thái rõ nghĩa.
3. Chuẩn hóa tên hàm/biến theo guideline chốt.
4. Tách header model lớn để giảm coupling.

Deliverables:
- Naming/style cleanup patch.
- Guideline ngắn trong docs để giữ chuẩn.

Gate:
- Không còn outlier naming đã audit.
- Header include graph giảm coupling rõ.

---

### Phase 5 - Verify + release decision (1-2 ngày)
Tasks:
1. Full build matrix (config chính + validation mode).
2. Smoke test luồng: boot -> network -> mqtt -> ota command -> sleep/wake -> replay queue.
3. Re-audit nhanh theo 3 report cũ và mark resolved.

Deliverables:
- Verification report.
- Bảng “resolved / remaining”.
- Kết luận duyệt production yes/no.

Gate:
- Không còn open issue critical/high.
- Remaining issue chỉ medium/low có waiver rõ.

## Suggested Branching
- `fw/phase1-security-hardening`
- `fw/phase2-correctness-fixes`
- `fw/phase3-architecture-refactor`
- `fw/phase4-naming-consistency`
- `fw/phase5-verify-release-gate`

## Suggested Work Order (strict)
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5

## Unresolved questions
1. Bạn muốn chấp nhận tách refactor lớn thành nhiều PR nhỏ (an toàn) hay gom ít PR lớn (nhanh hơn nhưng rủi ro hơn)?
2. Mức target cho “file size sau refactor” bạn muốn chốt cứng bao nhiêu line/file?
3. Có cần giữ chế độ `TRACKER_FAKE_SLEEP_ENABLED` cho môi trường field-validation không, hay bỏ hẳn khỏi branch production?
