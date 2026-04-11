# Research Report: Diagram tools for thesis assets

Date: 2026-04-11 02:34 Asia/Saigon

## Executive Summary

Nếu mục tiêu là chất lượng in ấn và độ ổn định học thuật, **TikZ/PGF** và **Asymptote** là 2 lựa chọn mạnh nhất. TikZ/PGF thắng ở tích hợp LaTeX, typography đồng bộ, và kiểm soát chi tiết; Asymptote mạnh ở vector graphics, script hóa, và đồ họa kỹ thuật có yếu tố hình học/3D. Nếu cần sơ đồ kiến trúc/cấu trúc phần mềm theo kiểu text-first, **Structurizr DSL** đáng chọn vì dễ version-control và automate, nhưng nó không phải công cụ tối ưu cho figure “đẹp như sách” nếu so với LaTeX-native.

Với nhu cầu team làm nhanh và bảo trì repo Git, **Graphviz** và **diagrams.net/draw.io** là thực dụng nhất. Graphviz rất tốt cho layout tự động, xuất SVG/PDF, và tạo sơ đồ từ text; draw.io phù hợp khi nhóm cần thao tác kéo-thả nhưng vẫn muốn lưu file dạng text XML trong Git. **Inkscape** là tool chỉnh tay/finish tốt hơn là tool sinh sơ đồ chính; nó hữu ích để polish SVG, nhưng workflow thuần Inkscape thường kém maintainable hơn công cụ text-first.

Kết luận thẳng: 
- **Profile A (academic print quality):** TikZ/PGF > Asymptote > Graphviz > Structurizr DSL > Inkscape > draw.io.
- **Profile B (speed + team maintainability):** Graphviz > Structurizr DSL > draw.io > TikZ/PGF > Asymptote > Inkscape.
- **Hybrid tốt nhất cho thesis kỹ thuật:** TikZ/PGF làm tool chính; Graphviz cho sơ đồ tự động; Structurizr DSL cho kiến trúc phần mềm; draw.io chỉ cho case cần đồng tác giả non-technical; Inkscape để polish cuối cùng khi thật cần.

## Research Methodology

- Sources consulted: 5 official/documentation sources + 2 repository/documentation pages.
- Date range of materials: mostly current docs/repo pages, latest visible info up to 2025-2026 where available.
- Key search terms used: thesis diagrams, publication quality SVG PDF, LaTeX typography, version control friendly diagrams, automated rendering, graph layout engine, architecture diagram DSL.
- Scope boundaries: tập trung vào công cụ có thể dùng cho thesis assets; không đi sâu vào UI aesthetics hay plugin ecosystem ngoài nhu cầu xuất bản và maintainability.

## Key Findings

### 1. Technology Overview

#### TikZ/PGF
- TeX-native graphics system, mạnh nhất khi figure nằm trong workflow LaTeX.
- Ưu điểm cốt lõi: typography đồng bộ với thesis, PDF output sạch, kiểm soát chính xác mọi chi tiết.
- Nhược điểm: learning curve cao, code dài, dễ tốn thời gian nếu vẽ nhiều figure phức tạp.

#### Asymptote
- Vector graphics language/script cho technical figures.
- Hợp cho hình học, diagram kỹ thuật, và case có 3D/coordinate-heavy drawing.
- Mạnh ở automation và script hóa; ít “LaTeX-native” hơn TikZ nhưng vẫn rất hợp academic workflow.

#### Graphviz
- Tool layout tự động cho graph/network/tree/flow-like diagram.
- Xuất SVG/PDF qua CLI, phù hợp pipeline CI.
- Không phải tool tốt nhất cho typography thủ công; điểm mạnh là speed + auto layout.

#### Structurizr DSL
- DSL text-first cho architecture model theo C4.
- Rất tốt cho version control, validation, export, và team workflow.
- Phù hợp nhất cho architecture diagrams, not general-purpose publication figures.

