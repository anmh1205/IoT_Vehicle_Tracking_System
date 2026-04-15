# Thesis UML Sources

Thu muc nay luu source Mermaid/MML cho tung hinh SVG trong thesis.

Quy uoc:
- Moi file `.mmd` map 1-1 voi file SVG cung ten trong `../figures/`.
- Sua bo cuc, text, mui ten truc tiep trong file `.mmd` tuong ung.
- Sau khi sua, render lai bang lenh:

```bash
node resources/reports/thesis/final/assets/generate-thesis-report-figures.mjs
```

Luu y:
- `resources/reports/thesis/final/assets/thesis-mermaid-diagrams.mjs` la loader doc cac file trong thu muc nay.
- Mot so hinh co render size override trong generator de tranh de text va mui ten.
- Pipeline Mermaid chinh van render vao `../figures/` bang `generate-thesis-report-figures.mjs` va khong dung cho review-set D2.
- Review-set D2 batch 1 nam o `../review-set/` voi source `.d2`, `manifest.json`, va generator rieng:

```bash
node resources/reports/thesis/final/assets/generate-thesis-review-d2-figures.mjs
```

- Review-set D2 chi render vao `../review-set/figures/` de so sanh, khong thay the figure canonical trong thesis report.
