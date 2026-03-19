# Thesis UML Sources

Thu muc nay luu source Mermaid/MML cho tung hinh SVG trong thesis.

Quy uoc:
- Moi file `.mmd` map 1-1 voi file SVG cung ten trong `../figures/`.
- Sua bo cuc, text, mui ten truc tiep trong file `.mmd` tuong ung.
- Sau khi sua, render lai bang lenh:

```bash
node resources/reports/thesis-chapters/assets/generate-thesis-report-figures.mjs
```

Luu y:
- `resources/reports/thesis-chapters/assets/thesis-mermaid-diagrams.mjs` chi con la loader doc cac file trong thu muc nay.
- Mot so hinh co render size override trong generator de tranh de text va mui ten.
