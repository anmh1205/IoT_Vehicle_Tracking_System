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
</defs>`;

const esc = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const iconFrame = (x, y) =>
  `<g transform="translate(${x},${y})" stroke="${stroke}" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">`;

const icons = {
  car: (x, y) => `${iconFrame(x, y)}<path d="M10 33 L15 22 Q17 18 23 18 H37 Q43 18 45 22 L50 33"/><rect x="8" y="28" width="44" height="12" rx="5"/><path d="M19 18 L23 11 H37 L41 18"/><circle cx="18" cy="40" r="4"/><circle cx="42" cy="40" r="4"/></g>`,
  device: (x, y) => `${iconFrame(x, y)}<rect x="12" y="6" width="28" height="40" rx="6"/><line x1="18" y1="12" x2="34" y2="12"/><circle cx="26" cy="39" r="2.5"/><rect x="18" y="18" width="16" height="12" rx="2"/></g>`,
  document: (x, y) => `${iconFrame(x, y)}<path d="M17 8 H33 L41 16 V44 H17 Z"/><path d="M33 8 V16 H41"/><line x1="22" y1="24" x2="36" y2="24"/><line x1="22" y1="30" x2="36" y2="30"/><line x1="22" y1="36" x2="33" y2="36"/></g>`,
  server: (x, y) => `${iconFrame(x, y)}<rect x="12" y="10" width="28" height="9" rx="3"/><rect x="12" y="22" width="28" height="9" rx="3"/><rect x="12" y="34" width="28" height="9" rx="3"/><circle cx="18" cy="14.5" r="1.5" fill="${stroke}"/><circle cx="18" cy="26.5" r="1.5" fill="${stroke}"/><circle cx="18" cy="38.5" r="1.5" fill="${stroke}"/></g>`,
  dashboard: (x, y) => `${iconFrame(x, y)}<rect x="10" y="10" width="32" height="28" rx="4"/><line x1="10" y1="20" x2="42" y2="20"/><rect x="15" y="24" width="9" height="9" rx="1.5"/><rect x="28" y="24" width="9" height="9" rx="1.5"/></g>`,
  obd: (x, y) => `${iconFrame(x, y)}<path d="M12 18 H40 Q44 18 46 22 L44 34 Q43 38 39 38 H13 Q9 38 8 34 L6 22 Q8 18 12 18 Z"/>${[14, 20, 26, 32, 38].map((cx) => `<circle cx="${cx}" cy="27" r="1.4" fill="${stroke}"/>`).join("")}${[17, 23, 29, 35].map((cx) => `<circle cx="${cx}" cy="31.5" r="1.4" fill="${stroke}"/>`).join("")}</g>`,
  bluetooth: (x, y) => `${iconFrame(x, y)}<line x1="26" y1="8" x2="26" y2="44"/><path d="M26 8 L38 18 L26 26 L38 36 L26 44"/><path d="M14 18 L26 26 L14 34"/></g>`,
  module: (x, y) => `${iconFrame(x, y)}<rect x="11" y="12" width="30" height="24" rx="4"/><rect x="19" y="18" width="14" height="12" rx="2"/><line x1="45" y1="17" x2="49" y2="14"/><line x1="45" y1="22" x2="50" y2="22"/><line x1="45" y1="27" x2="49" y2="30"/></g>`,
  satellite: (x, y) => `${iconFrame(x, y)}<rect x="21" y="20" width="10" height="10" rx="1.5" transform="rotate(25 26 25)"/><path d="M17 17 L11 11 L15 7 L21 13"/><path d="M35 33 L41 39 L37 43 L31 37"/><line x1="31" y1="21" x2="42" y2="10"/><path d="M38 14 Q44 16 46 22"/><path d="M34 10 Q43 12 48 20"/></g>`,
  antenna: (x, y) => `${iconFrame(x, y)}<line x1="26" y1="16" x2="26" y2="38"/><line x1="18" y1="44" x2="34" y2="44"/><path d="M19 24 Q26 16 33 24"/><path d="M13 19 Q26 7 39 19"/><path d="M8 14 Q26 -2 44 14"/></g>`,
  motion: (x, y) => `${iconFrame(x, y)}<line x1="26" y1="10" x2="26" y2="42"/><line x1="10" y1="26" x2="42" y2="26"/><path d="M26 10 L22 14 M26 10 L30 14"/><path d="M42 26 L38 22 M42 26 L38 30"/><path d="M26 42 L22 38 M26 42 L30 38"/><path d="M10 26 L14 22 M10 26 L14 30"/></g>`,
  battery: (x, y) => `${iconFrame(x, y)}<rect x="14" y="10" width="22" height="32" rx="3"/><rect x="20" y="6" width="10" height="4" rx="1.5"/><line x1="25" y1="18" x2="25" y2="28"/><line x1="20" y1="23" x2="30" y2="23"/><line x1="20" y1="34" x2="30" y2="34"/></g>`,
  chip: (x, y) => `${iconFrame(x, y)}<rect x="14" y="14" width="24" height="24" rx="4"/>${[10, 18, 26, 34, 42].map((px) => `<line x1="${px}" y1="8" x2="${px}" y2="14"/><line x1="${px}" y1="38" x2="${px}" y2="44"/>`).join("")}${[10, 18, 26, 34, 42].map((py) => `<line x1="8" y1="${py}" x2="14" y2="${py}"/><line x1="38" y1="${py}" x2="44" y2="${py}"/>`).join("")}</g>`,
  clock: (x, y) => `${iconFrame(x, y)}<circle cx="26" cy="26" r="16"/><line x1="26" y1="26" x2="26" y2="16"/><line x1="26" y1="26" x2="34" y2="31"/></g>`,
  database: (x, y) => `${iconFrame(x, y)}<ellipse cx="26" cy="14" rx="14" ry="6"/><path d="M12 14 V36 C12 39 18 42 26 42 C34 42 40 39 40 36 V14"/><path d="M12 24 C12 27 18 30 26 30 C34 30 40 27 40 24"/><path d="M12 32 C12 35 18 38 26 38 C34 38 40 35 40 32"/></g>`,
  alert: (x, y) => `${iconFrame(x, y)}<path d="M26 10 L42 40 H10 Z"/><line x1="26" y1="20" x2="26" y2="31"/><circle cx="26" cy="36" r="1.8" fill="${stroke}"/></g>`,
  map: (x, y) => `${iconFrame(x, y)}<path d="M10 15 L20 11 L31 16 L42 12 V37 L31 41 L20 36 L10 40 Z"/><line x1="20" y1="11" x2="20" y2="36"/><line x1="31" y1="16" x2="31" y2="41"/></g>`,
  message: (x, y) => `${iconFrame(x, y)}<rect x="10" y="12" width="32" height="22" rx="4"/><path d="M16 20 L26 28 L36 20"/></g>`,
  route: (x, y) => `${iconFrame(x, y)}<circle cx="16" cy="34" r="4"/><circle cx="36" cy="14" r="4"/><path d="M20 34 C24 30 24 23 30 21 C34 20 34 17 32 14"/></g>`,
  plug: (x, y) => `${iconFrame(x, y)}<path d="M18 14 V24 M34 14 V24 M18 24 H34 V30 C34 36 30 40 24 40 H22"/><line x1="22" y1="40" x2="22" y2="46"/></g>`,
  link: (x, y) => `${iconFrame(x, y)}<path d="M18 31 L13 36 C10 39 10 43 13 46 C16 49 20 49 23 46 L28 41"/><path d="M34 21 L39 16 C42 13 42 9 39 6 C36 3 32 3 29 6 L24 11"/><line x1="20" y1="34" x2="32" y2="22"/></g>`,
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

const drawGroup = ({
  x,
  y,
  w,
  h,
  title,
  items,
  headerH = 64,
  titleSize = 30,
  itemStartY = 90,
  itemGap = 96,
  itemH = 72,
  itemSize = 24,
  itemIconSize = 40,
}) => {
  let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#ffffff" stroke="${stroke}" stroke-width="2.6"/><line x1="${x}" y1="${y + headerH}" x2="${x + w}" y2="${y + headerH}" stroke="${stroke}" stroke-width="2.2"/>${drawTextLines({ x: x + w / 2, y: y + headerH / 2, lines: [title], size: titleSize, weight: 700 })}`;
  items.forEach((item, index) => {
    svg += drawNode({
      x: x + 22,
      y: y + itemStartY + index * itemGap,
      w: w - 44,
      h: itemH,
      lines: item.lines,
      icon: item.icon,
      size: itemSize,
      iconSize: itemIconSize,
    });
  });
  return svg;
};

const writeFigure = async (baseName, width, height, body) => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${markerDefs}<rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`;
  await writeFile(path.join(outDir, `${baseName}.svg`), svg, "utf8");
  await sharp(Buffer.from(svg, "utf8"))
    .resize({ width: width * pngScale, height: height * pngScale, fit: "fill" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, `${baseName}.png`));
};

const tasks = [];

{
  const nodes = [
    { icon: "car", lines: ["Tr\u1ea1ng th\u00e1i", "th\u1ef1c c\u1ee7a xe"] },
    { icon: "device", lines: ["Thi\u1ebft b\u1ecb", "theo d\u00f5i"] },
    { icon: "document", lines: ["B\u1ea3n tin", "gi\u00e1m s\u00e1t"] },
    { icon: "server", lines: ["M\u00e1y ch\u1ee7", "x\u1eed l\u00fd"] },
    { icon: "dashboard", lines: ["Giao di\u1ec7n", "qu\u1ea3n l\u00fd"] },
  ];
  let body = "";
  nodes.forEach((node, index) => {
    const x = 40 + index * 375;
    body += drawNode({ x, y: 160, w: 320, h: 110, lines: node.lines, icon: node.icon, size: 27, iconSize: 48 });
    if (index < nodes.length - 1) body += drawArrow(x + 320, 215, x + 367, 215);
  });
  tasks.push(writeFigure("chapter-3-sticker-text-hinh-3-1-system-flow-r11", 2100, 430, body));
}

{
  const nodes = [
    { icon: "obd", lines: ["C\u1ed5ng OBD-II", "tr\u00ean xe"] },
    { icon: "bluetooth", lines: ["B\u1ed9 \u0111\u1ecdc vgate iCar Pro", "Bluetooth"] },
    { icon: "device", lines: ["Thi\u1ebft b\u1ecb", "theo d\u00f5i"] },
    { icon: "document", lines: ["B\u1ea3n tin", "gi\u00e1m s\u00e1t"] },
  ];
  let body = "";
  nodes.forEach((node, index) => {
    const x = 30 + index * 428;
    body += drawNode({ x, y: 156, w: 380, h: 116, lines: node.lines, icon: node.icon, size: 27, iconSize: 48 });
    if (index < nodes.length - 1) body += drawArrow(x + 380, 214, x + 420, 214);
  });
  tasks.push(writeFigure("chapter-3-sticker-text-hinh-3-2-obd-ii-ble-r11", 2050, 430, body));
}

{
  const body =
    `${drawNode({ x: 80, y: 360, w: 420, h: 120, lines: ["Thi\u1ebft b\u1ecb", "theo d\u00f5i"], icon: "device", size: 30, iconSize: 56 })}` +
    `${drawNode({ x: 760, y: 350, w: 520, h: 140, lines: ["SIM7600CE-T", "LTE + GNSS"], icon: "module", size: 30, iconSize: 58 })}` +
    `${drawNode({ x: 1500, y: 190, w: 420, h: 130, lines: ["V\u1ec7 tinh GNSS", "ph\u00e1t t\u00edn hi\u1ec7u \u0111\u1ecbnh v\u1ecb"], icon: "satellite", size: 28, iconSize: 56 })}` +
    `${drawNode({ x: 1500, y: 560, w: 420, h: 130, lines: ["M\u1ea1ng di \u0111\u1ed9ng", "truy\u1ec1n b\u1ea3n tin"], icon: "antenna", size: 28, iconSize: 56 })}` +
    `${drawArrow(500, 420, 752, 420)}` +
    `${drawPolyline([[1492, 255], [1410, 255], [1410, 385], [1288, 385]])}` +
    `${drawPolyline([[1280, 455], [1410, 455], [1410, 625], [1492, 625]])}`;
  tasks.push(writeFigure("chapter-3-sticker-text-hinh-3-4-lte-gnss-r11", 2050, 900, body));
}

{
  const controllerX = 670;
  const controllerY = 330;
  const controllerW = 720;
  const controllerH = 220;
  const leftNodeX = 70;
  const leftNodeW = 470;
  const leftNodeH = 140;
  const rightNodeX = 1510;
  const rightNodeW = 620;
  const rightNodeH = 140;
  const controllerMidY = controllerY + controllerH / 2;
  const leftNodes = [
    { y: 100, icon: "obd", lines: ["D\u1eef li\u1ec7u xe", "qua OBD-II"] },
    { y: 320, icon: "motion", lines: ["Rung v\u00e0 chuy\u1ec3n \u0111\u1ed9ng", "khi xe \u0111\u1ed7"] },
    { y: 540, icon: "battery", lines: ["Ngu\u1ed3n v\u00e0", "tr\u1ea1ng th\u00e1i thi\u1ebft b\u1ecb"] },
  ];
  const rightNodes = [
    { y: 80, icon: "link", lines: ["M\u00f4-\u0111un LTE/GNSS", "l\u1ea5y v\u1ecb tr\u00ed", "v\u00e0 gi\u1eef k\u1ebft n\u1ed1i"], bidirectional: true },
    { y: 300, icon: "clock", lines: ["B\u1ed9 nh\u1edb \u0111\u1ec7m c\u1ee5c b\u1ed9", "v\u00e0 th\u1eddi gian", "h\u1ec7 th\u1ed1ng"], bidirectional: true },
    { y: 520, icon: "document", lines: ["B\u1ea3n tin", "gi\u00e1m s\u00e1t"] },
    { y: 740, icon: "alert", lines: ["C\u1ea3nh b\u00e1o", "s\u1ef1 ki\u1ec7n"] },
  ];
  let body = drawNode({
    x: controllerX,
    y: controllerY,
    w: controllerW,
    h: controllerH,
    lines: ["ESP32-S3", "\u0111i\u1ec1u ph\u1ed1i tr\u1ea1ng th\u00e1i,", "qu\u1ea3n l\u00fd ngo\u1ea1i vi", "v\u00e0 t\u1ea1o b\u1ea3n tin"],
    icon: "chip",
    size: 28,
    weight: 700,
    iconSize: 72,
  });
  leftNodes.forEach((node) => {
    const nodeMidY = node.y + leftNodeH / 2;
    body += drawNode({
      x: leftNodeX,
      y: node.y,
      w: leftNodeW,
      h: leftNodeH,
      lines: node.lines,
      icon: node.icon,
      size: 29,
      iconSize: 62,
    });
    body += drawPolyline([
      [leftNodeX + leftNodeW, nodeMidY],
      [610, nodeMidY],
      [610, controllerMidY],
      [controllerX - 10, controllerMidY],
    ]);
  });
  rightNodes.forEach((node) => {
    const nodeMidY = node.y + rightNodeH / 2;
    body += drawNode({
      x: rightNodeX,
      y: node.y,
      w: rightNodeW,
      h: rightNodeH,
      lines: node.lines,
      icon: node.icon,
      size: 27,
      iconSize: 60,
    });
    body += drawPolyline([
      [controllerX + controllerW + 10, controllerMidY],
      [1450, controllerMidY],
      [1450, nodeMidY],
      [rightNodeX - 8, nodeMidY],
    ]);
    if (node.bidirectional) {
      body += drawPolyline([
        [rightNodeX - 8, nodeMidY + 20],
        [1450, nodeMidY + 20],
        [1450, controllerMidY + 30],
        [controllerX + controllerW + 10, controllerMidY + 30],
      ]);
    }
  });
  tasks.push(writeFigure("chapter-3-sticker-text-hinh-3-5-esp32-role-r11", 2240, 980, body));
}

{
  const body =
    `${drawGroup({
      x: 40,
      y: 50,
      w: 520,
      h: 760,
      title: "Thi\u1ebft b\u1ecb tr\u00ean xe",
      items: [
        { icon: "chip", lines: ["ESP32-S3 \u0111i\u1ec1u ph\u1ed1i"] },
        { icon: "obd", lines: ["B\u1ed9 \u0111\u1ecdc OBD-II BLE"] },
        { icon: "module", lines: ["SIM7600CE-T LTE/GNSS"] },
        { icon: "motion", lines: ["LIS3DSH \u0111\u00e1nh th\u1ee9c"] },
        { icon: "database", lines: ["B\u1ed9 nh\u1edb \u0111\u1ec7m c\u1ee5c b\u1ed9"] },
      ],
      headerH: 74,
      titleSize: 36,
      itemStartY: 100,
      itemGap: 96,
      itemH: 78,
      itemSize: 30,
      itemIconSize: 42,
    })}` +
    `${drawGroup({
      x: 645,
      y: 50,
      w: 520,
      h: 760,
      title: "Ti\u1ebfp nh\u1eadn v\u00e0 x\u1eed l\u00fd",
      items: [
        { icon: "message", lines: ["Nh\u1eadn b\u1ea3n tin MQTT"] },
        { icon: "link", lines: ["Chu\u1ea9n h\u00f3a d\u1eef li\u1ec7u"] },
        { icon: "database", lines: ["L\u01b0u tr\u1eef d\u1eef li\u1ec7u"] },
        { icon: "alert", lines: ["X\u1eed l\u00fd c\u1ea3nh b\u00e1o"] },
        { icon: "plug", lines: ["Cung c\u1ea5p d\u1eef li\u1ec7u"] },
      ],
      headerH: 74,
      titleSize: 36,
      itemStartY: 100,
      itemGap: 96,
      itemH: 78,
      itemSize: 30,
      itemIconSize: 42,
    })}` +
    `${drawGroup({
      x: 1250,
      y: 50,
      w: 520,
      h: 760,
      title: "Giao di\u1ec7n khai th\u00e1c",
      items: [
        { icon: "map", lines: ["B\u1ea3n \u0111\u1ed3 v\u1ecb tr\u00ed"] },
        { icon: "car", lines: ["Tr\u1ea1ng th\u00e1i xe"] },
        { icon: "route", lines: ["L\u1ecbch s\u1eed h\u00e0nh tr\u00ecnh"] },
        { icon: "alert", lines: ["H\u00e0ng \u0111\u1ee3i c\u1ea3nh b\u00e1o"] },
        { icon: "document", lines: ["B\u00e1o c\u00e1o \u0111o ki\u1ec3m"] },
      ],
      headerH: 74,
      titleSize: 36,
      itemStartY: 100,
      itemGap: 96,
      itemH: 78,
      itemSize: 30,
      itemIconSize: 42,
    })}` +
    `${drawArrow(560, 430, 637, 430)}` +
    `${drawArrow(1165, 430, 1242, 430)}`;
  tasks.push(writeFigure("chapter-3-sticker-text-hinh-3-6-selected-architecture-r11", 1810, 860, body));
}

{
  const left = [
    { icon: "car", lines: ["\u00cdt x\u00e2m l\u1ea5n", "l\u00ean xe"] },
    { icon: "battery", lines: ["Ti\u1ebft ki\u1ec7m \u0111i\u1ec7n", "khi xe \u0111\u1ed7"] },
    { icon: "link", lines: ["Ch\u1ecbu \u0111\u01b0\u1ee3c m\u1ea5t", "s\u00f3ng c\u1ee5c b\u1ed9"] },
    { icon: "module", lines: ["Gom truy\u1ec1n d\u1eef li\u1ec7u", "v\u00e0 \u0111\u1ecbnh v\u1ecb"] },
    { icon: "dashboard", lines: ["Giao di\u1ec7n g\u1ecdn", "cho v\u1eadn h\u00e0nh"] },
  ];
  const right = [
    { icon: "obd", lines: ["OBD-II", "Bluetooth"] },
    { icon: "motion", lines: ["LIS3DSH v\u00e0 nh\u00e1nh", "\u0111\u00e1nh th\u1ee9c ri\u00eang"] },
    { icon: "database", lines: ["B\u1ed9 nh\u1edb \u0111\u1ec7m c\u1ee5c b\u1ed9", "v\u00e0 g\u1eedi b\u00f9 khi c\u00f3 m\u1ea1ng l\u1ea1i"] },
    { icon: "module", lines: ["SIM7600CE-T", "LTE/GNSS"] },
    { icon: "map", lines: ["B\u1ea3n \u0111\u1ed3, tr\u1ea1ng th\u00e1i", "v\u00e0 c\u1ea3nh b\u00e1o"] },
  ];
  const ys = [50, 210, 370, 530, 690];
  let body = "";
  ys.forEach((y, index) => {
    body += drawNode({ x: 40, y, w: 340, h: 112, lines: left[index].lines, icon: left[index].icon, size: 33, iconSize: 48 });
    body += drawNode({ x: 580, y, w: 340, h: 112, lines: right[index].lines, icon: right[index].icon, size: 28, iconSize: 48 });
    body += drawArrow(380, y + 56, 570, y + 56);
  });
  tasks.push(writeFigure("chapter-3-sticker-text-hinh-3-7-constraints-r11", 960, 860, body));
}

await Promise.all(tasks);
