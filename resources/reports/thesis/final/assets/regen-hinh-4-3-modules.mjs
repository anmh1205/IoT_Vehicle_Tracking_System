/**
 * Hình 4.3 – Các mô-đun chính có trên bo mạch và quan hệ giữa các cụm chức năng
 * 
 * Layout đúng nguyên lý:
 *   - Khối nguồn (trên) cấp điện xuống 3 khối còn lại
 *   - Khối điều khiển (giữa) giao tiếp hai chiều với Cảm biến/Lưu trữ và Truyền thông
 *
 * Run: node resources/reports/thesis/final/assets/regen-hinh-4-3-modules.mjs
 */
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const outDir = path.resolve("resources/reports/thesis/final/assets/figures-condensed-r2");
const baseName = "07-chuong-4-trien-khai-hardware-hinh-4-14";
const pngScale = 3;

const W = 1800, H = 900;
const stroke = "#111111";
const font = "Times New Roman, Times, serif";

const markerDefs = `
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${stroke}"/>
  </marker>
</defs>`;

const esc = (t) => String(t).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function drawTextLines({ x, y, lines, size = 28, weight = 400, anchor = "middle" }) {
  const lh = size * 1.3;
  const startY = y - ((lines.length - 1) * lh) / 2;
  return lines.map((line, i) =>
    `<text x="${x}" y="${startY + i * lh}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${stroke}" dominant-baseline="middle">${esc(line)}</text>`
  ).join("");
}

function drawBox({ x, y, w, h, lines, size = 26, weight = 400 }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#ffffff" stroke="${stroke}" stroke-width="2.4"/>${drawTextLines({ x: x + w / 2, y: y + h / 2, lines, size, weight })}`;
}

function drawArrow(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2.4" marker-end="url(#arrow)"/>`;
}

function drawArrowBoth(x1, y1, x2, y2) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2.4" marker-start="url(#arrow)" marker-end="url(#arrow)"/>`;
}

function drawLabel(x, y, text, size = 20) {
  return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${font}" font-size="${size}" fill="${stroke}" font-style="italic" dominant-baseline="middle">${esc(text)}</text>`;
}

// Layout:
//         [Khối nguồn] (top center)
//              |  cấp điện
//              v
//   [Cảm biến/Lưu trữ]  <-->  [Khối điều khiển]  <-->  [Truyền thông/Định vị]
//         (left)                   (center)                    (right)

const boxW = 440, boxH = 180;

// Khối nguồn - top center
const powerX = (W - boxW) / 2, powerY = 80;

// Khối điều khiển - center
const ctrlX = (W - boxW) / 2, ctrlY = 520;

// Khối cảm biến - left
const sensorX = 100, sensorY = 520;

// Khối truyền thông - right
const commX = W - 100 - boxW, commY = 520;

let body = "";

// Title
body += drawTextLines({ x: W / 2, y: 40, lines: ["Các mô-đun chính có trên bo mạch"], size: 32, weight: 700 });

// Boxes
body += drawBox({
  x: powerX, y: powerY, w: boxW, h: boxH,
  lines: ["Khối nguồn", "MP2482, AP2112, TPS54231,", "TP5100, SX1308, pin 18650"],
  size: 26, weight: 700,
});

body += drawBox({
  x: ctrlX, y: ctrlY, w: boxW, h: boxH,
  lines: ["Khối điều khiển", "ESP32-S3, USB-C,", "nút nhấn, đèn báo, anten BLE"],
  size: 26, weight: 700,
});

body += drawBox({
  x: sensorX, y: sensorY, w: boxW, h: boxH,
  lines: ["Khối cảm biến và lưu trữ", "LIS3DSH, DS3231M,", "W25Q128, khe microSD"],
  size: 26, weight: 400,
});

body += drawBox({
  x: commX, y: commY, w: boxW, h: boxH,
  lines: ["Khối truyền thông – định vị", "SIM7600CE-T, khe microSIM,", "anten 4G/GNSS"],
  size: 26, weight: 400,
});

// Arrows from Nguồn down to the 3 other blocks
// Nguồn → Điều khiển (straight down)
body += drawArrow(W / 2, powerY + boxH, W / 2, ctrlY - 8);
body += drawLabel(W / 2 + 60, (powerY + boxH + ctrlY) / 2, "cấp điện");

// Nguồn → Cảm biến (diagonal left)
body += drawArrow(powerX + 60, powerY + boxH, sensorX + boxW / 2, sensorY - 8);
body += drawLabel(sensorX + boxW / 2 + 80, (powerY + boxH + sensorY) / 2 - 10, "cấp điện");

// Nguồn → Truyền thông (diagonal right)
body += drawArrow(powerX + boxW - 60, powerY + boxH, commX + boxW / 2, commY - 8);
body += drawLabel(commX + boxW / 2 - 80, (powerY + boxH + commY) / 2 - 10, "cấp điện");

// Điều khiển ↔ Cảm biến (horizontal left)
body += drawArrowBoth(ctrlX - 8, ctrlY + boxH / 2, sensorX + boxW + 8, sensorY + boxH / 2);
body += drawLabel((ctrlX + sensorX + boxW) / 2, ctrlY + boxH / 2 - 25, "dữ liệu");

// Điều khiển ↔ Truyền thông (horizontal right)
body += drawArrowBoth(ctrlX + boxW + 8, ctrlY + boxH / 2, commX - 8, commY + boxH / 2);
body += drawLabel((ctrlX + boxW + commX) / 2, ctrlY + boxH / 2 - 25, "dữ liệu + lệnh");

const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${markerDefs}<rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;

await writeFile(path.join(outDir, `${baseName}.svg`), svg, "utf8");
await sharp(Buffer.from(svg, "utf8"))
  .resize({ width: W * pngScale, height: H * pngScale, fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, `${baseName}.png`));

console.log(`✓ ${baseName}.svg + .png regenerated (${W}x${H} @${pngScale}x)`);
console.log("  Layout: Nguồn (trên) cấp xuống 3 khối; Điều khiển (giữa) ↔ Cảm biến (trái) ↔ Truyền thông (phải)");
