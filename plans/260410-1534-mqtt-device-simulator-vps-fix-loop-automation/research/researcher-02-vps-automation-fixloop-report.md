# Research Report: VPS fix-loop automation for simulator publish -> verify -> diagnose/fix -> retest

**Timestamp:** 2026-04-10 15:34 Asia/Saigon

## Mục tiêu
Thiết kế vòng lặp local agent: publish/simulate -> kiểm tra VPS -> chẩn đoán/lập hypothesis -> patch tối thiểu -> retest -> thoát an toàn.

## Executive Summary
Mô hình phù hợp nhất là một pipeline nhỏ, stateful, có guardrail rõ ràng: trigger simulator, health-check dịch vụ trọng yếu trên VPS, thu log/metrics có cấu trúc, phân loại lỗi theo lớp (network/auth/runtime/data-flow), rồi chỉ cho phép patch tối thiểu trong scope hẹp trước khi retest. Không nên để agent tự do SSH và chạy lệnh tùy ý; phải có allowlist lệnh, timeout cứng, stop conditions, và cơ chế rollback/revert rõ ràng.

Repo hiện đã có nền tảng tốt cho automation: MQTT là ingest canonical, Docker Compose là runtime model chính, health endpoints/backend metrics đã chuẩn hóa, CI parity đã được mô tả trong README, và docs nhấn mạnh guardrail vận hành. Nên bám vào các chuẩn này thay vì tạo cơ chế mới song song.

## Research Methodology
- Sources consulted: 3 internal docs
- Date range: 2026-03-24 to 2026-04-10
- Key search terms used: simulator publish, VPS verification, health checks, MQTT canonical ingest, Docker Compose parity, safe SSH automation, rollback, bounded retries, observability
- Scope boundaries: chỉ nghiên cứu quy trình và guardrail; không implement code; không mở rộng sang design mới ngoài stack hiện có.

## Key Findings

### 1) Automation phases đề xuất
1. **Trigger**
   - Kích hoạt simulator/publisher với một `run_id` duy nhất.
   - Ghi input snapshot: device_id, topic, payload hash, expected outcome.
2. **Verify on VPS**
   - Check service chain theo thứ tự: EMQX -> MQTT Bridge -> Backend -> DB -> metrics/log stack.
   - Ưu tiên health endpoints và container state trước khi đọc log sâu.
3. **Collect evidence**
   - Thu: container status, recent logs, health response, MQTT delivery evidence, DB write evidence, metrics deltas.
4. **Classify error**
   - Network/connectivity
   - Auth/secret/env
   - Broker/topic/ACL
   - Bridge transform/pipeline
   - Backend runtime/API
   - DB/storage/persistence
   - Replay/consistency/state-machine
5. **Fix-loop**
   - Hypothesis ngắn, patch tối thiểu, only-one-surface change.
   - Retest cùng một `run_id` hoặc replay case gần nhất.
6. **Exit**
   - Dừng khi pass criteria đạt, hoặc khi vượt stop conditions.

### 2) Guardrail an toàn cho VPS
- **Allowlist lệnh**: chỉ cho phép read-only/diagnostic commands và deploy-safe commands đã định nghĩa trước.
- **Cấm destructive ops**: tuyệt đối không `rm`, `reset --hard`, `docker system prune`, kill hàng loạt, restart toàn bộ nếu chưa có xác nhận.
- **Timeout cứng**: mỗi lệnh, mỗi phase, và cả loop tổng phải có timeout.
- **Bounded retries**: retry số lần hữu hạn; không auto-loop vô hạn.
- **Stop conditions**:
  - cùng lỗi lặp lại N lần
  - service critical down sau can thiệp
  - log chỉ ra dữ liệu/secret nhạy cảm
  - phát hiện trạng thái không nhất quán giữa published state và runtime state
- **Rollback**: revert compose/env/config về snapshot trước vòng lặp nếu patch làm xấu trạng thái.
- **Human gate**: mọi thao tác ngoài allowlist hoặc có khả năng ảnh hưởng dữ liệu phải yêu cầu xác nhận.

