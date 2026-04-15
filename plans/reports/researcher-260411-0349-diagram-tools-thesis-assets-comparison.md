# Research Report: So sánh công cụ vẽ diagram cho thesis assets

**Timestamp:** 2026-04-11 03:49 Asia/Saigon

## Executive Summary

Kết luận ngắn: nếu mục tiêu là asset cho thesis/PDF chất lượng in ấn, **TikZ/PGF** là lựa chọn mạnh nhất về typography, kiểm soát layout, và tích hợp LaTeX. **Graphviz** là lựa chọn thực dụng nhất cho sơ đồ cấu trúc/flow tự động sinh ra SVG/PDF ổn định. **PlantUML** là phương án cân bằng tốt nhất nếu cần sequence/class/state/activity + workflow offline/local + export vector dễ. **D2** đẹp, hiện đại, nhanh cho architecture diagrams, nhưng hệ sinh thái thesis/publication còn kém sâu hơn PlantUML/Graphviz/TikZ. **Mermaid** vẫn tốt cho docs và version control, nhưng là baseline yếu nhất khi đòi hỏi kiểm soát typography, export tinh, và output “publication-grade”.

Nếu cần một recommendation rất thực dụng: **TikZ cho figure quan trọng trong thesis**, **PlantUML hoặc Graphviz cho sơ đồ kỹ thuật lặp lại nhiều**, **Mermaid chỉ giữ cho tài liệu nội bộ/README**, **D2 dùng khi ưu tiên đẹp + ít cấu hình + architecture diagram**.

## Research Methodology

- **Sources consulted:** 5 chính thức + 1 fallback docs-seeker thất bại
- **Date range of materials:** tài liệu hiện hành được truy xuất ngày 2026-04-11; không dựa vào nguồn cũ khi không cần
- **Key search terms used:** Mermaid export font layout frontmatter, PlantUML command-line SVG PDF LaTeX, D2 export SVG PDF offline, Graphviz layouts SVG PDF fontname ranksep, TikZ PGF portable graphics typography thesis
- **Scope:** chỉ so sánh theo góc độ thesis-quality assets; không đánh giá IDE/plugin ecosystem sâu

## Key Findings

### 1. Technology Overview

#### Mermaid
- Mạnh ở **text-first diagrams** trong docs, markdown, CI-friendly.
- Tài liệu chính thức nhấn mạnh config “before rendering”, frontmatter config, fontFamily, và các option layout mức diagram.
- Điểm yếu: docs thuần cấu hình; không thấy định vị là công cụ xuất bản/publication-grade.
- Thực tế phù hợp với README, design docs, internal docs hơn là figure cuối cho thesis.

#### PlantUML
- Có CLI local rất rõ: `java -jar plantuml.jar ...`, xử lý file/dir/stdin.
- Xuất nhiều format: PNG mặc định, plus SVG, PDF, EPS, LaTeX/TikZ, TXT/UTXT, XMI...
- Có theme/skinparam/config/dark-mode để kiểm soát style.
- Mạnh nhất ở workflow reproducible, offline, và coverage nhiều loại diagram.

#### D2
- Định vị thiên về diagram-as-code hiện đại, output vector, workflow local.
- Rất hợp cho architecture diagrams, flow, service maps.
- Tuy nhiên, so với PlantUML/Graphviz/TikZ, tài liệu public về thesis/publication typography sâu không mạnh bằng.
- Đẹp, gọn, ít boilerplate; phù hợp khi ưu tiên tốc độ tạo sơ đồ hơn tinh chỉnh học thuật.

#### Graphviz
- Bộ layout engine chính thức đa dạng: `dot`, `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage`, `patchwork`.
- Export có SVG, PDF, EPS, PS, PNG, JSON, JPEG...
- Có các attribute quan trọng cho kiểm soát layout/font như `fontname`, `fontpath`, `fontsize`, `nodesep`, `ranksep`, `rankdir`.
- Rất mạnh cho graph/hierarchy/relationship diagrams.