#### diagrams.net / draw.io
- Tốt cho collaborative editing, revision control, and practical docs workflows.
- Nhanh cho team non-technical.
- Nhược: bản chất GUI-first, maintainability phụ thuộc quy ước lưu trữ file và discipline của team.

#### Inkscape workflow
- SVG editor mạnh để polish cuối cùng.
- Hợp khi cần chỉnh tay typography, alignment, icon, export PDF/SVG.
- Không phải lựa chọn tốt nhất nếu mục tiêu là repeatable generation trong Git.

### 2. Current State & Trends

- **Text-first / code-first** đang là xu hướng mạnh nhất cho maintainability: TikZ/PGF, Graphviz, Structurizr DSL.
- **GUI tools** vẫn sống khỏe trong team cần tốc độ, nhưng repo-friendly kém hơn khi diagram lớn và thường xuyên đổi.
- Với thesis, xu hướng thực dụng là: generate bằng code/text, polish bằng editor nếu cần.
- Không thấy dấu hiệu deprecation lớn trong các tool chính; các project đều còn duy trì tài liệu/release docs.

### 3. Best Practices

- Dùng **text-first** cho diagram core để dễ review diff, merge, và CI.
- Dùng **SVG/PDF** làm output chính; tránh PNG cho figure học thuật nếu không bắt buộc.
- Nếu thesis viết bằng LaTeX, giữ typography cùng font family bằng TikZ/PGF hoặc Asymptote integration.
- Dùng draw.io/Inkscape chỉ cho case cần cộng tác nhanh hoặc polish cuối.
- Với Graphviz/Structurizr, lưu source trong Git, export artifact trong CI.

### 4. Security Considerations

- Không phải domain có rủi ro security cao theo nghĩa truyền thống.
- Rủi ro chính là supply chain/tooling và reproducibility: version mismatch giữa máy cá nhân, CI, và máy build thesis.
- Khuyến nghị pin version tool, font, và export pipeline.

### 5. Performance Insights

- **TikZ/PGF:** output chất lượng cao nhưng build chậm nếu figure lớn/nhiều.
- **Asymptote:** scriptable, hiệu quả với technical drawing; build khá ổn cho batch generation.
- **Graphviz:** nhanh cho layout tự động; cực hợp sơ đồ có cấu trúc rõ.
- **Structurizr DSL:** nhẹ về source, good automation; quality phụ thuộc renderer/export.
- **draw.io/Inkscape:** performance chủ yếu là thao tác người dùng, không phải batch generation.

## Comparative Analysis

### Bảng so sánh ngắn

| Tool | Publication quality | Effort / learning | CI automation | Git friendliness | Thesis fit |
|---|---:|---:|---:|---:|---:|
| TikZ/PGF | 5/5 | 2/5 | 4/5 | 5/5 | 5/5 |
| Asymptote | 5/5 | 3/5 | 4/5 | 5/5 | 5/5 |
| Graphviz | 4/5 | 4/5 | 5/5 | 5/5 | 4/5 |
| Structurizr DSL | 4/5 | 4/5 | 5/5 | 5/5 | 4/5 |
| draw.io / diagrams.net | 3/5 | 5/5 | 3/5 | 3/5 | 3/5 |
| Inkscape workflow | 4/5 | 3/5 | 2/5 | 2/5 | 3/5 |

### Nguồn chính thức/đáng tin đã dùng

- TikZ/PGF docs: https://docs.tikz.dev/
- PGF/TikZ repo: https://github.com/pgf-tikz/pgf
- Asymptote docs: https://asymptote.sourceforge.io/doc/
- Graphviz docs: https://graphviz.org/documentation/
- Structurizr DSL docs: https://docs.structurizr.com/dsl
- draw.io docs: https://drawio.com/doc/
- Inkscape docs: https://inkscape.org/doc/

### Caveat nguồn

