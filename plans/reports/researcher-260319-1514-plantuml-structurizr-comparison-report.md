# Research report: So sánh PlantUML (+C4-PlantUML) vs Structurizr DSL cho thesis IoT
Ngày: 2026-03-19 15:14 (Asia/Saigon)
Work context: E:/anmh1205/IoT_Vehicle_Tracking_System

## Mục tiêu nghiên cứu
1. Đánh giá PlantUML cho sequence/use-case/activity/class + C4 model.
2. Đánh giá Structurizr DSL cho model-as-code, workspace, và view consistency.
3. So sánh 2 công cụ theo 8+ tiêu chí.
4. Đưa phương án combo và rủi ro vận hành cho bộ hình thesis IoT.

## Kết luận nhanh
- **PlantUML**: rất mạnh cho vẽ chi tiết hành vi (sequence/activity) và class, cú pháp nhanh, dễ tích hợp trong repo/docs. C4-PlantUML bổ sung macro giúp vẽ C4 trong cùng hệ sinh thái.
- **Structurizr DSL**: mạnh cho kiến trúc C-level (system/container/component/deployment/dynamic) theo hướng **model-as-code**, có validation/inspection + view/style governance, tốt cho consistency đội lớn.
- **Khuyến nghị**: **Structurizr DSL làm nguồn kiến trúc chuẩn hóa nền tảng**, xuất C4 diagrams; dùng **PlantUML cho các luồng hành vi chi tiết** (backend/cloud/mobile) và class/detail notes.

## 1) Đánh giá PlantUML (+ C4-PlantUML)
### Điểm mạnh
- Hỗ trợ trực tiếp: **sequence**, **use-case**, **activity** (beta), **class**.
- Sequence rất đầy đủ: participant, message variants, lifeline activate/deactivate, note, alt/loop/par/critical/group, timeout marker, partition.
- Activity beta mở rộng: if/else/switch/fork/split/repeat/while/labels, notes, style/partition.
- Class khá giàu cú pháp: relations (extends, impl, comp, aggr, dep), package, stereotypes, modifiers, style, hide/show, page split.
- Use-case phù hợp cho actor-permission/functional mapping.
- C4-PlantUML có macro cho Context/Container/Component/Dynamic/Deployment/Sequence; dùng tags/style/legend/link/sprite.
- Rất phù hợp xuất vào tài liệu thesis/slide (SVG/PDF pipeline quen thuộc).

### Hạn chế/điểm yếu
- Không có mô hình “kiến trúc duy nhất kiểu graph source-of-truth” như Structurizr; dễ drift giữa model và nhiều file `.puml`.
- Khả năng governance phụ thuộc quy ước team (naming, style, review).
- Layout có tính tự động và đôi khi thay đổi theo phiên bản PlantUML.
- C4-PlantUML vẫn là “library layer” trên PlantUML, nên phụ thuộc version/remote include.
- PNG không giữ link tương tác; chỉ SVG có links theo tài liệu upstream.

## 2) Đánh giá Structurizr DSL
### Điểm mạnh
- DSL là model-as-code trực tiếp: `workspace { model { ... } views { ... } }`.
- Tách rõ **model và views**, có sections `configuration`, `properties`, `styles`, `themes`.
- Có cơ chế tái sử dụng qua `extends`/`!include` (nhất quán naming, quan hệ, chuẩn hóa giữa workspace).
- Chạy CI tốt nhờ CLI:
  - `validate`: check syntax/định dạng workspace,
  - `inspect`: chất lượng/consistency rules,
  - `export`: tạo PlantUML/Mermaid/dot/json/... cho render tự động.
- Có quality checks có sẵn (missing description/technology, disconnected, no view, noview, relationship checks...).
- Rõ cho collaboration khi kết hợp push/pull + on-prem/cloud workspace.

### Hạn chế/điểm yếu
- Học cú pháp và model semantics ban đầu chậm hơn PlantUML.
- Không phải mọi người cần chi tiết “thẩm mỹ nghệ thuật” từng cạnh như PlantUML.
- Manual layout của view không nằm trong DSL gốc; nếu dùng layout thủ công trong UI có thể bị mất khi match không ổn.
- Kỹ thuật render sâu vẫn cần export qua CLI; cần quản lý toolchain đúng.

