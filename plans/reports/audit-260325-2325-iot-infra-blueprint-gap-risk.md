# Audit report - iot infra blueprint gap/risk

Date: 2026-03-25 23:25 ICT
Scope: đối chiếu `plans/260325-2126-iot-infra-rapid-bootstrap-blueprint` với codebase hiện tại (ingest stack).

## Evidence snapshots (path:line)
- Hard-code route theo topic suffix: `iot-vehicle-tracking-system/Tracking_MqttBridge/src/index.ts:35-58`.
- Topic families fixed trong constants: `.../src/constants/topics.ts:1-6`.
- Payload contract đang nằm trong code (zod): `.../src/validators/payload.validator.ts:3-50`.
- Rawdata handler gắn chặt VM/VL/DB side-effects: `.../src/handlers/rawdata.handler.ts:77-121`.
- Metrics projection tạo metric name trực tiếp từ key payload: `.../src/infrastructure/victoriametrics.ts:55-59`.
- Logs projection stream cố định `mqtt-bridge`: `.../src/infrastructure/victorialogs.ts:45-49`.
- DB schema đã có nền tảng devices/events/firmware: `.../init/02-devices.sql:9-28`, `.../init/04-event-logs.sql:6-25`, `.../init/05-firmware.sql:42-57`.
- CI hiện tách rời deploy theo service, thiếu gate contract hợp nhất: `.github/workflows/mqtt-bridge-uat.yml:24-43`, `.github/workflows/emqx-uat.yml:10-37`, `.github/workflows/postgresql-uat.yml:10-37`.

## Gap matrix (phase 01..05)
| Phase | Blueprint kỳ vọng | Current codebase | Gap | Priority |
|---|---|---|---|---|
| 01 Contract+DSL | `message-catalog` + versioning + mapping DSL | Contract nằm rải trong TS handlers/validators | Không có canonical contract ngoài code, không có compatibility gate | High |
| 02 Runtime profiles | local/uat/prod profile chuẩn + health matrix | Compose/workflow có, nhưng phân mảnh theo service | Thiếu profile baseline thống nhất + startup/health contract | Med |
| 03 Generate pipelines | Generate EMQX/Bridge/SQL/Obs từ contract | Routing/validator/projection đang hard-code | Chưa có codegen/thin adapter; scale thêm family tốn tay | High |
| 04 Verification+safety | static+replay+perf gate + rollback drill | CI chủ yếu typecheck/build/deploy | Thiếu go/no-go theo contract, thiếu replay parity gate | High |
| 05 Playbook ops | workflow pack + RACI + KPI rollout | Có rules rời, chưa thành playbook ingestion cụ thể | Thiếu owner matrix/sign-off + vận hành chuẩn hóa | Med |

## Risk matrix
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Contract drift giữa topic/payload/storage | High | High | Khóa minimum contract file + compatibility check trước merge |
| Cardinality bùng nổ (metrics/log streams) | High | High | Policy label/stream allowlist; gate reject field volatile |
| Refactor route gây regression runtime | Med | High | Thin-slice 1 family + feature flag + fallback switch cũ |
| CI gate thêm quá nặng bị bypass | Med | Med | 2 tầng gate: fast static bắt buộc, replay theo changed-path |
| Boundary EMQX vs Bridge mơ hồ, trùng trách nhiệm | Med | High | Chốt decision log + owner sign-off trước phase 03 |
| Rollout thiếu rollback rõ | Med | High | Canary + abort condition + runbook rollback 1 trang |

## Quyết định cần chốt (owner + hạn)
1. **SLO ingest**: p95 ingest-to-store, invalid payload rate, sink failure rate.
2. **EMQX vs Bridge boundary**: EMQX làm transform/filter đến mức nào, Bridge giữ enrichment nào.
3. **Multi-tenant strategy**: `tenant_id` optional phase đầu hay mandatory ngay.
4. **Cardinality policy**: allowlist labels/stream-fields; cấm dynamic labels từ payload tự do.
5. **Sign-off owners**: Platform lead, Backend lead, SRE (và Firmware lead nếu đổi envelope).

## Đề xuất next steps (thin-slice 2 tuần)
### Week 1
- D1-D2: chốt minimum contract cho `rawdata` + profile `uat` baseline.
- D3-D4: wire route adapter mỏng cho `rawdata` (flagged), giữ fallback hard-code.
- D5: chạy replay payload mẫu, đo parity VM/VL/DB.

### Week 2
- D1-D2: thêm static contract gate + compatibility gate vào CI bridge.
- D3: thêm replay gate artifact report cho changed paths.
- D4: canary rollout subset device + monitor SLO tạm.
- D5: retro, quyết định mở rộng sang `status` hoặc giữ hardening thêm 1 sprint.

## Kết luận ngắn
Blueprint đúng hướng, nhưng hiện trạng chưa có “contract truth + safety gates”. Cách an toàn: ship thin-slice `rawdata` trước, đo được, rồi mới scale.

## Unresolved questions
- Giá trị số cụ thể cho SLO (p95 latency, error budget) chưa khóa.
- Ai là approver cuối cho boundary EMQX/Bridge chưa khóa.
- Multi-tenant cần bật từ phase 03 hay phase 05 chưa khóa.
