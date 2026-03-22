# Nghiên cứu so sánh công cụ vẽ biểu đồ cho tài liệu kỹ thuật + luận văn

## Executive summary
- Với tài liệu kỹ thuật/luận văn có nhiều phiên bản, **diagrams-as-code (Mermaid/PlantUML)** là lựa chọn mạnh nhất cho việc duy trì, review và kiểm soát phiên bản trong Git.
- **WYSIWYG (draw.io/Excalidraw)** tối ưu cho tốc độ phác thảo và hợp tác trực quan, nhưng khó audit chi tiết thay đổi hơn khi so với text-based.
- Đối với sản phẩm học thuật yêu cầu chất lượng in ấn/chữ/công thức, nên xuất sang **SVG/PDF** và/hoặc dùng thêm kênh **LaTeX (TikZ/PGF/TikZ hoặc LaTeX output từ PlantUML)** cho phần kiến trúc cuối.
- Khuyến nghị shortlist thực tế: **PlantUML (chuẩn hoá UML) + Mermaid (luồng/sequence nhanh) + workflow render CI**; bổ sung **draw.io** cho diagram nháp.

## Decision matrix

| Tiêu chí | Diagrams-as-code (Mermaid + PlantUML) | WYSIWYG (draw.io/Excalidraw) | LaTeX (TikZ / PGF)
|---|---:|---:|---:|
| Chất lượng hình | 4 | 4 | 5 |
| Tái sử dụng + nhất quán style | 5 | 3 | 4 |
| Dễ cập nhật / refactor | 5 | 3 | 2 |
| Hợp tác nhiều người | 4 (Git, code review) | 4 (real-time/collab UI tùy tool) | 2 |
| Version control & diff | 5 (text diff tối ưu) | 2–3 | 4 (text diff, nhưng nặng) |
| Thích hợp học thuật | 4 | 3 | 5 |
| Tự động hóa build/docs | 5 | 3 | 2–4 |
| Độ khó học | 3 | 2–3 | 2 |

**Ghi chú:** điểm 5 tốt nhất, 1 yếu nhất.

## Top options
1. **Mermaid + Mermaid CLI (mmdc)**
   - Ưu: tích hợp tốt với Markdown/GitHub, dễ render SVG trong CI, học đường/lab hay repo docs thường dùng.
   - Nguồn: [Mermaid CLI](https://mermaid.js.org/config/mermaidCLI), [Integrations](https://mermaid.js.org/ecosystem/integrations-community), [GitHub docs](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams)
2. **PlantUML**
   - Ưu: hệ UML/flow đầy đủ hơn Mermaid (sequence/class/component/deployment...), có output latex-friendly cho tài liệu kỹ thuật.
   - Nguồn: [PlantUML LaTeX](https://plantuml.com/latex), [PlantUML changelog](https://plantuml.com/changes), [GitLab PlantUML integration](https://docs.gitlab.com/administration/integration/plantuml/)
3. **draw.io (diagrams.net) – GitHub mode**
   - Ưu: kéo-thả trực quan, export SVG/PNG, có tài liệu tích hợp GitHub cho luồng chỉnh sửa file trực tiếp.
   - Nguồn: [draw.io docs](https://www.drawio.com/doc/), [GitHub integration](https://jgraph.github.io/drawio-github/)
4. **Excalidraw** (bổ sung cho sketch/diagram brainstorm)
   - Ưu: vẽ tay tự nhiên, hỗ trợ cộng tác; hợp tác có phụ thuộc server/hosting theo thiết lập.
   - Nguồn: [Excalidraw docs](https://docs.excalidraw.com/), [Excalidraw repo](https://github.com/excalidraw/excalidraw)

## Ưu/nhược điểm theo nhóm

### Diagrams-as-code (Mermaid + PlantUML)
- **Ưu:**
  - Tài sản là text nên merge/rebase/collab qua Git clean; review qua diff dễ đọc.
  - Tái tạo định dạng đồ họa có tính tự động, chuẩn hóa style bằng config/theme.
  - Dễ tích hợp pipeline kiểm thử/build tài liệu.
- **Nhược:**
  - Cú pháp cần học.
  - Tùy biến đồ hoạ tinh vi bị giới hạn hơn WYSIWYG/professional editors.

### WYSIWYG (draw.io/Excalidraw)
- **Ưu:**
  - Tạo nhanh, trực giác tốt cho nhóm không quen code.
  - Hợp tác trực tiếp tốt hơn cho brainstorming.
- **Nhược:**
  - Binary/JSON diff khó theo dõi hơn text DSL.
  - Kiểm soát style liên tục khó nhất quán nếu nhiều tác giả và nhiều file.

### LaTeX (TikZ/PGF, LaTeX generation)
- **Ưu:**
  - Chất lượng in, typographic rất tốt; font/biểu thức/label đồng nhất toàn bộ luận văn.
- **Nhược:**
  - Thời gian tạo/chỉnh sửa cao; maintenance tệ khi diagram nhiều hoặc thay đổi nhanh.

## Tiêu chí chọn theo bối cảnh luận văn/kỹ thuật
- **Nếu ưu tiên reproducibility & audit**: chọn diagrams-as-code làm lõi; chỉ xuất ảnh khi publish.
- **Nếu cần UML chuẩn (state/sequence/deployment)**: ưu tiên PlantUML.
- **Nếu cần nhanh, trực quan cho nhóm không kỹ thuật**: draw.io/Excalidraw là bổ trợ, nhưng lưu định dạng source trong Git.
- **Nếu yêu cầu xuất bản học thuật nghiêm ngặt**: render sang SVG/PDF từ diagrams-as-code + kiểm soát caption/label theo LaTeX khi cần.

## Khuyến nghị shortlist 2–3 stack (ngắn gọn)
1. **Mặc định cho dự án kỹ thuật:** PlantUML + Mermaid + CI render (MermaidCLI/PlantUML server) + lưu file `.puml/.mmd` trong repo.
2. **Hybrid cho luận văn:** PlantUML cho kiến trúc/chức năng lõi + draw.io cho các sơ đồ nhanh/mở rộng ý tưởng.
3. **Academic-hardening:** PlantUML/Mermaid + convert ảnh chất lượng cao và biên tập LaTeX caption/đánh số trong luận văn.

## Unresolved questions
- Có bắt buộc quy trình render tự động tại mỗi commit (CI) hay chỉ khi hoàn tất chương?
- Cần hệ thống phê duyệt/collaboration real-time theo thời gian thực giữa hướng dẫn viên và nhóm không?
- Có yêu cầu chấp nhận file `.drawio` binary trong review nội bộ không, hay chỉ review qua ảnh render?
- Độ chi tiết UML nào là bắt buộc cho phần kiến trúc trong luận văn (class/sequence/deployment/state)?
- Có cần tương thích strict với hệ thống template/trình biên tập luận văn nào (Overleaf, TeXLive phiên bản cũ, hay Word-based)?
- Ngân sách thời gian: chấp nhận khóa học cú pháp thêm ~1 tuần để đổi sang diagram-as-code hay cần giải pháp kéo-thả ngay?
