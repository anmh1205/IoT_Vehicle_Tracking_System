# Raw line-index harvesting — thesis LaTeX

## Inputs
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.tex`
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-latex.log`
- `resources/reports/thesis/final/assets/figures/10-chuong-4-ket-qua-do-luong-hinh-4-38.svg`

## Quantified scan output

| Metric | Value |
|---|---:|
| `\safeincludesvg{...}` count | 88 |
| `\emph{Hình x.y: ...}` count | 88 |
| `Nguồn:` lines | 87 |
| `\begin{quote}` | 92 |
| `\end{quote}` | 92 |
| Overfull total | 256 |
| Overfull `>5pt` | 250 |
| Overfull `<=5pt` | 6 |
| Underfull total | 31 |

## Key anchors (tex)
- Figure 4.47 asset line: tex:10548
- Figure 4.47 caption line: tex:10550
- Figure 4.47 source line: tex:10554
- Missing source after caption: tex:7677 (`Hình 4.17`)
- Non-source quote blocks (not `Nguồn:`): tex:9195, 10407, 12532, 12736, 13068

## Key anchors (log)
- Figure 4.47 asset usage in log: log:2604-2606
- Top overfull cluster sample:
  - log:1134-1144 ↔ tex:2361-2397 (`910.66318pt`)
  - log:2775-2785 ↔ tex:11067-11109 (`857.34518pt`)
  - log:1260-1270 ↔ tex:3238-3257 (`754.90277pt`)
- Small overfull (`<=5pt`) sample:
  - log:943-953 ↔ tex:828-883 (`1.17265pt`)
  - log:1640-1650 ↔ tex:5508-5537 (`2.41025pt`)

## Asset evidence
- SVG has literal error marker: `Syntax error in text`
- SVG has generator marker: `mermaid version 11.12.3`

## Overfull distribution
- `>=500pt`: 24
- `100–499pt`: 111
- `5–99pt`: 115
- `<=5pt`: 6

## Notes
- Current thesis uses `\safeincludesvg + \emph{Hình...} + quote/Nguồn`, không dùng `figure/caption/label` chuẩn.
- No `\cite{}` / `\parencite{}` / `\textcite{}` detected in thesis source.

## Unresolved questions
- Có chấp nhận tiếp tục mô hình `\emph{Hình...}` thay vì migrate sang `figure+caption+label` nếu mục tiêu là sửa nhanh trước deadline?
