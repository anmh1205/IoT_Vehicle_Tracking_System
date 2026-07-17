/**
 * Regenerate chapter-4 figures in the "sticker" style used in chapter 3.
 * Targets: Hình 4.2, 4.3, 4.9, 4.10, 4.13
 *
 * Run: node resources/reports/thesis/final/assets/regenerate-chapter-4-sticker-figures.mjs
 */
import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const outDir = path.resolve("resources/reports/thesis/final/assets/figures-condensed-r2");
const stroke = "#111111";
const font = "Times New Roman, Times, serif";
const pngScale = 3;

const markerDefs = `
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${stroke}"/>
  </marker>
  <marker id="arrow-both" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${stroke}"/>
  </marker>
</defs>`;

const esc = (text) =>
  String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const iconFrame = (x, y) =>
  `<g transform="translate(${x},${y})" stroke="${stroke}" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">`;

const icons = {
  chip: (x, y) => `${iconFrame(x, y)}<rect x="14" y="14" width="24" height="24" rx="4"/>${[10, 18, 26, 34, 42].map((px) => `<line x1="${px}" y1="8" x2="${px}" y2="14"/><line x1="${px}" y1="38" x2="${px}" y2="44"/>`).join("")}${[10, 18, 26, 34, 42].map((py) => `<line x1="8" y1="${py}" x2="14" y2="${py}"/><line x1="38" y1="${py}" x2="44" y2="${py}"/>`).join("")}</g>`,
  obd: (x, y) => `${iconFrame(x, y)}<path d="M12 18 H40 Q44 18 46 22 L44 34 Q43 38 39 38 H13 Q9 38 8 34 L6 22 Q8 18 12 18 Z"/>${[14, 20, 26, 32, 38].map((cx) => `<circle cx="${cx}" cy="27" r="1.4" fill="${stroke}"/>`).join("")}${[17, 23, 29, 35].map((cx) => `<circle cx="${cx}" cy="31.5" r="1.4" fill="${stroke}"/>`).join("")}</g>`,
  motion: (x, y) => `${iconFrame(x, y)}<line x1="26" y1="10" x2="26" y2="42"/><line x1="10" y1="26" x2="42" y2="26"/><path d="M26 10 L22 14 M26 10 L30 14"/><path d="M42 26 L38 22 M42 26 L38 30"/><path d="M26 42 L22 38 M26 42 L30 38"/><path d="M10 26 L14 22 M10 26 L14 30"/></g>`,
  battery: (x, y) => `${iconFrame(x, y)}<rect x="14" y="10" width="22" height="32" rx="3"/><rect x="20" y="6" width="10" height="4" rx="1.5"/><line x1="25" y1="18" x2="25" y2="28"/><line x1="20" y1="23" x2="30" y2="23"/><line x1="20" y1="34" x2="30" y2="34"/></g>`,
  clock: (x, y) => `${iconFrame(x, y)}<circle cx="26" cy="26" r="16"/><line x1="26" y1="26" x2="26" y2="16"/><line x1="26" y1="26" x2="34" y2="31"/></g>`,
  database: (x, y) => `${iconFrame(x, y)}<ellipse cx="26" cy="14" rx="14" ry="6"/><path d="M12 14 V36 C12 39 18 42 26 42 C34 42 40 39 40 36 V14"/><path d="M12 24 C12 27 18 30 26 30 C34 30 40 27 40 24"/></g>`,
  link: (x, y) => `${iconFrame(x, y)}<path d="M18 31 L13 36 C10 39 10 43 13 46 C16 49 20 49 23 46 L28 41"/><path d="M34 21 L39 16 C42 13 42 9 39 6 C36 3 32 3 29 6 L24 11"/><line x1="20" y1="34" x2="32" y2="22"/></g>`,
  module: (x, y) => `${iconFrame(x, y)}<rect x="11" y="12" width="30" height="24" rx="4"/><rect x="19" y="18" width="14" height="12" rx="2"/><line x1="45" y1="17" x2="49" y2="14"/><line x1="45" y1="22" x2="50" y2="22"/><line x1="45" y1="27" x2="49" y2="30"/></g>`,
  document: (x, y) => `${iconFrame(x, y)}<path d="M17 8 H33 L41 16 V44 H17 Z"/><path d="M33 8 V16 H41"/><line x1="22" y1="24" x2="36" y2="24"/><line x1="22" y1="30" x2="36" y2="30"/><line x1="22" y1="36" x2="33" y2="36"/></g>`,
  alert: (x, y) => `${iconFrame(x, y)}<path d="M26 10 L42 40 H10 Z"/><line x1="26" y1="20" x2="26" y2="31"/><circle cx="26" cy="36" r="1.8" fill="${stroke}"/></g>`,
  server: (x, y) => `${iconFrame(x, y)}<rect x="12" y="10" width="28" height="9" rx="3"/><rect x="12" y="22" width="28" height="9" rx="3"/><rect x="12" y="34" width="28" height="9" rx="3"/><circle cx="18" cy="14.5" r="1.5" fill="${stroke}"/><circle cx="18" cy="26.5" r="1.5" fill="${stroke}"/><circle cx="18" cy="38.5" r="1.5" fill="${stroke}"/></g>`,
  message: (x, y) => `${iconFrame(x, y)}<rect x="10" y="12" width="32" height="22" rx="4"/><path d="M16 20 L26 28 L36 20"/></g>`,
  dashboard: (x, y) => `${iconFrame(x, y)}<rect x="10" y="10" width="32" height="28" rx="4"/><line x1="10" y1="20" x2="42" y2="20"/><rect x="15" y="24" width="9" height="9" rx="1.5"/><rect x="28" y="24" width="9" height="9" rx="1.5"/></g>`,
  usb: (x, y) => `${iconFrame(x, y)}<rect x="18" y="8" width="16" height="36" rx="4"/><line x1="22" y1="16" x2="30" y2="16"/><line x1="22" y1="22" x2="30" y2="22"/><circle cx="26" cy="34" r="3"/></g>`,
  satellite: (x, y) => `${iconFrame(x, y)}<rect x="21" y="20" width="10" height="10" rx="1.5" transform="rotate(25 26 25)"/><path d="M17 17 L11 11 L15 7 L21 13"/><path d="M35 33 L41 39 L37 43 L31 37"/><line x1="31" y1="21" x2="42" y2="10"/><path d="M38 14 Q44 16 46 22"/></g>`,
  power: (x, y) => `${iconFrame(x, y)}<line x1="26" y1="8" x2="26" y2="24"/><path d="M16 14 A14 14 0 1 0 36 14"/></g>`,
};

