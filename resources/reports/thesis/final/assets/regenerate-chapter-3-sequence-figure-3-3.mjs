import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const outDir = path.resolve("resources/reports/thesis/final/assets/figures-condensed-r2");
const stroke = "#111111";
const font = "Times New Roman, Times, serif";
const pngScale = 3;
const variantArg = process.argv.find((arg) => arg.startsWith("--variant="));
const variant = variantArg ? variantArg.slice("--variant=".length) : "r1";

const presets = {
  r1: {
    baseName: "chapter-3-sequence-uml-hinh-3-3-lis3dsh-wake-r1",
    width: 2360,
    height: 1620,
    actorText: 28,
    labelText: 30,
    selfText: 28,
    frameText: 24,
    actors: [
      { x: 180, w: 250, label: "Xe \u0111ang \u0111\u1ed7" },
      { x: 780, w: 420, label: "Nh\u00e1nh \u0111\u00e1nh th\u1ee9c + LIS3DSH" },
      { x: 1400, w: 220, label: "ESP32-S3" },
      { x: 2080, w: 360, label: "Ngo\u1ea1i vi c\u1ea7n ng\u1ee7" },
    ],
  },
  r2: {
    baseName: "chapter-3-sequence-uml-hinh-3-3-lis3dsh-wake-r2",
    width: 1720,
    height: 1180,
    actorText: 32,
    labelText: 32,
    selfText: 32,
    frameText: 28,
    actors: [
      { x: 150, w: 250, label: "Xe \u0111ang \u0111\u1ed7" },
      { x: 620, w: 430, label: "Nh\u00e1nh \u0111\u00e1nh th\u1ee9c + LIS3DSH" },
      { x: 1080, w: 230, label: "ESP32-S3" },
      { x: 1530, w: 300, label: "Ngo\u1ea1i vi c\u1ea7n ng\u1ee7" },
    ],
  },
};

const preset = presets[variant] ?? presets.r1;
const { baseName, width, height, actors } = preset;
const lifeBottom = height - 36;

const markerDefs = `
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${stroke}"/>
  </marker>
</defs>`;

const esc = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const drawTextLines = (x, y, lines, size = preset.labelText, weight = 400, anchor = "middle") => {
  const lineHeight = size * 1.22;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${startY + index * lineHeight}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${stroke}" dominant-baseline="middle">${esc(line)}</text>`,
    )
    .join("");
};

const labelWidth = (lines, size) => Math.max(...lines.map((line) => line.length), 4) * size * 0.5 + 34;
const labelHeight = (lines, size) => lines.length * size * 1.22 + 20;

