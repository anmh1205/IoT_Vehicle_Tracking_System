## Context links
- Input từ Phase 03: asset text/diagram đã normalize
- Research: `./research/researcher-02-asset-pipeline-and-qa.md`
- Docs: `../../docs/code-standards.md`

## Overview
- Priority: P2
- Current status: pending
- Mục tiêu: regenerate artifact liên quan và chặn lỗi bằng QA gates rõ ràng.

## Key Insights
- Parse pass chưa đủ; cần thêm gate readability và consistency.
- Dùng toolchain pin version để tránh layout drift ngẫu nhiên.
- Review source diff + output diff cùng lúc để phát hiện bất thường.

## Requirements
- Functional: render lại artifact cho file đã đổi; chạy checklist QA 3 lớp; đối chiếu đồng bộ thuật ngữ với các `docs/` liên quan trực tiếp.
- Non-functional: diff nhỏ, dễ đọc, rollback theo batch.

## Architecture
- Gate 1: syntax/render success.
- Gate 2: visual readability (crowding, label length, hướng flow).
- Gate 3: thuật ngữ khớp glossary toàn cục.
- Quyết định release: pass cả 3 gate mới qua Phase 05.

## Related code files
- Modify: `.svg` generated tương ứng `.mmd` đã đổi
- Modify: checklist QA trong phạm vi plan (nếu cần ghi chú)
- Create: không bắt buộc
- Delete: không

## Implementation Steps
1. Khóa/pin phiên bản renderer dùng cho toàn batch.
2. Regenerate chỉ các artifact có source đã thay đổi.
3. Soát diff: `.mmd` và output render.
4. Chạy checklist QA 3 lớp cho từng batch.
5. Đánh dấu pass/fail và ghi lý do ngắn gọn.

## Todo list
- [ ] Renderer version được chốt thống nhất.
- [ ] Artifact đã regenerate đúng phạm vi thay đổi.
- [ ] Mỗi batch có kết quả QA pass/fail rõ ràng.

## Success Criteria
- 100% file trong scope render thành công.
- Không còn lỗi readability mức nghiêm trọng.
- Không có drift thuật ngữ so với glossary canonical.

## Risk Assessment
- Risk: version drift làm SVG thay đổi lớn. Mitigation: pin renderer + lockfile, không đổi config giữa chừng.
- Risk: output diff quá lớn khó review. Mitigation: chia batch nhỏ và reject batch có noise cao.
- Risk: reviewer bỏ sót lỗi visual. Mitigation: checklist bắt buộc + review chéo 2 lượt.

## Security Considerations
- Không render/đưa vào artifact dữ liệu chứa thông tin nhạy cảm.
- Bảo đảm output không vô tình lộ host nội bộ, credential, token.

## Next steps
- Chuyển toàn bộ batch pass QA cho Phase 05 final review/handoff.
