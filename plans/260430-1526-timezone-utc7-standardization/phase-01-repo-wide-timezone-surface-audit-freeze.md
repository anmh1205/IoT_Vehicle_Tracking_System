# Context Links
- research/researcher-01-app-timezone-audit.md
- research/researcher-02-device-ingestion-timezone-audit.md
- README.md
- docs/codebase-summary.md
- docs/system-architecture.md

# Overview
- Priority: P1
- Current status: pending
- Brief description: Chốt inventory timezone surfaces toàn repo, freeze baseline trước khi sửa đồng loạt.

# Key Insights
- Có nền TIMESTAMPTZ ở DB nhưng app/render/scheduler vẫn mixed.
- Device + MQTT path có risk parse ambiguous/local-naive.
- Ops đã có chỗ set TZ=Asia/Ho_Chi_Minh nhưng chưa chứng minh đồng nhất toàn stack.

# Requirements
- Functional requirements
  - Liệt kê đầy đủ surface xử lý thời gian: backend, frontend, firmware, bridge, cron, SQL, dashboards, exports.
  - Phân loại từng surface: storage, transport, compute, display, scheduling.
- Non-functional requirements
  - Không bỏ sót domain critical path (ingest, report, analytics).
  - Output audit phải dùng được cho execution checklist.

# Architecture
- System design
  - One-source timezone inventory matrix (file/function/field/behavior/risk/owner).
- Component interactions
  - Map từ device timestamp -> MQTT -> bridge -> DB -> backend -> frontend/report.
- Data flow
  - Đánh dấu điểm convert timezone và điểm có thể double-convert.

# Related Code Files
- List of files to modify
  - None (planning phase).
- List of files to create
  - plans/.../reports/planner-260430-1548-timezone-surface-matrix.md
- List of files to delete
  - None.

# Implementation Steps
1. Quét toàn repo theo pattern time APIs/SQL timezone/cron configs.
2. Tạo matrix: surface, current behavior, target behavior, risk severity.
3. Chỉ ra anti-pattern cần cấm (naive datetime string, implicit local Date parse).
4. Chốt baseline snapshot cho rollback diff.

# Todo List
- [ ] Inventory complete theo 7 domains yêu cầu user.
- [ ] Risk-ranked matrix hoàn tất.
- [ ] Freeze checklist phê duyệt.

# Success Criteria
- Không còn “unknown timezone surface”.
- Có danh sách sửa cụ thể theo file + ưu tiên.

# Risk Assessment
- Potential issues: Bỏ sót scripts/export jobs chạy ngoài app runtime.
- Mitigation strategies: include scripts/docs/CI and compose manifests trong audit scope.

# Security Considerations
- Auth/authorization: N/A trực tiếp.
- Data protection: Không log lộ dữ liệu nhạy cảm khi audit payload samples.

# Next Steps
- Dependencies: none.
- Follow-up tasks: Phase 02.