const drawLabel = (x, y, lines, size = preset.labelText) => {
  const w = labelWidth(lines, size);
  const h = labelHeight(lines, size);
  return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="10" fill="#ffffff"/>${drawTextLines(x, y + 1, lines, size)}`;
};

const drawActor = ({ x, w, label }) =>
  `<rect x="${x - w / 2}" y="28" width="${w}" height="98" rx="8" fill="#ffffff" stroke="${stroke}" stroke-width="2.2"/>` +
  drawTextLines(x, 77, [label], preset.actorText) +
  `<line x1="${x}" y1="126" x2="${x}" y2="${lifeBottom}" stroke="${stroke}" stroke-width="3.6"/>`;

const drawArrow = (x1, y1, x2, y2, dashed = false) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="3.6" ${dashed ? 'stroke-dasharray="12 9"' : ""} marker-end="url(#arrow)"/>`;

const drawMessage = ({ from, to, y, lines, dashed = false, size = preset.labelText, lift = 34 }) => {
  const startX = from < to ? from + 4 : from - 4;
  const endX = from < to ? to - 4 : to + 4;
  const midX = (from + to) / 2;
  const h = labelHeight(lines, size);
  const labelY = y - h / 2 - Math.max(lift, 14);
  return `${drawArrow(startX, y, endX, y, dashed)}${drawLabel(midX, labelY, lines, size)}`;
};

const drawSelfMessage = ({ x, y, lines, size = preset.selfText, dx = 72, dy = 54 }) => {
  const path = `M ${x} ${y} H ${x + dx} V ${y + dy} H ${x}`;
  const h = labelHeight(lines, size);
  const labelX = x + dx / 2;
  const labelY = y - h / 2 - 16;
  return `<path d="${path}" fill="none" stroke="${stroke}" stroke-width="3.6" marker-end="url(#arrow)"/>${drawLabel(labelX, labelY, lines, size)}`;
};

const drawFrame = ({ x, y, w, h, label, dividerY }) => {
  const headerW = label === "alt" ? 66 : 78;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${stroke}" stroke-width="2.8" stroke-dasharray="3 3"/>` +
    `<path d="M ${x} ${y} H ${x + headerW} L ${x + headerW - 14} ${y + 34} H ${x} Z" fill="#ffffff" stroke="${stroke}" stroke-width="2"/>` +
    drawTextLines(x + headerW / 2 - 6, y + 18, [label], preset.frameText, 700) +
    (dividerY ? `<line x1="${x}" y1="${dividerY}" x2="${x + w}" y2="${dividerY}" stroke="${stroke}" stroke-width="2.2" stroke-dasharray="10 8"/>` : "");
};

const renderR1 = () => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${markerDefs}
<rect width="100%" height="100%" fill="#ffffff"/>
${actors.map(drawActor).join("")}
${drawMessage({ from: 180, to: 780, y: 190, lines: ["Kh\u00f3a \u0111i\u1ec7n t\u1eaft"] })}
${drawSelfMessage({ x: 1400, y: 330, lines: ["Chuy\u1ec3n sang", "ch\u1ebf \u0111\u1ed9 ng\u1ee7"], size: 28, dx: 92, dy: 56 })}
${drawMessage({ from: 1400, to: 780, y: 460, lines: ["Ch\u1ec9 gi\u1eef nh\u00e1nh \u0111\u00e1nh th\u1ee9c"], size: 30 })}
${drawMessage({ from: 780, to: 2080, y: 590, lines: ["T\u1eaft modem, GNSS", "v\u00e0 OBD-II"], size: 30 })}
${drawSelfMessage({ x: 780, y: 760, lines: ["Theo d\u00f5i rung", "v\u00e0 d\u1ecbch chuy\u1ec3n"], size: 28, dx: 96, dy: 58 })}
${drawFrame({ x: 380, y: 930, w: 1820, h: 520, label: "alt", dividerY: 1165 })}
${drawTextLines(1290, 980, ["[Kh\u00f4ng c\u00f3 rung]"], 28)}
${drawTextLines(1290, 1198, ["[C\u00f3 rung / d\u1ecbch chuy\u1ec3n]"], 28)}
${drawTextLines(780, 1080, ["Ti\u1ebfp t\u1ee5c gi\u00e1m s\u00e1t", "ti\u00eau th\u1ee5 th\u1ea5p"], 28)}
${drawMessage({ from: 780, to: 1400, y: 1285, lines: ["Ph\u00e1t t\u00edn hi\u1ec7u \u0111\u00e1nh th\u1ee9c"], dashed: true, size: 30 })}
${drawMessage({ from: 1400, to: 2080, y: 1400, lines: ["B\u1eadt l\u1ea1i ngo\u1ea1i vi", "c\u1ea7n d\u00f9ng"], size: 30 })}
</svg>`;

const renderR2 = () => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
${markerDefs}
<rect width="100%" height="100%" fill="#ffffff"/>
${actors.map(drawActor).join("")}
${drawMessage({ from: 150, to: 620, y: 208, lines: ["Kh\u00f3a \u0111i\u1ec7n t\u1eaft"], size: 34 })}
${drawSelfMessage({ x: 1080, y: 372, lines: ["Chuy\u1ec3n sang", "ch\u1ebf \u0111\u1ed9 ng\u1ee7"], size: 32, dx: 92, dy: 58 })}
${drawMessage({ from: 1080, to: 620, y: 500, lines: ["Ch\u1ec9 gi\u1eef nh\u00e1nh \u0111\u00e1nh th\u1ee9c"], size: 30 })}
${drawMessage({ from: 620, to: 1530, y: 620, lines: ["T\u1eaft GNSS, 4G", "v\u00e0 OBD-II"], size: 30 })}
${drawSelfMessage({ x: 620, y: 792, lines: ["Theo d\u00f5i rung", "v\u00e0 d\u1ecbch chuy\u1ec3n"], size: 32, dx: 88, dy: 58 })}
${drawFrame({ x: 220, y: 900, w: 1360, h: 240, label: "alt", dividerY: 1016 })}
${drawTextLines(980, 950, ["[Kh\u00f4ng c\u00f3 rung]"], 30)}
${drawTextLines(620, 1046, ["Ti\u1ebfp t\u1ee5c gi\u00e1m s\u00e1t"], 30)}
${drawTextLines(980, 1068, ["[C\u00f3 rung / d\u1ecbch chuy\u1ec3n]"], 30)}
${drawMessage({ from: 620, to: 1080, y: 1092, lines: ["Ph\u00e1t t\u00edn hi\u1ec7u \u0111\u00e1nh th\u1ee9c"], dashed: true, size: 28, lift: 20 })}
${drawMessage({ from: 1080, to: 1530, y: 1128, lines: ["B\u1eadt l\u1ea1i ngo\u1ea1i vi"], size: 28, lift: 14 })}
</svg>`;

const svg = variant === "r2" ? renderR2() : renderR1();

await writeFile(path.join(outDir, `${baseName}.svg`), svg, "utf8");
await sharp(Buffer.from(svg, "utf8"))
  .resize({ width: width * pngScale, height: height * pngScale, fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, `${baseName}.png`));