## 3) So sánh chi tiết (PlantUML/C4-PlantUML vs Structurizr DSL)
| Tiêu chí | PlantUML (+C4-PlantUML) | Structurizr DSL |
|---|---|---|
| Mục đích chính | Vẽ đa loại diagram nhanh, kể cả sequence/activity/class | Mô hình kiến trúc nhất quán từ model + views |
| Phạm vi kiến trúc C4 | Có C4-PlantUML macro cho nhiều view C4 | Native theo cấp hệ thống/ container/ component/ deployment/ dynamic |
| Khả năng quản lý kiến trúc tổng thể | Chủ yếu theo file riêng lẻ, cần quy ước manual | Tập trung hóa trong `workspace` + tags + styles |
| Kiểm soát layout | Có seed, skinparam, hướng, grouping; C4 có layout macro | Auto layout mặc định; manual layout có thể bảo toàn qua key/ID matching (không nằm trong DSL)
| Chất lượng hình | Tốt khi tinh chỉnh skinparam; chi tiết cao ở sequence/activity | Đồng nhất cao nếu giữ style tags + templates; tốt cho bản đồ kiến trúc tổng quan |
| Readability khi nhiều luồng phức tạp | Tốt nếu file được chia nhỏ theo scenario | Rất tốt cho hệ cảnh-chi tiết phân cấp, dễ đọc ở cấp kiến trúc
| Diff trên Git | Dễ diff text cho từng file `.puml`; review trực tiếp tốt | Diff tập trung trên DSL source; dễ review tổng thể hơn nếu model chuẩn hóa tốt |
| CI/render tự động | Dùng PlantUML CLI/server (docker, jar) | Có CLI chính thức validate/inspect/export; hợp nhất pipeline tốt
| Khả năng audit/giám sát chất lượng | Phụ thuộc quy tắc review nội bộ | Có inspection policy, severities, fail-gate chính thức |
| Học/duy trì cho team | Dễ tiếp cận, cú pháp phong phú, chi phí ramp-up thấp-moderate | Ban đầu dày hơn nhưng khi team >2-3 người lại bền hơn nhờ chuẩn hóa model |
| Chi phí vận hành | thấp nếu pipeline đơn giản | Cao hơn setup ban đầu, nhưng giảm chi phí kỹ thuật về sau |

## 4) Đề xuất combo cho thesis IoT (backend/cloud/mobile)
1. **Layer kiến trúc chuẩn (nên chọn 1):**
   - Dùng **Structurizr DSL** làm nguồn dữ liệu nền tảng.
   - Mô tả: system landscape, system context, container, component, deployment.
   - Dùng tags/style/tông màu thống nhất theo quy tắc đội.
2. **Layer hành vi chi tiết (nên áp dụng rộng):**
   - Dùng **PlantUML sequence** cho luồng OTA, MQTT, API/WebSocket, retry-backoff.
   - Dùng **activity** cho quy trình xử lý lỗi, timing/branch.
   - Dùng **class** cho mô hình object/payload/DTO khi cần làm rõ domain model backend.
3. **Khi cần C4 sequence:**
   - Chỉ dùng C4-PlantUML cho một số diagram C4-style interaction đơn giản.
   - Với luồng phức tạp, dùng sequence PlantUML thuần.
4. **Quy tắc tránh drift:**
   - Mỗi luồng chi tiết trong PlantUML phải có link/ID trỏ về model ID trong Structurizr (gắn trong label/metadata).
   - Cập nhật Structurizr trước, rồi sinh lại PlantUML C4 views (nếu dùng export).

## 5) Rủi ro vận hành & cách giảm
- **Rủi ro:** drift giữa C4-PlantUML và Structurizr model.
  **Giảm:** đặt thứ tự: model DSL làm chuẩn; đặt chuẩn naming+ID; review bắt buộc khi đổi DSL.
- **Rủi ro:** layout đổi giữa phiên bản PlantUML.
  **Giảm:** khóa version JAR/docker image, thêm snapshot baseline trong CI.
- **Rủi ro:** mất layout thủ công trong Structurizr khi update model.
  **Giảm:** tránh đổi key/ID vô tội vạ, dùng `!identifiers hierarchical`, xuất ảnh bằng công thức lặp lại.
- **Rủi ro:** render pipeline khác nhau giữa môi trường cá nhân và CI.
  **Giảm:** pin toolchain (structurizr-cli, plantuml jar, font), cache sạch, artifact deterministic.
- **Rủi ro:** tài liệu quá dày gây khó review.
  **Giảm:** tách theo chapter/luồng (backend/cloud/mobile) + giới hạn độ dài mỗi file.
- **Rủi ro:** người mới ngập trong cú pháp nhiều loại.
  **Giảm:** tạo template 2 lớp: 1) DSL skeleton, 2) sequence template checklist.

## 6) Đề xuất thực thi (không làm luôn code)
- Bước 1: chuẩn hóa quy ước danh mục diagram (kho tên, prefix chapter, ID, style).
- Bước 2: chọn vài diagram C4 trọng tâm chuyển qua Structurizr DSL trước.
- Bước 3: viết 1 pipeline CI giai đoạn nhẹ: `structurizr validate -> inspect -> export(plantuml/mermaid/json)` + render PlantUML artifact.
- Bước 4: dùng PlantUML sequence/activity/class cho phần flow chi tiết riêng, không để trộn vào file kiến trúc chính.

## Unresolved questions
1. Team có chấp nhận một workspace Structurizr trung tâm hay 2+ workspace cho mobile/backend/cloud không?
2. Có cần bản SVG có link clickable trong thesis không (ảnh PDF chỉ cần render tĩnh thì không)?
3. Có bắt buộc giữ layout thủ công theo bản đẹp hand-tuned của từng sơ đồ không?
4. Độ chi tiết C4 cần đến component view cho mọi chapter hay chỉ một số chapter trọng điểm?
5. Có chính sách ràng buộc mức severity của inspection (error/warn/info) cho thesis không?

## Tài liệu tham khảo tạo kế hoạch (cần dùng cho implement)
- Chạy theo hướng này với mục tiêu: **Structurizr cho kiến trúc, PlantUML cho hành vi chi tiết**.