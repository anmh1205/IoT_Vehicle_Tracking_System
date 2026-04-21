# 1. Context links
- Plan tổng: `./plan.md`
- Phase trước: `./phase-03-data-and-state-refactor.md`
- Scout: `./scout/scout-01-firmware-fe-scope.md`
- Current analysis: `./research/researcher-01-current-fe-firmware-analysis.md`
- IVM26 pattern: `./research/researcher-02-ivm26-firmware-patterns.md`

# 2. Overview (date, description, priority, implementation status, review status)
- Date: 2026-04-20
- Description: Áp dụng progressive disclosure để giảm tải nhận thức, đồng thời tái chia trách nhiệm component rõ ràng.
- Priority: P1
- Implementation status: pending
- Review status: pending

# 3. Key Insights
- Deployment history hiện quá nhiều metadata trong 1 card.
- Deploy dialog hiện là “mega component” chứa nhiều sub-flow.
- User thường cần signal nhanh trước; chi tiết sâu chỉ cần khi debug sự cố.

# 4. Requirements
- Functional:
  - History mặc định chỉ hiển thị signal lõi: version, scope, status, updated time, error summary ngắn.
  - Chi tiết sâu (boot/partition/seq/job meta) chuyển vào expandable region hoặc detail panel.
  - Deploy dialog tách 2 bước nhận thức: chọn đối tượng -> review + confirm.
- Non-functional:
  - KISS: giảm số thông tin đồng thời trên screen.
  - DRY: dùng shared render utility cho badges/timestamps/status labels.
  - YAGNI: chưa xây workflow wizard nhiều bước nếu 2-step đủ.

# 5. Architecture
- Component boundary target:
  - `firmware-deployment-history.tsx`: summary list + detail drawer là pattern mặc định cho metadata sâu.

<!-- Updated: Validation Session 1 - history detail drawer -->
  - `firmware-deploy-dialog.tsx`: split internal sections hoặc subcomponents nhỏ.
  - `firmware-summary-cards.tsx`: chỉ giữ KPI cấp cao, không gánh context debug.
- IA behavior:
  - Primary signal first.
  - Debug metadata on demand.
- So sánh IVM26:
  - Áp dụng disclosure qua dialog và list giản lược.
  - Không áp dụng cách hiển thị status thiếu chuẩn hóa ngữ nghĩa.

# 6. Related code files (modify/create/delete)
- Modify:
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-deployment-history.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-deploy-dialog.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-summary-cards.tsx`
  - `iot-vehicle-tracking-system-cloud/Tracking_Frontend/src/app/dashboard/firmware/components/firmware-utils.ts`
- Create (optional, khi cần tách file >200 lines):
  - `.../firmware/components/deploy-dialog-device-selection.tsx`
  - `.../firmware/components/deploy-dialog-review-confirm.tsx`
- Delete:
  - None.

# 7. Implementation Steps
1. Định nghĩa bộ fields “always visible” cho history và deploy review.
2. Thiết kế disclosure interaction: expand inline hoặc open detail panel.
3. Tách deploy dialog theo 2 bước nhận thức, giữ API submit cuối không đổi.
4. Chuẩn hóa status/badge copy bằng utility chung.
5. Kiểm tra accessibility: focus order, keyboard expand/collapse, aria labels.

# 8. Todo list
- [ ] Chốt metadata tối thiểu hiển thị mặc định.
- [ ] Chốt interaction pattern cho detail-on-demand.
- [ ] Tách component quá dài để giữ maintainability.
- [ ] Rà lại aria labels và keyboard flows.

# 9. Success Criteria
- User đọc history nhanh hơn, không bị ngợp metadata.
- Deploy dialog giảm lỗi chọn nhầm scope/target.
- Components nhỏ hơn, ranh giới trách nhiệm rõ.

# 10. Risk Assessment
- Risk: Ẩn quá nhiều thông tin làm khó debug sự cố tức thời.
  - Mitigation: luôn có đường mở chi tiết 1 click.
- Risk: Split component gây props drilling nhiều.
  - Mitigation: chuẩn hóa prop contracts, chỉ truyền dữ liệu cần thiết.

# 11. Security Considerations
- Metadata chi tiết chỉ hiển thị cho role được phép thao tác firmware.
- Cảnh báo rõ ở bước confirm deploy để tránh thao tác sai diện rộng.

# 12. Next steps
- Sang Phase 05 để lập kế hoạch migration an toàn + kiểm thử đầy đủ.

## Backlog (P0/P1/P2)
- P0: Chốt disclosure model cho history/deploy.
- P1: Tách deploy dialog thành sub-boundaries.
- P2: Rà microcopy/status chips để tăng clarity.

## Unresolved questions
- Detail metadata nên mở inline hay modal/drawer để ít nhiễu nhất?
- Có cần hiển thị thêm “impact estimate” trước confirm deploy không?