# Context: Chuyển nội dung slide IoT vào template Phenikaa

## Mục tiêu
Chuyển nội dung đồ án IoT (file nguồn) vào template Phenikaa đẹp (file đích), giữ nguyên thiết kế template Phenikaa.

---

## Hai file đang mở trong PowerPoint

| # | Tên file | Slide | Vai trò |
|---|---|---|---|
| index 1 | `Bao_cao_IoT_Phenikaa.pptx` | 19 slide (hiện tại) | **File đích** — template Phenikaa 16:9 (1440×810pt), font Calibri |
| index 2 | `Template_AML.pptx` | 37 slide | **File nguồn** — nội dung IoT, 4:3 (720×540pt), font Times New Roman |

Cả hai file ở: `C:\Users\Admin\Documents\`

---

## Trạng thái file đích (19 slide hiện tại)

| Slide | Nội dung | Tình trạng |
|---|---|---|
| 1 | Trống (bìa lót) | ✅ OK |
| 2 | Bìa IoT — Lê Trọng An, 21010389, K15 | ✅ OK |
| 3 | Mục lục IoT (6 mục) | ✅ OK |
| 4 | Divider 01 — TỔNG QUAN | ✅ OK |
| 5 | Bối cảnh & đặt vấn đề (2 cột card) | ✅ OK — cần review font/màu |
| 6 | Divider 02 — PHÂN TÍCH VẤN ĐỀ KỸ THUẬT | ⚠️ Chữ divider đang wrap 3 dòng, cần chỉnh textbox |
| 7 | Khảo sát thiết bị (3 card thiết bị + ảnh) | ⚠️ Cỡ chữ nội dung quá nhỏ, cần tăng |
| 8 | Tổng kết khảo sát → đề tài | ⚠️ Thân trống, chờ sơ đồ/nội dung |
| 9 | Chỉ tiêu thiết kế chính (bảng 5 hàng) | ⚠️ Cần review font/cỡ chữ |
| 10 | Các vấn đề kỹ thuật (bảng 5 hàng) | ⚠️ Cần review font/cỡ chữ |
| 11 | Divider 03 — CÁC GIẢI PHÁP THIẾT KẾ | ⚠️ Chữ divider có thể wrap |
| 12 | Nguyên lý hoạt động (5 bước) | ⚠️ Cần review bố cục |
| 13 | Ràng buộc kỹ thuật (4 card) | ⚠️ Cần review bố cục |
| 14 | ❌ "8. PHẢN HỒI..." — nội dung dao động cũ | ❌ Cần xóa/thay |
| 15 | ❌ "9. BÁO CÁO TÀI CHÍNH" — dao động cũ | ❌ Cần xóa/thay |
| 16 | ❌ Bảng chi phí dao động | ❌ Cần xóa/thay |
| 17 | ❌ Divider "10 BÁO CÁO KẾ HOẠCH" — dao động cũ | ❌ Cần xóa/thay |
| 18 | ❌ Bảng thành viên (Bách, Mạnh) — dao động cũ | ❌ Cần xóa/thay |
| 19 | ❌ Trống, số 97 | ❌ Cần xóa |

---

## Nội dung IoT còn thiếu (chưa có slide nào)

Từ file nguồn Template_AML.pptx, các slide sau chưa được dựng vào file đích:

**Mục 3 — Các giải pháp thiết kế (slide 28–35 nguồn):**
- Lựa chọn 1/7: Thu dữ liệu OBD-II (bảng ma trận)
- Lựa chọn 2/7: Giám sát khi xe đỗ (bảng ma trận)
- Lựa chọn 3/7: Truyền dữ liệu + định vị (bảng ma trận)
- Lựa chọn 4/7: MCU trung tâm (bảng ma trận)
- Lựa chọn 5/7: Phần mềm nhúng (bảng ma trận)
- Lựa chọn 6/7: Giao thức truyền bản tin (bảng ma trận)
- Lựa chọn 7/7: Tổ chức máy chủ (bảng ma trận)
- Kiến trúc tổng thể hệ thống (sơ đồ)

**Mục 4 — Triển khai giải pháp và kết quả (slide 10–21 nguồn):**
- Sơ đồ khối chức năng phần cứng
- PCB & nguyên mẫu (ảnh)
- Nguyên mẫu hoàn chỉnh (ảnh)
- Kết quả kiểm thử năng lượng (bảng)
- Firmware — các chức năng chính (bảng)
- Kiến trúc máy chủ 3 lớp
- Kết quả kiểm thử hệ thống (bảng)
- Khả năng lưu trữ dữ liệu (bảng)
- Giao diện bản đồ theo dõi (ảnh)
- Giao diện chi tiết thiết bị (ảnh)
- Giao diện hàng đợi cảnh báo (ảnh)
- Đối chiếu với mục tiêu đồ án (bảng ✅)

**Mục 5 — Đánh giá và khuyến nghị (slide 22–24 nguồn):**
- Đánh giá kinh tế (bảng chi phí)
- Rủi ro kỹ thuật & biện pháp (bảng)
- Đề xuất hướng phát triển (danh sách)

**Mục 6 — Kết luận (slide 25 nguồn):**
- Kết luận (5 dòng ✅)

**Slide kết thúc + phụ lục (slide 26–37 nguồn):**
- Thank You
- Phụ lục: Kiến trúc tổng thể (ẩn)
- Phụ lục: Lựa chọn 5/7 Phần mềm nhúng (ẩn)
- Phụ lục: Lựa chọn 4/7 MCU (ẩn)
- Phụ lục: Lựa chọn 3/7 Truyền dữ liệu (ẩn)
- Phụ lục: Lựa chọn 2/7 Giám sát đỗ (ẩn)
- Phụ lục: Lựa chọn 1/7 OBD-II (ẩn)
- Phụ lục: Giao thức MQTT (ẩn)
- Phụ lục: Tổ chức máy chủ (ẩn)
- Phụ lục: Ma trận đánh giá chi tiết (ẩn)
- Phụ lục: Nguồn phân cấp (ẩn)

---

## Quy tắc đã thống nhất

1. **Không đổi cỡ chữ template** (tiêu đề section, nhãn mục) — chỉ kéo rộng/dịch chuyển textbox
2. **Không scale cứng nhắc** — tự cân đối bố cục theo không gian 16:9
3. **Ảnh nhúng** không copy được giữa 2 file riêng — để placeholder ghi rõ tên ảnh
4. **Font nội dung** dùng Times New Roman (theo gốc), màu sắc theo gốc
5. **Divider** dùng soft return `\v` để ngắt dòng trong cùng 1 paragraph

---

## Thông tin kỹ thuật

- Slide đích: 1440×810pt (16:9)
- Slide nguồn: 720×540pt (4:3)
- Chrome Phenikaa mỗi slide nội dung gồm: `Freeform 2` (nền), TextBox tiêu đề section (Cabin Bold 65pt #002060), TextBox nhãn mục (Times New Roman 18pt bold #000000), số trang (nhỏ góc dưới)
- Divider: `TextBox 3` (số thứ tự cam), `TextBox 4` (tên mục, Cabin Bold 121pt #FFFFFF)

---

## Nguồn nội dung IoT (Template_AML.pptx — 37 slide)

| Slide nguồn | Nội dung |
|---|---|
| 1 | Bìa |
| 2 | Mục lục |
| 3 | Bối cảnh cho thuê xe tự lái |
| 4 | Khảo sát thiết bị thị trường |
| 5 | Tổng kết khảo sát → đề tài |
| 6 | Chỉ tiêu thiết kế chính (bảng) |
| 7 | Các vấn đề kỹ thuật (bảng) |
| 8 | Nguyên lý hoạt động (5 bước) |
| 9 | Ràng buộc kỹ thuật |
| 10 | Sơ đồ khối phần cứng |
| 11 | PCB & nguyên mẫu |
| 12 | Nguyên mẫu hoàn chỉnh |
| 13 | Kết quả kiểm thử năng lượng |
| 14 | Firmware — chức năng chính |
| 15 | Kiến trúc máy chủ 3 lớp |
| 16 | Kết quả kiểm thử hệ thống |
| 17 | Khả năng lưu trữ dữ liệu |
| 18 | Giao diện bản đồ |
| 19 | Giao diện chi tiết thiết bị |
| 20 | Giao diện hàng đợi cảnh báo |
| 21 | Đối chiếu mục tiêu đồ án |
| 22 | Đánh giá kinh tế |
| 23 | Rủi ro kỹ thuật |
| 24 | Đề xuất phát triển |
| 25 | Kết luận |
| 26 | Thank You |
| 27 (ẩn) | Phụ lục: Nguồn phân cấp |
| 28 | Kiến trúc tổng thể |
| 29 | Lựa chọn 5/7: Phần mềm nhúng |
| 30 | Lựa chọn 4/7: MCU |
| 31 | Lựa chọn 3/7: Truyền dữ liệu |
| 32 | Lựa chọn 2/7: Giám sát đỗ |
| 33 | Lựa chọn 1/7: OBD-II |
| 34 | Lựa chọn 6/7: Giao thức MQTT |
| 35 | Lựa chọn 7/7: Tổ chức máy chủ |
| 36 | Phụ lục: Ma trận đánh giá |
| 37 | Phụ lục: MQTT Topic & Geofence |