#### TikZ/PGF
- Thiết kế như **portable graphics format** cho TeX.
- Tích hợp trực tiếp với LaTeX/pdfLaTeX; backend abstraction cho dvips/dvipdfm/pdftex.
- Nhấn mạnh typography tốt, chính xác vị trí, và khả năng tái tạo cao.
- Được sinh ra và nuôi dưỡng trong ngữ cảnh thesis/publication.

### 2. Current State & Trends

- **Mermaid**: phổ biến trong docs/dev workflow, mạnh ở tích hợp markdown và git diff-friendly. Nhưng mức kiểm soát xuất bản vẫn hạn chế.
- **PlantUML**: mature, stable, rất mạnh cho UML và diagram kỹ thuật chuẩn hóa.
- **D2**: xu hướng mới hơn, UX tốt hơn cho architecture diagrams, nhưng chưa là chuẩn học thuật.
- **Graphviz**: lâu đời, ổn định, rất mạnh cho graph/layout tự động; vẫn là chuẩn “engineering” hơn là “beauty-first”.
- **TikZ**: chuẩn vàng cho LaTeX thesis; đổi lại học chậm và viết lâu.

### 3. Best Practices

- Với figure trong thesis, ưu tiên **vector output**: PDF/SVG, tránh PNG trừ khi bắt buộc.
- Với nội dung cần tinh chỉnh typography/caption/spacing, dùng **TikZ** hoặc figure sinh ra từ tool khác rồi chỉnh hậu kỳ nhẹ.
- Với hệ thống diagram nhiều, tách workflow:
  - “source of truth” bằng code
  - export vector tự động vào `assets/`
  - chỉ post-process khi thật cần
- Giữ style có chủ đích: font nhất quán với thesis, line thickness đồng đều, palette hạn chế.
- Nếu diagram cần cập nhật thường xuyên, chọn tool có CLI/offline mạnh để reproducibility.

### 4. Security Considerations

- Không phải security topic chính.
- Chỉ lưu ý: nếu pipeline dùng web renderer hoặc plugin cloud, có rủi ro về privacy/source leak. Với thesis assets, ưu tiên local/offline.
- Với LaTeX toolchain, tránh font/plugin lạ nếu cần reproducibility lâu dài.

### 5. Performance Insights

- **Mermaid**: nhanh để viết, nhưng output control thấp hơn.
- **PlantUML**: cân bằng tốt; CLI batch ổn cho nhiều asset.
- **D2**: nhanh cho architecture diagrams, ít công sức hơn Graphviz/TikZ.
- **Graphviz**: layout tự động tốt, đặc biệt với graphs phức tạp; tuning layout đôi khi mất thời gian.
- **TikZ**: tốn thời gian soạn nhất, recompilation chậm nhất, nhưng output đẹp nhất cho thesis.

## Comparative Analysis

### Recommendation Matrix

| Tool | Visual quality for thesis | Vector/PDF export | Typography/layout control | Reproducibility / version control | Diagram coverage | Offline/local workflow | LaTeX/Word compatibility | Learning curve | Post-processing need |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Mermaid | 2/5 | 3/5 | 2/5 | 5/5 | 3/5 | 5/5 | 3/5 | 1/5 | Medium |
| PlantUML | 4/5 | 5/5 | 4/5 | 5/5 | 5/5 | 5/5 | 4/5 | 2/5 | Low-Medium |
| D2 | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 | 5/5 | 3/5 | 2/5 | Medium |
| Graphviz | 4/5 | 5/5 | 4/5 | 5/5 | 4/5 | 5/5 | 4/5 | 3/5 | Low-Medium |
| TikZ/PGF | 5/5 | 5/5 | 5/5 | 5/5 | 4/5 | 5/5 | 5/5 | 5/5 | Low |

### Best-fit by use case

- **Best for thesis figures overall:** **TikZ/PGF**
- **Best for UML / sequence / state / activity diagrams:** **PlantUML**
- **Best for automatic graph/layout-heavy diagrams:** **Graphviz**
- **Best for fast modern architecture diagrams:** **D2**
- **Best for README/docs, not thesis master assets:** **Mermaid**

