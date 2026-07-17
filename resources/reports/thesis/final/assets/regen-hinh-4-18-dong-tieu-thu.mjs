/**
 * Hình 4.18 – Dòng tiêu thụ theo các pha vận hành chính
 * Style: Times New Roman, cột viền đen nền trắng, chữ đen đậm.
 *
 * Run: node resources/reports/thesis/final/assets/regen-hinh-4-18-dong-tieu-thu.mjs
 */
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const outDir = path.resolve("resources/reports/thesis/final/assets/figures-condensed-r2");
const baseName = "10-chuong-4-ket-qua-do-luong-hinh-4-23";
const pngScale = 3;

// Data
const data = [
  { label: "Hoạt động", value: 210 },
  { label: "Gửi tin", value: 216 },
  { label: "Chờ", value: 108 },
  { label: "Đỗ", value: 9 },
  { label: "Ngủ sâu", value: 0.6 },
  { label: "Cảnh báo", value: 228 },
  { label: "Ổn định lại", value: 9 },
];

const W = 900, H = 520;
const plotLeft = 100, plotRight = 860, plotTop = 70, plotBottom = 400;
const plotW = plotRight - plotLeft;
const plotH = plotBottom - plotTop;

// Y-axis: 0 to 240 mA
const yMax = 240;
const yTicks = [0, 40, 80, 120, 160, 200, 240];

const barCount = data.length;
const barGap = 16;
const barW = (plotW - (barCount + 1) * barGap) / barCount;

function yPos(val) {
  return plotBottom - (val / yMax) * plotH;
}

let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="100%" height="100%" fill="#ffffff"/>
<style>
  text { font-family: 'Times New Roman', Times, serif; fill: #000000; }
</style>

<!-- Title -->
<text x="${W / 2}" y="38" text-anchor="middle" font-size="24" font-weight="bold">Dòng tiêu thụ theo các pha vận hành chính</text>

<!-- Y-axis -->
<line x1="${plotLeft}" y1="${plotTop}" x2="${plotLeft}" y2="${plotBottom}" stroke="#000000" stroke-width="2"/>
<!-- X-axis -->
<line x1="${plotLeft}" y1="${plotBottom}" x2="${plotRight}" y2="${plotBottom}" stroke="#000000" stroke-width="2"/>

<!-- Y-axis title -->
<text x="30" y="${(plotTop + plotBottom) / 2}" text-anchor="middle" font-size="18" transform="rotate(-90 30 ${(plotTop + plotBottom) / 2})">mA</text>
`;

// Y grid + tick labels
for (const tick of yTicks) {
  const y = yPos(tick);
  if (tick > 0) {
    svg += `<line x1="${plotLeft}" y1="${y}" x2="${plotRight}" y2="${y}" stroke="#000000" stroke-width="0.4" stroke-dasharray="4 3"/>`;
  }
  svg += `<text x="${plotLeft - 10}" y="${y + 5}" text-anchor="end" font-size="15">${tick}</text>`;
}

// Bars
data.forEach((d, i) => {
  const x = plotLeft + barGap + i * (barW + barGap);
  const barH = (d.value / yMax) * plotH;
  const y = plotBottom - barH;

  // Bar: white fill, black stroke
  svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" fill="#ffffff" stroke="#000000" stroke-width="2.5"/>`;

  // Value label above bar
  const valStr = d.value < 1 ? d.value.toString() : Math.round(d.value).toString();
  svg += `<text x="${x + barW / 2}" y="${y - 10}" text-anchor="middle" font-size="17" font-weight="bold">${valStr}</text>`;

  // Category label below x-axis
  svg += `<text x="${x + barW / 2}" y="${plotBottom + 25}" text-anchor="middle" font-size="15">${d.label}</text>`;
});

svg += `</svg>`;

await writeFile(path.join(outDir, `${baseName}.svg`), svg, "utf8");
await sharp(Buffer.from(svg, "utf8"))
  .resize({ width: W * pngScale, height: H * pngScale, fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, `${baseName}.png`));

console.log(`✓ ${baseName}.svg + .png regenerated (${W}x${H} @${pngScale}x)`);
console.log("  Content: Dòng tiêu thụ theo các pha vận hành chính");
console.log("  Style: Times New Roman, viền đen, nền trắng, chữ đen đậm");