- Một số official pages bị chặn TLS/403 trong fetch trực tiếp; kết luận dựa trên phần docs/repo page accessible và mô tả chính thức có thể kiểm chứng.
- Không thấy đủ tín hiệu để khẳng định draw.io/Inkscape là lựa chọn tốt hơn text-first tools cho thesis assets có yêu cầu publish nghiêm túc.

## Ranking by Profile

### Profile A: ưu tiên chất lượng in ấn / học thuật
1. TikZ/PGF
2. Asymptote
3. Graphviz
4. Structurizr DSL
5. Inkscape workflow
6. diagrams.net / draw.io

Why: typography + PDF output + LaTeX integration quyết định thắng thua. TikZ/PGF thắng rõ nhất.

### Profile B: ưu tiên tốc độ làm và bảo trì team
1. Graphviz
2. Structurizr DSL
3. diagrams.net / draw.io
4. TikZ/PGF
5. Asymptote
6. Inkscape workflow

Why: text-first + auto-layout + dễ review diff là tiêu chí chính. Graphviz và Structurizr thắng vì automation và maintainability.

## Best Hybrid Stack

### Recommended primary stack
- **Main tool:** TikZ/PGF
- **Secondary tool:** Graphviz
- **Architecture-specific:** Structurizr DSL
- **Manual polish:** Inkscape only when needed

### By diagram type
- **Flowchart / decision tree / dependency graph:** Graphviz
- **Software architecture / C4:** Structurizr DSL
- **Mathematical / technical / precise layout:** TikZ/PGF
- **Geometry / 3D / technical illustration:** Asymptote
- **One-off collaborative sketch:** draw.io
- **Final SVG cleanup:** Inkscape

### Practical rule
- If diagram will appear in thesis body repeatedly and must look identical across builds: **TikZ/PGF**.
- If diagram is mostly structural and benefits from auto layout: **Graphviz**.
- If architecture must stay synchronized with code/doc model: **Structurizr DSL**.
- If someone non-technical must edit fast: **draw.io**.

## Implementation Recommendations

### Quick Start Guide

1. Use **TikZ/PGF** for figures that matter to the thesis grade.
2. Use **Graphviz** for auto-generated structure diagrams.
3. Use **Structurizr DSL** for architecture views if your thesis includes software architecture.
4. Keep source files text-based in Git; export PDF/SVG in CI.
5. Use Inkscape only for last-mile polish, not as primary source of truth.

### Common Pitfalls

- Choosing GUI-first tools for every figure, then suffering on Git diffs and merges.
- Exporting raster images for print-quality thesis pages.
- Mixing fonts/styles across tools, causing visual inconsistency.
- Overusing TikZ where Graphviz/Structurizr would be faster and more maintainable.

## Resources & References

### Official Documentation
- TikZ/PGF: https://docs.tikz.dev/
- PGF repo: https://github.com/pgf-tikz/pgf
- Asymptote: https://asymptote.sourceforge.io/doc/
- Graphviz: https://graphviz.org/documentation/
- Structurizr DSL: https://docs.structurizr.com/dsl
- draw.io: https://drawio.com/doc/
- Inkscape: https://inkscape.org/doc/

### Further Reading
- TeX/LaTeX workflow docs from your thesis template or university style guide.
- CI export recipes for deterministic PDF/SVG generation.

## Appendices

### A. Glossary
- **Publication quality:** vector output crisp, typography stable, suitable for print/PDF.
- **CI automation:** diagram source can be rendered in unattended build pipelines.
- **Git friendliness:** diff/merge readable; source tracked as text.
- **Typography consistency:** fonts and spacing match thesis document.

### B. Unresolved Questions
- If your thesis template is not LaTeX, TikZ/PGF advantage shrinks.
- If you need heavy collaborative editing by non-technical coauthors, draw.io may be pragmatically better despite lower maintainability.
- Exact export fidelity of your chosen font stack on Windows/CI still needs local verification.