const drawTextLines = ({ x, y, lines, size = 28, weight = 400, anchor = "middle" }) => {
  const lineHeight = size * 1.25;
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${startY + index * lineHeight}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${stroke}" dominant-baseline="middle">${esc(line)}</text>`,
    )
    .join("");
};

const drawNode = ({ x, y, w, h, lines, icon, size = 28, weight = 400, iconSize = 52 }) => {
  const textCenterX = x + 18 + iconSize + 22 + (w - 18 - iconSize - 22) / 2;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#ffffff" stroke="${stroke}" stroke-width="2.4"/>${icons[icon](x + 18, y + (h - iconSize) / 2)}${drawTextLines({ x: textCenterX, y: y + h / 2, lines, size, weight })}</g>`;
};

const drawArrow = (x1, y1, x2, y2) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2.4" marker-end="url(#arrow)"/>`;

const drawPolyline = (points) =>
  `<polyline points="${points.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${stroke}" stroke-width="2.4" marker-end="url(#arrow)"/>`;

const drawPolylineBoth = (points) =>
  `<polyline points="${points.map(([x, y]) => `${x},${y}`).join(" ")}" fill="none" stroke="${stroke}" stroke-width="2.4" marker-start="url(#arrow-both)" marker-end="url(#arrow)"/>`;

const writeFigure = async (baseName, width, height, body) => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${markerDefs}<rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
  await writeFile(path.join(outDir, `${baseName}.svg`), svg, "utf8");
  await sharp(Buffer.from(svg, "utf8"))
    .resize({ width: width * pngScale, height: height * pngScale, fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, `${baseName}.png`));
  console.log(`  ✓ ${baseName}`);
};

