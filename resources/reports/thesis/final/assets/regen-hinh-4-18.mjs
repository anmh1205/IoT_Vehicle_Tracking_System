/**
 * Regenerate Hình 4.18 – Ba mức công suất dùng trong phép tính nguồn
 * Style: Times New Roman, viền đen, nền trắng, chữ đen đậm, nổi bật.
 *
 * Run: node resources/reports/thesis/final/assets/regen-hinh-4-18.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const outDir = path.resolve("resources/reports/thesis/final/assets/figures-condensed-r2");
const baseName = "10-chuong-4-ket-qua-do-luong-hinh-4-23";
const pngScale = 3;

// Build SVG from scratch with strong contrast
const W = 800, H = 500;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <style>
    text { font-family: 'Times New Roman', Times, serif; fill: #000000; }
  </style>

  <!-- Title -->
  <text x="400" y="32" text-anchor="middle" font-size="22" font-weight="bold">Ba mức công suất dùng trong phép tính nguồn</text>

  <!-- Plot area -->
  <rect x="110" y="55" width="640" height="320" fill="none" stroke="#000000" stroke-width="2"/>

  <!-- Y-axis: log scale from 0.001 to 10 W -->
  <!-- 10 W → y=55, 1 W → y=135, 0.1 W → y=215, 0.01 W → y=295, 0.001 W → y=375 -->
  <!-- Grid lines -->
  <line x1="110" y1="55"  x2="750" y2="55"  stroke="#000000" stroke-width="0.5" stroke-dasharray="4 3"/>
  <line x1="110" y1="135" x2="750" y2="135" stroke="#000000" stroke-width="0.5" stroke-dasharray="4 3"/>
  <line x1="110" y1="215" x2="750" y2="215" stroke="#000000" stroke-width="0.5" stroke-dasharray="4 3"/>
  <line x1="110" y1="295" x2="750" y2="295" stroke="#000000" stroke-width="0.5" stroke-dasharray="4 3"/>

  <!-- Y tick labels -->
  <text x="100" y="60"  text-anchor="end" font-size="15">10</text>
  <text x="100" y="140" text-anchor="end" font-size="15">1</text>
  <text x="100" y="220" text-anchor="end" font-size="15">0,1</text>
  <text x="100" y="300" text-anchor="end" font-size="15">0,01</text>
  <text x="100" y="380" text-anchor="end" font-size="15">0,001</text>

  <!-- Y-axis title -->
  <text x="30" y="215" text-anchor="middle" font-size="16" font-style="italic" transform="rotate(-90 30 215)">Công suất (W) — thang log</text>

  <!-- Bars: black stroke, white fill -->
  <!-- Bar 1: Thiết bị hoạt động = 1.000 W → log10(1)=0 → y=135, h=375-135=240 -->
  <rect x="175" y="135" width="140" height="240" fill="#ffffff" stroke="#000000" stroke-width="2.5"/>
  <text x="245" y="125" text-anchor="middle" font-size="17" font-weight="bold">1,000 W</text>

  <!-- Bar 2: Thiết bị ngủ sâu = 0.006 W → log10(0.006)=-2.222 → y=375-((-2.222+3)*80)=375-62.2=312.8 -->
  <rect x="365" y="313" width="140" height="62" fill="#ffffff" stroke="#000000" stroke-width="2.5"/>
  <text x="435" y="305" text-anchor="middle" font-size="17" font-weight="bold">0,006 W</text>

  <!-- Bar 3: Bộ đọc OBD vgate = 1.200 W → log10(1.2)=0.079 → y=375-((0.079+3)*80)=375-246.3=128.7 -->
  <rect x="555" y="129" width="140" height="246" fill="#ffffff" stroke="#000000" stroke-width="2.5"/>
  <text x="625" y="119" text-anchor="middle" font-size="17" font-weight="bold">1,200 W</text>

  <!-- X-axis category labels -->
  <text x="245" y="400" text-anchor="middle" font-size="15">Thiết bị hoạt động</text>
  <text x="245" y="420" text-anchor="middle" font-size="14" font-style="italic">(P_chạy)</text>

  <text x="435" y="400" text-anchor="middle" font-size="15">Thiết bị ngủ sâu</text>
  <text x="435" y="420" text-anchor="middle" font-size="14" font-style="italic">(P_ngủ)</text>

  <text x="625" y="400" text-anchor="middle" font-size="15">Bộ đọc OBD</text>
  <text x="625" y="420" text-anchor="middle" font-size="14">vgate iCar Pro</text>
  <text x="625" y="440" text-anchor="middle" font-size="14" font-style="italic">(P_vgate)</text>

  <!-- X-axis title -->
  <text x="430" y="475" text-anchor="middle" font-size="16" font-style="italic">Hạng mục đo trong Bảng 4.4</text>
</svg>`;

await writeFile(path.join(outDir, `${baseName}.svg`), svg, "utf8");
await sharp(Buffer.from(svg, "utf8"))
  .resize({ width: W * pngScale, height: H * pngScale, fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, `${baseName}.png`));

console.log(`✓ ${baseName}.svg + .png regenerated (${W}x${H} @${pngScale}x)`);