### 3) Cơ chế fix-loop nên dùng
- **Triage**: xác định lớp lỗi trước, không nhảy vào sửa code ngay.
- **Hypothesis**: viết giả thuyết 1 câu, gắn bằng chứng.
- **Minimal patch scope**: sửa 1 file/1 config/1 workflow nếu đủ.
- **Retest same path**: test lại đúng đường đi vừa fail, rồi mới mở rộng.
- **Exit criteria**: pass health + evidence + no regression trong các checkpoint chính.

### 4) Test matrix và checkpoint đo được
- **Connectivity**: broker reachable, bridge subscribes, backend health OK.
- **Delivery ratio**: số message nhận / số message publish, theo topic.
- **Latency**: publish-to-ack, publish-to-store, publish-to-UI refresh.
- **Error rate**: parse error, auth failure, DB write failure, timeout.
- **Replay consistency**: cùng input -> cùng output/state; hashes/sequence match.
- **Service readiness**: EMQX, bridge, backend, DB, metrics/logs all healthy.

### 5) Artifact/reporting strategy
Mỗi vòng loop nên sinh một bundle tối thiểu:
- `run_id`
- input payload snapshot
- command transcript
- health snapshot
- logs excerpt có timestamp
- metrics snapshot trước/sau
- classification + hypothesis
- patch summary
- retest result
- final status: pass/fail/blocked

### 6) Tích hợp với workflow hiện có
- Bám Docker Compose + health checks thay vì ad hoc shell scripts.
- Dùng CI parity làm chuẩn pass/fail, tránh tạo logic khác với workflow runtime.
- MQTT là ingest canonical cho cả simulator và device thật; loop verify phải kiểm tra đúng đường canonical này.
- Nên gắn loop vào các điểm đã có sẵn: backend health, ws health, metrics, EMQX dashboard/ports, container logs.

## Comparative Analysis
**Best fit**: một orchestrator script/agent nhỏ với state machine rõ ràng.
- Pros: dễ audit, dễ rollback, dễ dừng an toàn.
- Cons: ít linh hoạt hơn agent tự do, nhưng phù hợp YAGNI/KISS.

**Avoid**: agent tự quyết định lệnh SSH tùy ý hoặc loop mở không giới hạn.
- Lý do: khó truy vết, rủi ro destructive, khó tái lập lỗi.

## Implementation Recommendations
### Quick Start Guide
1. Xác định `run_id` cho mỗi vòng.
2. Publish simulator payload đã hash.
3. Chạy allowlisted VPS checks theo thứ tự dịch vụ.
4. Ghi log/metrics snapshot.
5. Phân loại lỗi, tạo hypothesis.
6. Patch tối thiểu rồi retest.
7. Dừng khi đạt pass criteria hoặc hit stop condition.

### Common Pitfalls
- Kiểm tra log trước health -> dễ chẩn đoán sai.
- Retry vô hạn -> che giấu lỗi thật.
- Patch nhiều chỗ một lúc -> không biết nguyên nhân thật.
- Không lưu artifact -> không truy vết được vòng trước.

## Resources & References
### Internal docs consulted
- `README.md`
- `docs/system-architecture.md`
- `docs/code-standards.md`

### Relevant anchors
- MQTT canonical ingest and Docker Compose runtime model trong README.
- Health/metrics surfaces trong README.
- Guardrail, rollback/race mitigation, CI parity trong docs.

## Appendices
### A. Glossary
- **Fix-loop**: vòng triage -> patch -> retest.
- **Guardrail**: rào an toàn chặn lệnh/ngữ cảnh nguy hiểm.
- **Replay consistency**: input lặp lại cho output/states lặp lại.

### B. Exit Conditions
- Health all green.
- Delivery ratio đạt ngưỡng mục tiêu.
- Latency/error rate nằm trong budget.
- Không còn lỗi tái diễn sau retest.

## Unresolved Questions
1. Ngưỡng cụ thể cho delivery ratio/latency/error rate là bao nhiêu cho môi trường UAT hiện tại?
2. Allowlist lệnh VPS nên là tập cố định hay sinh theo service role?
3. Có cần snapshot/restore DB cho mỗi vòng loop hay chỉ dùng read-only verification?
4. Loop có chạy qua GitHub Actions/CI hay chỉ local agent + SSH VPS?