const tasks = [];

// ═══════════════════════════════════════════════════════════════════════════════
// Hình 4.2 – Khối ESP32-S3 và các nhánh điều khiển trung tâm
// ═══════════════════════════════════════════════════════════════════════════════
{
  const W = 2100, H = 980;
  const controllerX = 650, controllerY = 330, controllerW = 700, controllerH = 220;
  const leftNodeX = 60, leftNodeW = 460, leftNodeH = 140;
  const rightNodeX = 1470, rightNodeW = 560, rightNodeH = 140;
  const controllerMidY = controllerY + controllerH / 2;

  const leftNodes = [
    { y: 100, icon: "obd", lines: ["Dữ liệu xe", "qua OBD-II BLE"] },
    { y: 320, icon: "motion", lines: ["Chuyển động", "từ LIS3DSH"] },
    { y: 540, icon: "battery", lines: ["Điện áp nguồn", "từ xe qua ADC"] },
  ];
  const rightNodes = [
    { y: 80, icon: "link", lines: ["SIM7600CE-T", "lấy vị trí và giữ kết nối"], bidirectional: true },
    { y: 300, icon: "clock", lines: ["Bộ nhớ đệm cục bộ", "và thời gian hệ thống"], bidirectional: true },
    { y: 520, icon: "document", lines: ["Bản tin", "giám sát"] },
    { y: 740, icon: "usb", lines: ["USB-C, nút nhấn", "và đèn báo"] },
  ];

  let body = drawNode({
    x: controllerX, y: controllerY, w: controllerW, h: controllerH,
    lines: ["ESP32-S3", "điều phối trạng thái,", "quản lý ngoại vi và tạo bản tin"],
    icon: "chip", size: 30, weight: 700, iconSize: 72,
  });

  leftNodes.forEach((node) => {
    const nodeMidY = node.y + leftNodeH / 2;
    body += drawNode({ x: leftNodeX, y: node.y, w: leftNodeW, h: leftNodeH, lines: node.lines, icon: node.icon, size: 30, iconSize: 62 });
    body += drawPolyline([[leftNodeX + leftNodeW, nodeMidY], [590, nodeMidY], [590, controllerMidY], [controllerX - 10, controllerMidY]]);
  });

  rightNodes.forEach((node) => {
    const nodeMidY = node.y + rightNodeH / 2;
    body += drawNode({ x: rightNodeX, y: node.y, w: rightNodeW, h: rightNodeH, lines: node.lines, icon: node.icon, size: 28, iconSize: 60 });
    body += drawPolyline([[controllerX + controllerW + 10, controllerMidY], [1410, controllerMidY], [1410, nodeMidY], [rightNodeX - 8, nodeMidY]]);
    if (node.bidirectional) {
      body += drawPolyline([[rightNodeX - 8, nodeMidY + 20], [1410, nodeMidY + 20], [1410, controllerMidY + 30], [controllerX + controllerW + 10, controllerMidY + 30]]);
    }
  });

  tasks.push(writeFigure("07-chuong-4-trien-khai-hardware-hinh-4-12", W, H, body));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hình 4.3 – Các mô-đun chính có trên bo mạch
// ═══════════════════════════════════════════════════════════════════════════════
{
  const W = 1900, H = 700;
  const nodeW = 380, nodeH = 160, gap = 80;
  const modules = [
    { icon: "battery", lines: ["Khối nguồn", "MP2482, AP2112,", "TPS54231, TP5100,", "SX1308, pin 18650"] },
    { icon: "chip", lines: ["Khối điều khiển", "ESP32-S3, USB-C,", "nút nhấn, đèn báo"] },
    { icon: "motion", lines: ["Khối cảm biến", "và lưu trữ", "LIS3DSH, DS3231M,", "W25Q128, microSD"] },
    { icon: "module", lines: ["Khối truyền thông", "và định vị", "SIM7600CE-T,", "microSIM, anten"] },
  ];

  const totalW = modules.length * nodeW + (modules.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const nodeY = (H - nodeH) / 2;

  let body = "";
  // Title
  body += drawTextLines({ x: W / 2, y: 50, lines: ["Các mô-đun chính có trên bo mạch"], size: 34, weight: 700 });

  modules.forEach((mod, i) => {
    const x = startX + i * (nodeW + gap);
    body += drawNode({ x, y: nodeY, w: nodeW, h: nodeH, lines: mod.lines, icon: mod.icon, size: 26, iconSize: 56 });
    if (i < modules.length - 1) {
      body += drawArrow(x + nodeW, nodeY + nodeH / 2, x + nodeW + gap - 8, nodeY + nodeH / 2);
    }
  });

  tasks.push(writeFigure("07-chuong-4-trien-khai-hardware-hinh-4-14", W, H, body));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hình 4.9 – Trình tự khởi động firmware (sticker style, not sequence)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const W = 2000, H = 700;
  const steps = [
    { icon: "power", lines: ["Cấp nguồn", "hoặc đánh thức"] },
    { icon: "database", lines: ["Nạp cấu hình", "làm việc"] },
    { icon: "chip", lines: ["Xác định", "nguyên nhân", "đánh thức"] },
    { icon: "satellite", lines: ["Kiểm tra", "trạng thái xe", "hiện tại"] },
    { icon: "document", lines: ["Chọn nhịp", "làm việc", "ban đầu"] },
  ];

  const nodeW = 320, nodeH = 150, gap = 60;
  const totalW = steps.length * nodeW + (steps.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const nodeY = (H - nodeH) / 2;

  let body = "";
  body += drawTextLines({ x: W / 2, y: 55, lines: ["Trình tự khởi động và chọn nhịp làm việc ban đầu"], size: 32, weight: 700 });

  steps.forEach((step, i) => {
    const x = startX + i * (nodeW + gap);
    body += drawNode({ x, y: nodeY, w: nodeW, h: nodeH, lines: step.lines, icon: step.icon, size: 27, iconSize: 52 });
    if (i < steps.length - 1) {
      body += drawArrow(x + nodeW, nodeY + nodeH / 2, x + nodeW + gap - 8, nodeY + nodeH / 2);
    }
  });

  // Annotation: alt branches at bottom
  const altY = nodeY + nodeH + 60;
  body += drawTextLines({ x: W / 2, y: altY, lines: ["Tùy nguyên nhân đánh thức → chọn pha phù hợp: Theo dõi khi xe chạy / Theo dõi khi xe đỗ / Kiểm tra định kỳ"], size: 24, weight: 400 });

  tasks.push(writeFigure("08-chuong-4-trien-khai-firmware-hinh-4-9-sequence-r2", W, H, body));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hình 4.10 – Thu dữ liệu và gửi bản tin (sticker style)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const W = 2100, H = 900;

  // Left column: data sources
  const srcX = 60, srcW = 440, srcH = 130;
  const sources = [
    { y: 140, icon: "obd", lines: ["Dữ liệu vận hành", "từ xe (OBD-II)"] },
    { y: 340, icon: "satellite", lines: ["Vị trí và tín hiệu", "định vị (GNSS)"] },
    { y: 540, icon: "battery", lines: ["Điện áp nguồn", "và trạng thái thiết bị"] },
  ];

  // Center: controller assembles
  const ctrlX = 700, ctrlY = 310, ctrlW = 500, ctrlH = 180;

  // Right column: output paths
  const outX = 1400, outW = 560, outH = 130;
  const outputs = [
    { y: 200, icon: "message", lines: ["Gửi bản tin", "lên máy chủ"], condition: "Kết nối ổn định" },
    { y: 500, icon: "database", lines: ["Lưu đệm cục bộ", "chờ gửi bù sau"], condition: "Mất mạng hoặc lỗi" },
  ];

  let body = "";
  body += drawTextLines({ x: W / 2, y: 55, lines: ["Thu dữ liệu và gửi bản tin trong pha hoạt động"], size: 32, weight: 700 });

  // Controller
  body += drawNode({ x: ctrlX, y: ctrlY, w: ctrlW, h: ctrlH, lines: ["Ghép dữ liệu xe,", "vị trí và nguồn", "thành bản tin giám sát"], icon: "chip", size: 28, weight: 700, iconSize: 64 });

  // Sources
  sources.forEach((src) => {
    body += drawNode({ x: srcX, y: src.y, w: srcW, h: srcH, lines: src.lines, icon: src.icon, size: 28, iconSize: 56 });
    body += drawPolyline([[srcX + srcW, src.y + srcH / 2], [ctrlX - 10, ctrlY + ctrlH / 2]]);
  });

  // Outputs
  outputs.forEach((out) => {
    body += drawNode({ x: outX, y: out.y, w: outW, h: outH, lines: out.lines, icon: out.icon, size: 28, iconSize: 56 });
    body += drawPolyline([[ctrlX + ctrlW + 10, ctrlY + ctrlH / 2], [outX - 10, out.y + outH / 2]]);
    // Condition label
    body += drawTextLines({ x: outX + outW / 2, y: out.y - 20, lines: [`[${out.condition}]`], size: 22, weight: 400 });
  });

  tasks.push(writeFigure("08-chuong-4-trien-khai-firmware-hinh-4-3d", W, H, body));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hình 4.13 – Cấu trúc triển khai các dịch vụ máy chủ (sticker style)
// ═══════════════════════════════════════════════════════════════════════════════
{
  const W = 2000, H = 750;

  const drawGroup = ({ x, y, w, h, title, items, headerH = 64, titleSize = 30, itemStartY = 90, itemGap = 96, itemH = 72, itemSize = 26, itemIconSize = 42 }) => {
    let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#ffffff" stroke="${stroke}" stroke-width="2.6"/>`;
    svg += `<line x1="${x}" y1="${y + headerH}" x2="${x + w}" y2="${y + headerH}" stroke="${stroke}" stroke-width="2.2"/>`;
    svg += drawTextLines({ x: x + w / 2, y: y + headerH / 2, lines: [title], size: titleSize, weight: 700 });
    items.forEach((item, index) => {
      svg += drawNode({
        x: x + 22, y: y + itemStartY + index * itemGap,
        w: w - 44, h: itemH, lines: item.lines, icon: item.icon, size: itemSize, iconSize: itemIconSize,
      });
    });
    return svg;
  };

  let body = "";

  body += drawGroup({
    x: 40, y: 60, w: 520, h: 620,
    title: "Nhóm tiếp nhận bản tin",
    items: [
      { icon: "message", lines: ["EMQX – Broker MQTT"] },
      { icon: "link", lines: ["MQTT Bridge – Cầu nối"] },
    ],
    headerH: 70, titleSize: 28, itemStartY: 100, itemGap: 120, itemH: 90, itemSize: 27, itemIconSize: 46,
  });

  body += drawGroup({
    x: 660, y: 60, w: 560, h: 620,
    title: "Nhóm lưu trữ",
    items: [
      { icon: "database", lines: ["PostgreSQL – Dữ liệu quản lý"] },
      { icon: "server", lines: ["VictoriaMetrics – Dữ liệu thời gian"] },
      { icon: "document", lines: ["VictoriaLogs – Nhật ký vận hành"] },
    ],
    headerH: 70, titleSize: 28, itemStartY: 100, itemGap: 120, itemH: 90, itemSize: 26, itemIconSize: 46,
  });

  body += drawGroup({
    x: 1320, y: 60, w: 620, h: 620,
    title: "Nhóm xử lý và khai thác",
    items: [
      { icon: "server", lines: ["Backend – API và cảnh báo"] },
      { icon: "dashboard", lines: ["Giao diện web – Theo dõi và tra cứu"] },
    ],
    headerH: 70, titleSize: 28, itemStartY: 100, itemGap: 120, itemH: 90, itemSize: 26, itemIconSize: 46,
  });

  // Arrows between groups
  body += drawArrow(560, 370, 652, 370);
  body += drawArrow(1220, 370, 1312, 370);

  tasks.push(writeFigure("09-chuong-4-trien-khai-cloud-hinh-4-16", W, H, body));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Execute all
// ═══════════════════════════════════════════════════════════════════════════════
console.log("Generating chapter-4 sticker figures...");
await Promise.all(tasks);
console.log("Done! All figures regenerated.");