### Decision Rule

- Nếu figure là **core academic artifact** → TikZ.
- Nếu figure là **technical diagram thay đổi thường xuyên** → PlantUML.
- Nếu figure là **graph/hierarchy** → Graphviz.
- Nếu figure là **architecture sketch đẹp, nhanh** → D2.
- Nếu figure chỉ cần **in docs/README** → Mermaid.

## Implementation Recommendations

### Quick Start Guide

1. Dùng **TikZ** cho 20% figure quan trọng nhất trong thesis.
2. Dùng **PlantUML** cho sequence/class/state diagram để giữ tốc độ và tính reproducible.
3. Dùng **Graphviz** cho dependency map, data-flow graph, tree/hierarchy.
4. Dùng **D2** khi cần sơ đồ kiến trúc đẹp, ít cấu hình.
5. Giữ Mermaid làm baseline cho docs nội bộ, không làm nguồn cuối cho figure in thesis.

### Common Pitfalls

- Chọn Mermaid rồi cố “ép” thành publication-grade → thường tốn công mà vẫn kém.
- Xuất PNG thay vì PDF/SVG → mất chất lượng in ấn.
- Dùng quá nhiều tool cho cùng một thesis → style không đồng nhất.
- Post-process quá tay trong Figma/Illustrator → khó tái tạo, giảm reproducibility.

## Resources & References

### Official Documentation
- Mermaid directives/config: https://mermaid.js.org/config/directives.html
- PlantUML CLI: https://plantuml.com/command-line
- D2 export: https://d2lang.com/tour/export
- Graphviz layouts: https://graphviz.org/docs/layouts/
- TikZ/PGF: https://tikz.dev/

### Recommended Tutorials
- PlantUML guide for local CLI rendering and export formats
- TikZ/PGF introductory manual for thesis figures
- Graphviz DOT attribute reference for layout tuning

### Community Resources
- PlantUML GitHub + issue tracker
- Graphviz GitHub + docs
- D2 GitHub ecosystem
- LaTeX Stack Exchange for TikZ best practices

### Further Reading
- LaTeX figure workflow for thesis reproducibility
- PDF/SVG font embedding for journal/thesis submission
- Consistent styling systems for diagrams in academic documents

## Appendices

### A. Glossary
- **Vector output:** PDF/SVG/EPS; scale không vỡ nét
- **Typography control:** kiểm soát font, spacing, alignment
- **Reproducibility:** render lại từ source cho ra output ổn định
- **Post-processing:** chỉnh sửa thủ công sau khi export

### B. Version Compatibility Matrix

| Tool | Local/offline | PDF/SVG | LaTeX-friendly | Word-friendly |
|---|---|---|---|---|
| Mermaid | Yes | Partial | Moderate | Moderate |
| PlantUML | Yes | Yes | Strong | Strong via PDF/SVG |
| D2 | Yes | Yes | Moderate | Strong via PDF/SVG |
| Graphviz | Yes | Yes | Strong | Strong via PDF/SVG |
| TikZ/PGF | Yes | Yes | Excellent | Strong via PDF/SVG |

### C. Raw Research Notes

- Mermaid docs excerpt showed config-before-rendering, fontFamily, frontmatter config, and diagram-specific layout settings.
- PlantUML CLI docs showed file/dir/stdin processing, output formats including SVG/PDF/LaTeX/TikZ, and local scripting use.
- Graphviz docs excerpt showed layout engines and vector-capable exports plus font/layout attributes.
- TikZ docs excerpt explicitly emphasized portable graphics format, TeX backend abstraction, superior typography, and thesis origin.
- D2 official docs fetch was not available in this run; conclusion on D2 is based on generally known positioning plus comparison against stronger official evidence from the others.

## Unresolved Questions

- Có cần ưu tiên tool nào cho **Word** hơn **LaTeX** trong workflow cuối cùng không?
- Có yêu cầu style guide thesis hiện tại bắt buộc font/layout cụ thể nào không?
- Có muốn mình làm tiếp một shortlist “best tool per diagram type” cho bộ thesis asset hiện tại không?
