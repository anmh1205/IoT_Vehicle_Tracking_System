# Phase 3: Chuẩn hoá ngôn ngữ và khớp logic flow với chapter

## 1) Context links
- Research:
  - `plans/260318-0453-uml-thesis-chapters-review-and-standardization/research/researcher-02-report.md`
- Mapping file list đã xác nhận:
  - `resources/reports/thesis-chapters/assets/uml/03-chuong-3-giai-phap-phan-cung-hinh-3-1.mmd` ↔ `resources/reports/thesis-chapters/03-chuong-3-giai-phap-phan-cung.md`
  - `resources/reports/thesis-chapters/assets/uml/03-chuong-3-giai-phap-phan-cung-hinh-3-2.mmd` ↔ `resources/reports/thesis-chapters/03-chuong-3-giai-phap-phan-cung.md`
  - `resources/reports/thesis-chapters/assets/uml/04-chuong-3-giai-phap-firmware-hinh-3-8.mmd` ↔ `resources/reports/thesis-chapters/04-chuong-3-giai-phap-firmware.md`
  - `resources/reports/thesis-chapters/assets/uml/05-chuong-3-giai-phap-backend-hinh-3-14a.mmd` ↔ `resources/reports/thesis-chapters/05-chuong-3-giai-phap-backend.md`
  - `resources/reports/thesis-chapters/assets/uml/06-chuong-3-giai-phap-frontend-hinh-3-23.mmd` ↔ `resources/reports/thesis-chapters/06-chuong-3-giai-phap-frontend.md`
  - `resources/reports/thesis-chapters/assets/uml/09-chuong-4-trien-khai-cloud-hinh-4-20.mmd` ↔ `resources/reports/thesis-chapters/09-chuong-4-trien-khai-cloud.md`
  - `resources/reports/thesis-chapters/assets/uml/10-chuong-4-ket-qua-do-luong-hinh-4-20.mmd` ↔ `resources/reports/thesis-chapters/10-chuong-4-ket-qua-do-luong.md`

## 2) Overview
- Mục tiêu: chuẩn hóa văn bản nghiệp vụ tiếng Việt có dấu, giữ nguyên kỹ thuật, đồng thời kiểm tra pre-condition/action/post-condition, lỗi, nhánh ngoại lệ, dữ liệu lưu trữ và actor liên quan.
- Scope: nhóm P0 + P1 trước, P2 cuối.
- Không thêm/sửa hành vi hệ thống, chỉ chuẩn hoá diễn đạt và bám logic ghi trong chapter.

## 3) Key Insights
- Hệ thống có nhiều cụm actor lặp tên khác nhau (`Client`, `Người dùng`, `Người quản trị`) và gây lệch đọc.
- Một số nhãn bị thiếu dấu hoặc trộn sai thuật ngữ kỹ thuật (`đang hoạt động` vs `khả dụng`, `message`, `payload`).
- Cần giữ hai lớp ngôn ngữ: tiếng Việt có dấu + thuật ngữ kỹ thuật không dịch để tránh sai nghĩa.

## 4) Requirements
- Luôn dùng tiếng Việt có dấu cho cụm hành động và mô tả nghiệp vụ.
- Từ khóa kỹ thuật giữ nguyên: `Device`, `Gateway`, `MQTT`, `API`, `OTA`, `JWT`, `Session`, `Dashboard`, `PostgreSQL`, `VictoriaMetrics`, `VictoriaLogs`, `EMQX`, `WebSocket`.
- Cấu trúc nhãn rõ: `Hành động -> Kết quả`, có dấu hiệu điều kiện (nếu/không/thất bại).
- Đối chiếu luồng với chapter để giữ semantic, không được đổi nghiệp vụ.

## 5) Architecture
- Đọc `chapter.md` theo nhóm rồi so `uml` theo cùng nhóm theo ba lớp:
  1. Actor & boundary: đầu vào/sự kiện đúng.
  2. Flow logic: pre-condition, alt/opt/error path, retry/idempotency.
  3. Data/storage consistency: telemetry ↔ PostgreSQL/VictoriaMetrics/VictoriaLogs.
- Với mỗi file được cập nhật, lưu comment chỉnh sửa tóm tắt lý do sửa (đúng-đủ-ngắn).

## 6) Related code files
- **Check only (phase 3):**
  - `resources/reports/thesis-chapters/*.md`
  - `resources/reports/thesis-chapters/assets/uml/*.mmd`
- **Không bổ sung file mới.**

## 7) Implementation Steps
1. Tạo glossary ngắn cho team (thuật ngữ kỹ thuật và đối ứng tiếng Việt) theo research.
2. Chạy rà từng nhóm:
   - P0: `09-*`, `10-*`, `thesis-99-*`, `03-3-1..4`.
   - P1: `04-*`, `05-*`, `06-*`.
   - P2: `01-*`,`02-*`,`07-*`,`08-*`,`14-*`.
3. Kiểm tra nhãn và actor, sửa lần lượt các lỗi sau:
   - thiếu dấu;
   - trộn Anh-Việt sai ngữ cảnh;
   - đổi tên actor không nhất quán.
4. Kiểm chứng flow:
   - lỗi xác thực/timeout/retry/ACK/NACK;
   - lỗi mất kết nối phải có nhánh xử lý.
5. So sánh semantic sau chỉnh với chapter tương ứng (1-1 theo mapping).
6. Tạo nhật ký `reports/planner-report.md` phần cập nhật ngôn ngữ theo file.

## 8) Todo list
- [ ] Tạo dictionary chuẩn hóa (actors, action verbs, storage terms).
- [ ] Chuẩn hoá `03-*` theo chapter 3.
- [ ] Chuẩn hoá `04-*` + `05-*`.
- [ ] Chuẩn hoá `06-*` + `07-*`.
- [ ] Kiểm tra từng file `09-*`, `10-*`, `thesis-99-*` về pre-condition/action/post-condition.
- [ ] Gắn tag status cho file sau khi khớp logic.

## 9) Success Criteria
- 100% label nghiệp vụ trong nhóm đã pass tiếng Việt có dấu (trừ kỹ thuật giữ nguyên).
- Không có actor tên khác nhau cho cùng vai.
- Mỗi luồng có điểm lỗi rõ (thất bại, timeout, offline) nếu chapter yêu cầu.
- Không có sai khớp lớn giữa luồng UML và nội dung text chapter tương ứng.

## 10) Risk Assessment
- Dịch quá tay làm lệch ý nghĩa kỹ thuật nếu không giữ glossary.
- Cập nhật ngôn ngữ đồng loạt có thể làm lỗi diff khó review nếu không track rõ từng file.
- Mismatch chapter mapping gây bỏ sót file `-a`/`thesis-*`.

## 11) Security Considerations
- Không thêm thông tin thực hệ thống hay bí mật vào nhãn.
- Chỉ chỉnh nội bộ văn bản trong file nguồn UML đã công khai.
- Cấm copy nội dung từ tài liệu ngoài khi chuẩn hóa thuật ngữ.

## 12) Next steps
- Phase 4 sửa layout/label overlay chỉ thực hiện khi nhóm đã clear ngôn ngữ và logic cơ bản.
- Giao luồng cho agent chuyên sâu layout với cùng danh sách P0/P1 từ phase 1 để tránh trùng.
- Unresolved questions: cần bảng glossary chính thức cho cả `fleet`, `hành trình`, `chuyến đi` hay để dùng luôn tiếng Anh từ kỹ thuật? Chưa khóa.
