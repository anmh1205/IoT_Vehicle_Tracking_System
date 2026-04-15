# Prioritized fix queue

## Queue policy
- Critical no-dependency trước.
- Critical có dependency theo chain.
- High chỉ xử lý khi critical đã về 0.
- Medium gom sau để clean-up.

## Queue

| Order | Issue ID | Severity | Dependency | Expected impact |
|---:|---|---|---|---|
| 1 | ISS-002 | Critical | none | Loại lỗi hiển thị sai Figure 4.47 |
| 2 | ISS-003 | Critical | ISS-002 | Xác nhận chain tex/log/asset đã sạch |
| 3 | ISS-004 | Critical | none | Thiết lập nền citation IEEE truy vết được |
| 4 | ISS-007 | High | ISS-004 | Giảm fail layout diện rộng |
| 5 | ISS-008 | High | ISS-007 | Gỡ hotspot overfull cực lớn |
| 6 | ISS-010 | High | none | Đạt gate cover compliance |
| 7 | ISS-005 | High | ISS-004 | Đồng bộ policy source cho hình tự dựng |
| 8 | ISS-001 | High | ISS-005 | Hoàn thiện thiếu nguồn cụ thể Hình 4.17 |
| 9 | ISS-009 | Medium | ISS-007 | Giảm underfull nhiễu đọc |
| 10 | ISS-006 | Medium | ISS-005 | Dọn quote không phục vụ nguồn hình |

## Must-fix before submission
- ISS-002, ISS-003, ISS-004, ISS-007, ISS-008, ISS-010

## Should-fix (if time allows)
- ISS-005, ISS-001, ISS-009, ISS-006

## Unresolved questions
- Nếu timebox gấp: xác nhận có cho phép defer ISS-006 (quote hygiene) sang vòng hậu nộp hay không?
