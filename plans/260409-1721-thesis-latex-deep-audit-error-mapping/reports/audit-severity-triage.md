# Severity triage — thesis LaTeX audit

## Rubric áp dụng
- **Critical**: làm mất tính hợp lệ học thuật hoặc lỗi asset/render sai nội dung chính.
- **High**: ảnh hưởng trực tiếp chất lượng nộp (layout fail gate, source policy sai, cover lệch chuẩn).
- **Medium**: gây nhiễu đọc/review, chưa chặn nộp ngay.
- **Low**: style nhỏ.

## Triage table

| Issue ID | Severity | Why |
|---|---|---|
| ISS-002 | Critical | SVG Figure 4.47 chứa literal `Syntax error in text` -> nội dung hình sai trực tiếp |
| ISS-003 | Critical | Chain tex/log/asset xác nhận lỗi figure thực sự được nạp vào bản biên dịch |
| ISS-004 | Critical | Không có framework citation IEEE truy vết (`\cite`/`\parencite`/`\textcite`) |
| ISS-007 | High | Overfull >5pt xuất hiện diện rộng (250 case) vi phạm gate layout |
| ISS-008 | High | Có 24 case overfull >=500pt, nguy cơ vỡ bố cục nghiêm trọng |
| ISS-010 | High | Cover chưa khớp gần như tuyệt đối template chuẩn |
| ISS-005 | High | 87 dòng `Nguồn:` conflict policy self-authored figures không ghi nguồn |
| ISS-001 | High | Hình 4.17 thiếu nguồn liền kề theo checklist |
| ISS-009 | Medium | Underfull 31 case, cần xử lý sau khi dọn critical/high |
| ISS-006 | Medium | Quote block dùng cho ghi chú/lưu ý gây nhiễu phân tích nguồn hình |

## Priority bands
- **Band A (fix trước):** ISS-002, ISS-003, ISS-004
- **Band B (fix ngay sau A):** ISS-007, ISS-008, ISS-010, ISS-005, ISS-001
- **Band C (ổn định hóa):** ISS-009, ISS-006

## Unresolved questions
- ISS-005 cần chốt mức áp dụng policy: bỏ 100% `Nguồn:` cho hình tự dựng hay giữ ngoại lệ cho hình “dựa trên dữ liệu đo”.
