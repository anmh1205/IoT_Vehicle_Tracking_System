# Context Links
- phase-02-canonical-contract-and-guardrails.md
- Tracking_PostgreSQL/scripts/uat-runtime-schema-sync.sql

# Overview
- Priority: P1
- Current status: pending
- Brief description: Chuẩn hóa DB/session/query để day-boundary UTC+7 đúng, không làm sai absolute event time.

# Key Insights
- TIMESTAMPTZ đã có, nhưng validation đã chốt **shift toàn bộ stored timestamps lịch sử** thay vì chỉ đổi query semantics.
- Điểm vỡ không còn chỉ ở filter/group theo ngày; physical conversion sai sẽ làm lệch absolute event time trên toàn hệ thống.

<!-- Updated: Validation Session 1 - historical timestamp shift -->
- Validation Session 1: Phase này phải xử lý conversion lịch sử, verification theo batch, và rollback restore-point rõ ràng.

# Requirements
- Functional requirements
  - Chuẩn hóa query pattern cho today/week/month theo Asia/Ho_Chi_Minh.
  - Kiểm tra và sửa cột timestamp không timezone nếu có trong critical tables.
- Non-functional requirements
  - Idempotent SQL patches.
  - Không downtime kéo dài.

# Architecture
- System design
  - Storage: giữ UTC-aware.
  - Query boundary: tính UTC range từ local day boundary.
- Component interactions
  - Backend/report SQL dùng helper/query snippet thống nhất.
- Data flow
  - Raw event -> TIMESTAMPTZ -> business-window query in UTC+7 semantics.

# Related Code Files
- List of files to modify
  - SQL scripts/query modules liên quan thống kê/report.
- List of files to create
  - SQL checklist + verification query set.
- List of files to delete
  - None.

# Implementation Steps
1. Inventory cột thời gian và kiểu dữ liệu ở bảng core.
2. Sửa query templates: date_trunc/filter/group rõ timezone.
3. Thêm verification SQL so sánh trước/sau cho mốc cận nửa đêm.
4. Chuẩn hóa DB session timezone policy theo môi trường.

# Todo List
- [ ] DB timezone matrix hoàn tất.
- [ ] Query templates chuẩn hóa.
- [ ] Verification SQL pass.

# Success Criteria
- Report/KPI theo ngày khớp với business day UTC+7.

# Risk Assessment
- Potential issues: chuyển kiểu timestamp có thể lock table.
- Mitigation strategies: off-peak run, backup-first, phased table rollout.

# Security Considerations
- Auth/authorization: dùng tài khoản DB quyền tối thiểu.
- Data protection: backup encrypted/permission-scoped.

# Next Steps
- Dependencies: Phase 02.
- Follow-up tasks: Phase 08, Phase 09.