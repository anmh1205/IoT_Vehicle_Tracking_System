import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mermaidDiagrams } from "./thesis-mermaid-diagrams.mjs";

const outDir = join(process.cwd(), "resources", "reports", "thesis-chapters", "assets", "figures");
const mermaidConfigPath = join(process.cwd(), "resources", "reports", "thesis-chapters", "assets", "mermaid-thesis-config.json");
const mermaidTempDir = mkdtempSync(join(tmpdir(), "ivts-thesis-mermaid-"));
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
mkdirSync(outDir, { recursive: true });

const findCachedMermaidCli = () => {
  const cacheRoots = [
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "npm-cache", "_npx"),
    process.env.APPDATA && join(process.env.APPDATA, "npm-cache", "_npx"),
  ].filter(Boolean);

  for (const root of cacheRoots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = join(root, entry.name, "node_modules", "@mermaid-js", "mermaid-cli", "src", "cli.js");
      if (existsSync(candidate)) return candidate;
    }
  }

  return null;
};

const mermaidCliPath = findCachedMermaidCli();
const skipMermaidRender = process.env.SKIP_MERMAID_RENDER === "1";

const c = {
  bg: "#f4f7fb",
  surface: "#ffffff",
  surfaceSoft: "#eef4ff",
  line: "#cbd5e1",
  text: "#122033",
  muted: "#52637a",
  navy: "#1d4ed8",
  teal: "#0f766e",
  amber: "#c97a10",
  rose: "#d9485f",
  emerald: "#0f9d76",
  violet: "#6d4fe0",
  slate: "#64748b",
  sidebar: "#0f172a",
  sidebarSoft: "#1e293b",
};

const mojibakePattern = /(?:Ã.|Æ.|Ä.|Â.|áº|á»|â€¦|â€“|â€œ|â€|Î.)/u;

const normalizeText = (value) => {
  const original = String(value);
  if (!mojibakePattern.test(original)) return original;
  let current = original;
  for (let index = 0; index < 3; index += 1) {
    const converted = Buffer.from(current, "latin1").toString("utf8");
    if (converted === current) break;
    current = converted;
    if (!mojibakePattern.test(current)) break;
  }
  return current;
};

const esc = (value) =>
  normalizeText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const mix = (hex, alpha) => {
  const value = hex.replace("#", "");
  return `rgba(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)}, ${alpha})`;
};

const wrapText = (text, maxChars = 28) => {
  if (Array.isArray(text)) return text.flatMap((line) => wrapText(line, maxChars));
  const words = normalizeText(text).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    if (`${current} ${word}`.length <= maxChars) current = `${current} ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
};

const numberText = (value) => {
  if (Number.isInteger(value)) return `${value}`;
  return `${value}`.replace(/\.0$/, "");
};

const svgDoc = (w, h, { title, subtitle, accent = c.navy }, body) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="${mix(c.text, 0.14)}"/>
    </filter>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M1,1 L11,6 L1,11 Z" fill="${accent}"/>
    </marker>
    <marker id="arrow-slate" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M1,1 L11,6 L1,11 Z" fill="${c.slate}"/>
    </marker>
  </defs>
  <style>
    text {
      fill: ${c.text};
      font-family: "Segoe UI", "Noto Sans", Arial, sans-serif;
    }
    .title { font-size: 40px; font-weight: 750; letter-spacing: -0.02em; }
    .subtitle { font-size: 22px; fill: ${c.muted}; }
    .section-title { font-size: 24px; font-weight: 700; }
    .card-title { font-size: 26px; font-weight: 700; letter-spacing: -0.01em; }
    .body { font-size: 20px; }
    .small { font-size: 18px; fill: ${c.muted}; }
    .tiny { font-size: 15px; fill: ${c.muted}; }
    .chip { font-size: 15px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    .metric { font-size: 42px; font-weight: 760; }
    .mono { font-family: "Consolas", "Courier New", monospace; font-size: 18px; }
    .sidebar { fill: #f8fafc; font-size: 18px; font-weight: 600; }
  </style>
  <rect width="100%" height="100%" fill="${c.bg}"/>
  <rect x="32" y="32" width="${w - 64}" height="${h - 64}" rx="30" fill="none" stroke="${mix(accent, 0.12)}" stroke-width="2"/>
  <rect x="56" y="56" width="${w - 112}" height="${h - 112}" rx="28" fill="${mix("#ffffff", 0.45)}" stroke="none"/>
  ${title ? `<text x="84" y="106" class="title">${esc(title)}</text>` : ""}
  ${subtitle ? `<text x="84" y="142" class="subtitle">${esc(subtitle)}</text>` : ""}
  ${body}
</svg>`;

const box = (x, y, w, h, { fill = c.surface, stroke = c.line, rx = 24, shadow = true, strokeWidth = 2 } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${shadow ? 'filter="url(#shadow)"' : ""}/>`;

const softBox = (x, y, w, h, options = {}) =>
  box(x, y, w, h, { fill: c.surface, stroke: c.line, rx: 22, shadow: false, ...options });

const chip = (x, y, w, label, fill, color = "#fff") =>
  `${box(x, y, w, 34, { fill, stroke: fill, rx: 17, shadow: false })}<text x="${x + w / 2}" y="${y + 23}" class="chip" text-anchor="middle" fill="${color}">${esc(label)}</text>`;

const textBlock = (x, y, text, { cls = "body", anchor = "start", fill = c.text, lineHeight = 28, maxChars = 28 } = {}) => {
  const lines = Array.isArray(text) ? text : wrapText(text, maxChars);
  return `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}" fill="${fill}">${lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${esc(line)}</tspan>`)
    .join("")}</text>`;
};

const note = (x, y, text, width, fill = c.surfaceSoft, stroke = c.line) =>
  `${box(x, y, width, 54, { fill, stroke, rx: 18, shadow: false })}${textBlock(x + width / 2, y + 33, text, {
    cls: "small",
    anchor: "middle",
    maxChars: Math.max(14, Math.floor(width / 10)),
    lineHeight: 20,
  })}`;

const component = ({ x, y, w, h, title, body = [], accent = c.navy, fill = c.surface, stroke = c.line, tag }) => {
  const titleLines = wrapText(title, Math.max(14, Math.floor(w / 14)));
  const flatBody = Array.isArray(body) ? body.flatMap((entry) => wrapText(entry, Math.max(18, Math.floor(w / 11)))) : wrapText(body, Math.max(18, Math.floor(w / 11)));
  const titleY = y + 42;
  const bodyY = y + 96 + (titleLines.length - 1) * 28;
  return `
    ${box(x, y, w, h, { fill, stroke, rx: 26 })}
    <rect x="${x}" y="${y}" width="${w}" height="12" rx="26" fill="${accent}" stroke="none"/>
    ${tag ? chip(x + 18, y + 20, Math.min(Math.max(tag.length * 11, 90), w - 36), tag, mix(accent, 0.88)) : ""}
    ${textBlock(x + w / 2, titleY + (tag ? 22 : 0), titleLines, { cls: "card-title", anchor: "middle", lineHeight: 30 })}
    ${flatBody.length ? textBlock(x + w / 2, bodyY + (tag ? 12 : 0), flatBody, { cls: "body", anchor: "middle", lineHeight: 24 }) : ""}
  `;
};

const group = ({ x, y, w, h, title, accent, subtitle = "" }) => `
  ${box(x, y, w, h, { fill: c.surface, stroke: mix(accent, 0.28), rx: 30, shadow: false, strokeWidth: 3 })}
  ${chip(x + 24, y - 18, Math.min(220, Math.max(110, title.length * 12)), title, accent)}
  ${subtitle ? textBlock(x + 28, y + 34, subtitle, { cls: "small", maxChars: Math.max(18, Math.floor((w - 56) / 10)), lineHeight: 22 }) : ""}
`;

const edge = ({ x1, y1, x2, y2, color = c.slate, dashed = false, label = "", labelX = null, labelY = null, marker = "arrow-slate" }) => {
  const midX = labelX ?? (x1 + x2) / 2;
  const midY = labelY ?? (y1 + y2) / 2;
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="4" ${dashed ? 'stroke-dasharray="10 10"' : ""} marker-end="url(#${marker})"/>
    ${label ? note(midX - Math.min(Math.max(label.length * 6, 44), 90), midY - 22, label, Math.min(Math.max(label.length * 12, 88), 180), c.surface, mix(color, 0.28)) : ""}
  `;
};

const polyEdge = ({ points, color = c.slate, dashed = false, label = "", labelX = null, labelY = null, marker = "arrow-slate" }) => {
  const value = points.map(([px, py]) => `${px},${py}`).join(" ");
  const avgX = points.reduce((sum, [px]) => sum + px, 0) / points.length;
  const avgY = points.reduce((sum, [, py]) => sum + py, 0) / points.length;
  return `
    <polyline points="${value}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" ${dashed ? 'stroke-dasharray="10 10"' : ""} marker-end="url(#${marker})"/>
    ${label ? note((labelX ?? avgX) - Math.min(Math.max(label.length * 6, 44), 90), (labelY ?? avgY) - 22, label, Math.min(Math.max(label.length * 12, 88), 180), c.surface, mix(color, 0.28)) : ""}
  `;
};

const statCard = (x, y, title, value, delta, accent) => `
  ${box(x, y, 250, 142, { fill: c.surface, stroke: mix(accent, 0.26), rx: 24 })}
  <rect x="${x}" y="${y}" width="250" height="10" rx="24" fill="${accent}" stroke="none"/>
  ${textBlock(x + 28, y + 50, title, { cls: "small", maxChars: 18 })}
  <text x="${x + 28}" y="${y + 112}" class="metric">${esc(value)}</text>
  ${chip(x + 154, y + 96, 72, delta, accent)}
`;

const appShell = (title, subtitle, body, accent = c.navy) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent },
    `
      ${box(72, 178, 1456, 742, { fill: "#f8fbff", stroke: mix(accent, 0.18), rx: 34, shadow: false })}
      ${box(100, 214, 228, 672, { fill: c.sidebar, stroke: c.sidebar, rx: 28, shadow: false })}
      ${textBlock(138, 262, "Bảng điều khiển", { cls: "section-title", fill: "#f8fafc", maxChars: 14 })}
      ${["Tổng quan", "Phương tiện", "Bản đồ", "Cảnh báo", "Báo cáo", "Cấu hình"]
        .map((label, index) => `${box(126, 308 + index * 70, 176, 50, { fill: index === 0 ? c.sidebarSoft : c.sidebar, stroke: index === 0 ? mix(accent, 0.6) : c.sidebar, rx: 16, shadow: false })}${textBlock(214, 340 + index * 70, label, { cls: "sidebar", anchor: "middle", fill: "#f8fafc", maxChars: 14, lineHeight: 20 })}`)
        .join("")}
      ${box(354, 214, 1148, 86, { fill: c.surface, stroke: c.line, rx: 24, shadow: false })}
      ${note(382, 236, "Bộ lọc phương tiện", 188, c.surfaceSoft, mix(accent, 0.18))}
      ${note(590, 236, "Khoảng thời gian", 188, c.surfaceSoft, mix(accent, 0.18))}
      ${chip(1290, 236, 164, "Đồng bộ trực tiếp", accent)}
      ${body}
    `
  );

const lineChart = ({ x, y, w, h, title, subtitle, values, labels, yTicks, yMax, color, area = false, formatter = numberText }) => {
  const mapX = (index) => x + (index / (values.length - 1)) * w;
  const mapY = (value) => y + h - (value / yMax) * h;
  const points = values.map((value, index) => `${mapX(index)},${mapY(value)}`).join(" ");
  return `
    ${box(x - 28, y - 80, w + 56, h + 150, { fill: c.surface, stroke: c.line, rx: 28 })}
    ${textBlock(x, y - 38, title, { cls: "card-title", maxChars: 40 })}
    ${textBlock(x, y - 8, subtitle, { cls: "small", maxChars: 78, lineHeight: 22 })}
    ${yTicks
      .map((tick) => `<line x1="${x}" y1="${mapY(tick)}" x2="${x + w}" y2="${mapY(tick)}" stroke="${mix(c.line, 0.88)}" stroke-width="2" stroke-dasharray="10 10"/>${textBlock(x - 16, mapY(tick) + 7, formatter(tick), { cls: "small", anchor: "end" })}`)
      .join("")}
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    ${area ? `<polygon points="${x},${y + h} ${points} ${x + w},${y + h}" fill="${mix(color, 0.12)}" stroke="none"/>` : ""}
    ${labels.map((label, index) => textBlock(mapX(index), y + h + 32, label, { cls: "small", anchor: "middle", maxChars: 10, lineHeight: 20 })).join("")}
    ${values
      .map(
        (value, index) =>
          `<circle cx="${mapX(index)}" cy="${mapY(value)}" r="7" fill="${color}" stroke="#fff" stroke-width="4"/><text x="${mapX(index)}" y="${mapY(value) - 16}" class="tiny" text-anchor="middle">${esc(formatter(value))}</text>`
      )
      .join("")}
  `;
};

const barChart = ({ x, y, w, h, title, subtitle, labels, groups, yTicks, yMax, formatter = numberText }) => {
  const slot = w / labels.length;
  const barW = Math.min(34, Math.floor((slot - 20) / groups.length));
  const mapY = (value) => y + h - (value / yMax) * h;
  return `
    ${box(x - 28, y - 80, w + 56, h + 160, { fill: c.surface, stroke: c.line, rx: 28 })}
    ${textBlock(x, y - 38, title, { cls: "card-title", maxChars: 40 })}
    ${textBlock(x, y - 8, subtitle, { cls: "small", maxChars: 78, lineHeight: 22 })}
    ${yTicks
      .map((tick) => `<line x1="${x}" y1="${mapY(tick)}" x2="${x + w}" y2="${mapY(tick)}" stroke="${mix(c.line, 0.88)}" stroke-width="2" stroke-dasharray="10 10"/>${textBlock(x - 16, mapY(tick) + 7, formatter(tick), { cls: "small", anchor: "end" })}`)
      .join("")}
    ${labels.map((label, index) => textBlock(x + slot * index + slot / 2, y + h + 34, label, { cls: "small", anchor: "middle", maxChars: 10, lineHeight: 20 })).join("")}
    ${groups
      .map((group, groupIndex) =>
        group.values
          .map((value, valueIndex) => {
            const bx = x + slot * valueIndex + 18 + groupIndex * (barW + 8);
            const by = mapY(value);
            return `${box(bx, by, barW, y + h - by, { fill: group.color, stroke: group.color, rx: 12, shadow: false })}<text x="${bx + barW / 2}" y="${by - 10}" class="tiny" text-anchor="middle">${esc(formatter(value))}</text>`;
          })
          .join("")
      )
      .join("")}
    ${groups.map((group, index) => chip(x + index * 190, y + h + 64, 164, group.label, group.color)).join("")}
  `;
};

const radarChart = (title, subtitle) => {
  const points = [
    [0, -230],
    [190, -120],
    [220, 90],
    [0, 230],
    [-220, 90],
    [-190, -120],
  ];
  const target = points.map(([px, py]) => `${760 + px},${500 + py}`).join(" ");
  const actual = [
    [0, -230],
    [168, -110],
    [205, 74],
    [0, 205],
    [-210, 96],
    [-175, -108],
  ]
    .map(([px, py]) => `${760 + px},${500 + py}`)
    .join(" ");
  return svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.violet },
    `
      ${box(82, 178, 1436, 744, { fill: c.surface, stroke: mix(c.violet, 0.18), rx: 34, shadow: false })}
      ${[70, 130, 190, 250].map((radius) => `<polygon points="${points.map(([px, py]) => `${760 + (px * radius) / 250},${500 + (py * radius) / 250}`).join(" ")}" fill="none" stroke="${mix(c.line, 0.9)}" stroke-width="2"/>`).join("")}
      ${points
        .map(([px, py], index) => `<line x1="760" y1="500" x2="${760 + px}" y2="${500 + py}" stroke="${mix(c.slate, 0.6)}" stroke-width="2"/><text x="${760 + px * 1.18}" y="${500 + py * 1.18}" class="section-title" text-anchor="middle">${esc(["GPS", "Độ trễ", "Mở rộng", "UX", "Đồng bộ", "Năng lượng"][index])}</text>`)
        .join("")}
      <polygon points="${target}" fill="${mix(c.navy, 0.12)}" stroke="${c.navy}" stroke-width="4"/>
      <polygon points="${actual}" fill="${mix(c.emerald, 0.18)}" stroke="${c.emerald}" stroke-width="4"/>
      ${chip(1130, 284, 180, "Chỉ tiêu thiết kế", c.navy)}
      ${chip(1130, 338, 180, "Kết quả thực tế", c.emerald)}
      ${component({
        x: 1080,
        y: 406,
        w: 286,
        h: 214,
        title: "Tóm tắt đánh giá",
        body: ["9/10 chỉ tiêu đạt hoặc vượt mục tiêu.", "Điểm cần tối ưu thêm: dòng Active Mode.", "Các chỉ tiêu GPS và độ trễ đều đạt biên an toàn."],
        accent: c.violet,
        tag: "review",
      })}
    `
  );
};

const packageDiagram = ({ title, subtitle, rootLabel, columns, accent = c.navy }) => {
  const columnWidth = 260;
  const gap = 24;
  const totalWidth = columns.length * columnWidth + (columns.length - 1) * gap;
  const startX = Math.round((1600 - totalWidth) / 2);
  return svgDoc(
    1600,
    1000,
    { title, subtitle, accent },
    `
      ${component({
        x: 580,
        y: 184,
        w: 440,
        h: 120,
        title: rootLabel,
        body: ["Gói gốc điều phối toàn bộ module theo kiến trúc đã triển khai."],
        accent,
        tag: "root",
      })}
      ${columns
        .map((col, index) => {
          const x = startX + index * (columnWidth + gap);
          return `
            ${component({
              x,
              y: 374,
              w: columnWidth,
              h: 220,
              title: col.title,
              body: col.items,
              accent: col.accent ?? accent,
              tag: col.tag ?? "package",
            })}
            ${edge({
              x1: 800,
              y1: 304,
              x2: x + columnWidth / 2,
              y2: 374,
              color: col.accent ?? accent,
              label: col.link ?? "",
              labelX: x + columnWidth / 2 - 54,
              labelY: 332,
              marker: "arrow-slate",
            })}
          `;
        })
        .join("")}
    `
  );
};

const systemArchitectureFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.navy },
    `
      ${group({ x: 72, y: 208, w: 278, h: 640, title: "Lớp thiết bị", accent: c.navy, subtitle: "Các module nằm trên xe và tạo ra dữ liệu thô." })}
      ${group({ x: 382, y: 208, w: 238, h: 640, title: "Lớp giao vận", accent: c.teal, subtitle: "MQTT và xử lý fan-out thời gian thực." })}
      ${group({ x: 648, y: 208, w: 248, h: 640, title: "Lớp nghiệp vụ", accent: c.amber, subtitle: "REST API, xác thực và điều khiển thiết bị." })}
      ${group({ x: 924, y: 208, w: 296, h: 640, title: "Lớp lưu trữ", accent: c.rose, subtitle: "Tách dữ liệu quan hệ, chuỗi thời gian và nhật ký." })}
      ${group({ x: 1248, y: 208, w: 280, h: 640, title: "Lớp ứng dụng", accent: c.emerald, subtitle: "Các giao diện khai thác và quan trắc." })}
      ${component({ x: 98, y: 278, w: 226, h: 224, title: "Thiết bị tracker", body: ["ESP32-S3", "SIM7600CE-T LTE + GNSS", "LIS3DH giám sát rung", "Nguồn dự phòng 21700"], accent: c.navy, tag: "device" })}
      ${component({ x: 98, y: 540, w: 226, h: 190, title: "Adapter vgate iCar Pro", body: ["BLE OBD-II", "RPM, tốc độ, nhiên liệu", "Trạng thái khóa điện IGN"], accent: c.violet, tag: "obd2" })}
      ${component({ x: 408, y: 314, w: 186, h: 172, title: "EMQX Broker", body: ["Nhận MQTT uplink", "Kênh lệnh xuống thiết bị", "ACL và rule broker"], accent: c.teal, tag: "broker" })}
      ${component({ x: 408, y: 548, w: 186, h: 192, title: "MQTT Bridge", body: ["Kiểm tra schema Zod", "Ghi kép dữ liệu", "Phát sự kiện thời gian thực"], accent: c.teal, tag: "fan-out" })}
      ${component({ x: 674, y: 408, w: 196, h: 206, title: "Backend API + Socket.IO", body: ["Express TypeScript", "REST API", "Quản lý phiên, lệnh điều khiển", "Đẩy dữ liệu WebSocket"], accent: c.amber, tag: "service" })}
      ${component({ x: 952, y: 262, w: 240, h: 164, title: "PostgreSQL", body: ["Người dùng, xe, chuyến đi", "Cảnh báo, geofence, lệnh", "Phiên đăng nhập và phân quyền"], accent: c.rose, tag: "relational" })}
      ${component({ x: 952, y: 462, w: 240, h: 164, title: "VictoriaMetrics", body: ["Vị trí GPS, OBD2", "Telemetry cảm biến", "Phục vụ PromQL và dashboard"], accent: c.rose, tag: "time-series" })}
      ${component({ x: 952, y: 662, w: 240, h: 146, title: "VictoriaLogs", body: ["Nhật ký kết nối", "Audit trail", "Sự kiện vận hành"], accent: c.rose, tag: "logs" })}
      ${component({ x: 1276, y: 276, w: 224, h: 164, title: "Dashboard Web Next.js", body: ["Giám sát xe theo thời gian thực", "Bản đồ, cảnh báo, thống kê", "Tra cứu dữ liệu lịch sử"], accent: c.emerald, tag: "web" })}
      ${component({ x: 1276, y: 492, w: 224, h: 164, title: "Shell di động Flutter", body: ["Đóng gói WebView", "Thông báo và thao tác nhanh", "Hỗ trợ điều khiển từ xa"], accent: c.emerald, tag: "mobile" })}
      ${component({ x: 1276, y: 708, w: 224, h: 120, title: "Grafana", body: ["Quan trắc hiệu năng và độ trễ"], accent: c.emerald, tag: "ops" })}
      ${edge({ x1: 324, y1: 390, x2: 408, y2: 390, color: c.navy, label: "MQTT 5.0 / TLS", labelX: 330, labelY: 332, marker: "arrow" })}
      ${edge({ x1: 324, y1: 620, x2: 186, y2: 502, color: c.violet, label: "BLE OBD-II", labelX: 164, labelY: 544, marker: "arrow-slate" })}
      ${edge({ x1: 501, y1: 486, x2: 501, y2: 548, color: c.teal, label: "subscribe", labelX: 455, labelY: 510, marker: "arrow-slate" })}
      ${edge({ x1: 594, y1: 644, x2: 674, y2: 644, color: c.teal, label: "Socket.IO", labelX: 586, labelY: 606, marker: "arrow-slate" })}
      ${edge({ x1: 594, y1: 616, x2: 952, y2: 544, color: c.teal, label: "time-series", labelX: 708, labelY: 542, marker: "arrow-slate" })}
      ${edge({ x1: 594, y1: 684, x2: 952, y2: 734, color: c.teal, label: "logs", labelX: 724, labelY: 716, marker: "arrow-slate" })}
      ${edge({ x1: 870, y1: 456, x2: 952, y2: 344, color: c.amber, label: "SQL", labelX: 854, labelY: 382, marker: "arrow-slate" })}
      ${edge({ x1: 870, y1: 520, x2: 1276, y2: 358, color: c.amber, label: "REST API", labelX: 1040, labelY: 404, marker: "arrow-slate" })}
      ${edge({ x1: 870, y1: 564, x2: 1276, y2: 574, color: c.amber, label: "WebSocket", labelX: 1030, labelY: 540, marker: "arrow-slate" })}
      ${edge({ x1: 1072, y1: 626, x2: 1276, y2: 768, color: c.rose, label: "PromQL / LogsQL", labelX: 1112, labelY: 710, marker: "arrow-slate" })}
    `
  );

const dataArchitectureFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.rose },
    `
      ${group({ x: 82, y: 220, w: 300, h: 608, title: "Nguồn dữ liệu", accent: c.navy, subtitle: "Dữ liệu thô phát sinh theo ngữ cảnh vận hành của xe." })}
      ${group({ x: 426, y: 220, w: 262, h: 608, title: "Gateway dữ liệu", accent: c.teal, subtitle: "Chuẩn hóa payload và định tuyến đúng loại kho lưu trữ." })}
      ${group({ x: 726, y: 220, w: 788, h: 608, title: "Kho dữ liệu chuyên biệt", accent: c.rose, subtitle: "Mỗi loại dữ liệu dùng đúng công cụ để cân bằng tốc độ và khả năng truy vấn." })}
      ${component({ x: 108, y: 286, w: 248, h: 160, title: "Thiết bị tracker", body: ["GPS, OBD2, điện áp, trạng thái nguồn", "Dữ liệu gửi định kỳ qua MQTT"], accent: c.navy, tag: "telemetry" })}
      ${component({ x: 108, y: 496, w: 248, h: 148, title: "Frontend và API", body: ["CRUD xe, chuyến đi, cảnh báo", "Truy vấn dữ liệu lịch sử"], accent: c.amber, tag: "query" })}
      ${component({ x: 452, y: 324, w: 210, h: 160, title: "MQTT Bridge", body: ["Xác thực schema", "Phân loại dữ liệu", "Ghi song song vào nhiều kho"], accent: c.teal, tag: "router" })}
      ${component({ x: 452, y: 546, w: 210, h: 136, title: "Backend API", body: ["Truy xuất theo use case", "Tổng hợp dữ liệu trả frontend"], accent: c.amber, tag: "service" })}
      ${component({ x: 760, y: 270, w: 220, h: 168, title: "PostgreSQL", body: ["Người dùng", "Phương tiện", "Khách hàng", "Cảnh báo và điều khiển"], accent: c.rose, tag: "quan hệ" })}
      ${component({ x: 1010, y: 270, w: 220, h: 168, title: "VictoriaMetrics", body: ["Vị trí GPS", "RPM, tốc độ, nhiệt độ", "Dữ liệu cảm biến theo chuỗi thời gian"], accent: c.rose, tag: "time-series" })}
      ${component({ x: 1260, y: 270, w: 220, h: 168, title: "VictoriaLogs", body: ["Kết nối", "Lỗi thiết bị", "Audit trail và log bridge"], accent: c.rose, tag: "logs" })}
      ${component({ x: 888, y: 520, w: 462, h: 168, title: "Lớp khai thác dữ liệu", body: ["REST API truy xuất PostgreSQL cho dữ liệu nghiệp vụ.", "PromQL/Grafana khai thác VictoriaMetrics cho dashboard theo thời gian.", "LogsQL hỗ trợ điều tra sự cố và đối soát sự kiện."], accent: c.emerald, tag: "analytics" })}
      ${edge({ x1: 356, y1: 366, x2: 452, y2: 404, color: c.navy, label: "MQTT raw data", labelX: 372, labelY: 330, marker: "arrow-slate" })}
      ${edge({ x1: 356, y1: 570, x2: 452, y2: 614, color: c.amber, label: "REST query", labelX: 372, labelY: 600, marker: "arrow-slate" })}
      ${edge({ x1: 662, y1: 400, x2: 760, y2: 354, color: c.teal, label: "dữ liệu quan hệ", labelX: 680, labelY: 330, marker: "arrow-slate" })}
      ${edge({ x1: 662, y1: 430, x2: 1010, y2: 354, color: c.teal, label: "telemetry", labelX: 792, labelY: 378, marker: "arrow-slate" })}
      ${edge({ x1: 662, y1: 460, x2: 1260, y2: 354, color: c.teal, label: "log sự kiện", labelX: 1020, labelY: 414, marker: "arrow-slate" })}
      ${edge({ x1: 662, y1: 614, x2: 888, y2: 604, color: c.amber, label: "read model", labelX: 738, labelY: 574, marker: "arrow-slate" })}
      ${edge({ x1: 870, y1: 438, x2: 1030, y2: 520, color: c.rose, label: "PromQL", labelX: 924, labelY: 476, marker: "arrow-slate" })}
      ${edge({ x1: 1370, y1: 438, x2: 1210, y2: 520, color: c.rose, label: "LogsQL", labelX: 1284, labelY: 476, marker: "arrow-slate" })}
    `
  );

const trackerBlockFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.navy },
    `
      ${component({ x: 528, y: 244, w: 546, h: 248, title: "ESP32-S3 điều phối hệ thống", body: ["BLE OBD2, tổng hợp telemetry và quản lý trạng thái nguồn.", "ADC GPIO4 | CHARGER_EN GPIO5 | POWER_PATH_EN GPIO18", "LVD_STATUS GPIO19 | PWRKEY GPIO26 | UART1 GPIO16/17"], accent: c.navy, tag: "controller" })}
      ${component({ x: 92, y: 246, w: 340, h: 170, title: "Voltage divider + ADC", body: ["R1 = 100 kΩ | R2 = 10 kΩ", "Đo điện áp ắc quy hệ 12V / 24V", "Cung cấp dữ liệu profile chuyển nguồn"], accent: c.rose, tag: "sense" })}
      ${component({ x: 92, y: 474, w: 340, h: 186, title: "Power control + status", body: ["GPIO5 bật/tắt sạc TP4056", "GPIO18 chọn nhánh nguồn runtime", "GPIO19 đọc Low Voltage Disconnect", "GPIO26 điều khiển modem PWRKEY"], accent: c.teal, tag: "power" })}
      ${component({ x: 1172, y: 212, w: 332, h: 168, title: "LIS3DH IMU", body: ["I2C: GPIO47 / GPIO48", "INT1: GPIO21 đánh thức deep sleep", "Theo dõi rung động khi xe đỗ"], accent: c.amber, tag: "sensor" })}
      ${component({ x: 1172, y: 440, w: 332, h: 168, title: "vgate iCar Pro", body: ["BLE 4.0 OBD-II adapter", "RPM, tốc độ, nhiên liệu, DTC", "IGN và trạng thái động cơ"], accent: c.violet, tag: "ble" })}
      ${component({ x: 1172, y: 668, w: 332, h: 168, title: "SIM7600CE-T", body: ["LTE Cat-4 + GNSS tích hợp", "UART1: TX GPIO16 | RX GPIO17", "PWRKEY GPIO26, GNSS cùng một UART"], accent: c.navy, tag: "modem" })}
      ${group({ x: 92, y: 730, w: 982, h: 150, title: "Chuỗi nguồn runtime", accent: c.emerald, subtitle: "Các rail nguồn được tách riêng để giảm nhiễu và tăng ổn định khi modem phát." })}
      ${component({ x: 132, y: 776, w: 166, h: 74, title: "Ắc quy xe 12V / 24V", accent: c.rose, fill: c.surfaceSoft, body: [] })}
      ${component({ x: 324, y: 776, w: 160, h: 74, title: "MP2482 -> 5V bus", accent: c.teal, fill: c.surfaceSoft, body: [] })}
      ${component({ x: 510, y: 776, w: 160, h: 74, title: "XL1509 -> 3.3V", accent: c.emerald, fill: c.surfaceSoft, body: [] })}
      ${component({ x: 696, y: 776, w: 160, h: 74, title: "TPS54231 -> ~4V", accent: c.amber, fill: c.surfaceSoft, body: [] })}
      ${component({ x: 882, y: 776, w: 152, h: 74, title: "TP4056 + 21700 + SX1308", accent: c.violet, fill: c.surfaceSoft, body: [] })}
      ${edge({ x1: 432, y1: 332, x2: 528, y2: 332, color: c.rose, label: "ADC", labelX: 446, labelY: 294, marker: "arrow-slate" })}
      ${edge({ x1: 432, y1: 566, x2: 528, y2: 428, color: c.teal, label: "GPIO điều khiển", labelX: 434, labelY: 470, marker: "arrow-slate" })}
      ${edge({ x1: 1074, y1: 344, x2: 1172, y2: 296, color: c.amber, label: "I2C + INT1", labelX: 1086, labelY: 294, marker: "arrow-slate" })}
      ${edge({ x1: 1074, y1: 428, x2: 1172, y2: 516, color: c.violet, label: "BLE OBD-II", labelX: 1092, labelY: 472, marker: "arrow-slate" })}
      ${edge({ x1: 974, y1: 492, x2: 1172, y2: 752, color: c.navy, label: "UART1 + PWRKEY", labelX: 1032, labelY: 634, marker: "arrow" })}
      ${polyEdge({ points: [[298, 813], [324, 813], [484, 813], [510, 813], [670, 813], [696, 813], [856, 813], [882, 813]], color: c.emerald, label: "chuỗi cấp nguồn", labelX: 532, labelY: 744, marker: "arrow-slate" })}
    `
  );

const powerManagementFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.emerald },
    `
      ${group({ x: 72, y: 212, w: 468, h: 648, title: "Nguồn chính từ xe", accent: c.rose, subtitle: "Điện áp ắc quy 12V / 24V được hạ áp và phân phối vào các rail vận hành." })}
      ${group({ x: 578, y: 212, w: 414, h: 648, title: "Nguồn dự phòng và sạc", accent: c.violet, subtitle: "Pin 21700 được sạc khi xe chạy và tự tiếp quản khi điện áp xe tụt." })}
      ${group({ x: 1030, y: 212, w: 498, h: 648, title: "Giám sát và tải tiêu thụ", accent: c.navy, subtitle: "ESP32 giám sát ngưỡng điện áp, chọn đường cấp và bảo vệ ắc quy." })}
      ${component({ x: 112, y: 284, w: 184, h: 126, title: "Ắc quy xe", body: ["12V hoặc 24V danh định"], accent: c.rose, tag: "input" })}
      ${component({ x: 332, y: 284, w: 170, h: 126, title: "MP2482", body: ["Buck cố định 5V / 3A"], accent: c.teal, tag: "buck" })}
      ${component({ x: 164, y: 486, w: 164, h: 126, title: "XL1509 3.3E", body: ["Rail 3.3V cho ESP32-S3"], accent: c.emerald, tag: "logic" })}
      ${component({ x: 348, y: 486, w: 164, h: 126, title: "TPS54231", body: ["Rail ~4V cho modem"], accent: c.amber, tag: "modem" })}
      ${component({ x: 622, y: 284, w: 150, h: 126, title: "TP4056", body: ["Bật sạc qua GPIO5"], accent: c.violet, tag: "charger" })}
      ${component({ x: 802, y: 284, w: 150, h: 126, title: "BMS 1S", body: ["Bảo vệ quá áp / quá xả"], accent: c.violet, tag: "protection" })}
      ${component({ x: 682, y: 500, w: 210, h: 126, title: "Pin 21700", body: ["Nguồn dự phòng 1 cell", "Duy trì tracking khi mất điện xe"], accent: c.violet, tag: "backup" })}
      ${component({ x: 682, y: 694, w: 210, h: 126, title: "SX1308", body: ["Boost 3.7V lên 5V backup"], accent: c.violet, tag: "boost" })}
      ${component({ x: 1066, y: 272, w: 184, h: 136, title: "LM393 + ADC", body: ["So sánh điện áp, phát cờ LVD", "Theo dõi profile 12V / 24V"], accent: c.rose, tag: "monitor" })}
      ${component({ x: 1284, y: 272, w: 196, h: 144, title: "ESP32-S3 Power FSM", body: ["Quyết định Switch_ON / Switch_OFF", "Chọn nguồn runtime và chế độ ngủ"], accent: c.navy, tag: "control" })}
      ${component({ x: 1088, y: 536, w: 170, h: 118, title: "Rail 3.3V", body: ["ESP32-S3", "LIS3DH"], accent: c.emerald, tag: "load" })}
      ${component({ x: 1288, y: 536, w: 170, h: 118, title: "Rail ~4V", body: ["SIM7600CE-T"], accent: c.amber, tag: "load" })}
      ${component({ x: 1180, y: 724, w: 186, h: 118, title: "Bus 5V runtime", body: ["Chia sẻ giữa nguồn chính và backup"], accent: c.teal, tag: "bus" })}
      ${edge({ x1: 296, y1: 346, x2: 332, y2: 346, color: c.rose, label: "12V / 24V", labelX: 282, labelY: 308, marker: "arrow-slate" })}
      ${polyEdge({ points: [[502, 346], [550, 346], [550, 548], [164, 548]], color: c.teal, label: "5V -> 3.3V", labelX: 478, labelY: 516, marker: "arrow-slate" })}
      ${polyEdge({ points: [[502, 346], [540, 346], [540, 548], [348, 548]], color: c.teal, label: "5V -> ~4V", labelX: 486, labelY: 594, marker: "arrow-slate" })}
      ${edge({ x1: 502, y1: 346, x2: 622, y2: 346, color: c.teal, label: "5V sạc", labelX: 532, labelY: 308, marker: "arrow-slate" })}
      ${edge({ x1: 772, y1: 346, x2: 802, y2: 346, color: c.violet, label: "BAT+", labelX: 760, labelY: 308, marker: "arrow-slate" })}
      ${polyEdge({ points: [[877, 410], [877, 500], [787, 500]], color: c.violet, label: "pin backup", labelX: 812, labelY: 454, marker: "arrow-slate" })}
      ${edge({ x1: 787, y1: 626, x2: 787, y2: 694, color: c.violet, label: "3.7V", labelX: 740, labelY: 660, marker: "arrow-slate" })}
      ${edge({ x1: 1250, y1: 340, x2: 1284, y2: 340, color: c.rose, label: "LVD_STATUS", labelX: 1186, labelY: 302, marker: "arrow-slate" })}
      ${edge({ x1: 1382, y1: 416, x2: 1273, y2: 536, color: c.navy, label: "GPIO18 chọn đường cấp", labelX: 1368, labelY: 468, marker: "arrow-slate" })}
      ${edge({ x1: 246, y1: 612, x2: 1170, y2: 724, color: c.emerald, label: "3.3V logic", labelX: 620, labelY: 690, marker: "arrow-slate" })}
      ${edge({ x1: 430, y1: 612, x2: 1288, y2: 596, color: c.amber, label: "~4V modem", labelX: 764, labelY: 560, marker: "arrow-slate" })}
      ${edge({ x1: 787, y1: 820, x2: 1180, y2: 782, color: c.violet, label: "5V backup", labelX: 914, labelY: 770, marker: "arrow-slate" })}
      ${edge({ x1: 502, y1: 346, x2: 1180, y2: 782, color: c.teal, dashed: true, label: "đường 5V chính", labelX: 826, labelY: 420, marker: "arrow-slate" })}
    `
  );

const featureFrontendFigure = (title, subtitle) =>
  packageDiagram({
    title,
    subtitle,
    rootLabel: "Tracking_Frontend / src",
    accent: c.violet,
    columns: [
      { title: "app/", items: ["App Router, layout.tsx, page.tsx", "dashboard/, map/, vehicles/"], accent: c.navy, tag: "routing", link: "routes" },
      { title: "features/", items: ["vehicles/, alerts/, trips/", "hooks, components, types theo feature"], accent: c.violet, tag: "domain", link: "use case" },
      { title: "components/", items: ["ui/, forms/, layout/", "map/, charts/, providers/"], accent: c.teal, tag: "shared-ui", link: "ui" },
      { title: "lib/", items: ["api/, realtime/, store/", "utils/, constants/, shared hooks"], accent: c.amber, tag: "infra", link: "data" },
      { title: "hooks/ và types/", items: ["Custom hooks dùng chung", "Kiểu TypeScript toàn cục", "Ràng buộc giữa UI và dữ liệu"], accent: c.emerald, tag: "support", link: "reuse" },
    ],
  });

const sequenceAuthFigure = (title, subtitle) => {
  const lifelines = [
    { x: 180, label: "Người dùng", color: c.navy },
    { x: 440, label: "Frontend Next.js", color: c.violet },
    { x: 760, label: "Backend API", color: c.amber },
    { x: 1080, label: "PostgreSQL", color: c.rose },
    { x: 1370, label: "Zustand Store", color: c.teal },
  ];
  const message = (y, fromIndex, toIndex, label, color) => {
    const from = lifelines[fromIndex].x;
    const to = lifelines[toIndex].x;
    return `
      <line x1="${from}" y1="${y}" x2="${to}" y2="${y}" stroke="${color}" stroke-width="4" marker-end="url(#arrow-slate)"/>
      ${note((from + to) / 2 - Math.min(Math.max(label.length * 6, 44), 110), y - 38, label, Math.min(Math.max(label.length * 11, 100), 220), c.surface, mix(color, 0.26))}
    `;
  };
  return svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.violet },
    `
      ${box(82, 188, 1436, 734, { fill: c.surface, stroke: mix(c.violet, 0.18), rx: 34, shadow: false })}
      ${lifelines
        .map(
          (actor) => `
            ${component({ x: actor.x - 96, y: 228, w: 192, h: 88, title: actor.label, body: [], accent: actor.color, tag: "actor" })}
            <line x1="${actor.x}" y1="316" x2="${actor.x}" y2="856" stroke="${mix(actor.color, 0.7)}" stroke-width="3" stroke-dasharray="10 10"/>
          `
        )
        .join("")}
      ${message(382, 0, 1, "Nhập email và mật khẩu", c.navy)}
      ${message(454, 1, 2, "POST /api/v1/auth/login", c.violet)}
      ${message(526, 2, 3, "Tra cứu user + session", c.amber)}
      ${message(598, 3, 2, "Hash mật khẩu, role, trạng thái", c.rose)}
      ${message(670, 2, 1, "Trả session token + hồ sơ", c.amber)}
      ${message(742, 1, 4, "Lưu token trong bộ nhớ", c.teal)}
      ${message(814, 1, 2, "GET /dashboard với Authorization", c.violet)}
      ${message(886, 2, 1, "Dữ liệu trang + quyền truy cập", c.amber)}
      ${textBlock(116, 928, "Token chỉ được giữ trong Zustand (memory-only), không lưu localStorage hay sessionStorage để giảm rủi ro XSS.", { cls: "small", maxChars: 120 })}
    `
  );
};

const dashboardFigure = (title, subtitle) =>
  appShell(
    title,
    subtitle,
    `
      ${statCard(370, 334, "Tổng số xe", "124", "+12%", c.navy)}
      ${statCard(646, 334, "Đang hoạt động", "38", "+4", c.emerald)}
      ${statCard(922, 334, "Cảnh báo mở", "7", "P95", c.amber)}
      ${statCard(1198, 334, "Chuyến hôm nay", "59", "ổn định", c.teal)}
      ${box(370, 520, 732, 322, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(398, 566, "Bản đồ mini đội xe", { cls: "card-title", maxChars: 22 })}
      ${textBlock(398, 596, "Theo dõi xe đang hoạt động và vị trí phát sinh cảnh báo gần nhất.", { cls: "small", maxChars: 52 })}
      <polyline points="418,780 510,700 610,730 714,648 820,666 934,612 1034,648" fill="none" stroke="${c.navy}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      ${[
        [486, 724, "V001", c.navy],
        [714, 648, "V014", c.rose],
        [934, 612, "V032", c.emerald],
      ]
        .map(([mx, my, label, color]) => `<circle cx="${mx}" cy="${my}" r="16" fill="${color}"/><text x="${mx}" y="${my + 36}" class="small" text-anchor="middle">${esc(label)}</text>`)
        .join("")}
      ${box(1134, 520, 368, 150, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(1162, 562, "Telemetry thời gian thực", { cls: "card-title", maxChars: 24 })}
      <polyline points="1168,632 1218,616 1270,574 1324,592 1376,544 1432,524" fill="none" stroke="${c.teal}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="1168,646 1218,662 1270,624 1324,610 1376,622 1432,584" fill="none" stroke="${c.amber}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      ${box(1134, 692, 368, 150, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(1162, 734, "Cảnh báo gần đây", { cls: "card-title", maxChars: 22 })}
      ${[
        ["Rời geofence", "Cao", c.rose],
        ["Quá tốc độ", "Trung bình", c.amber],
        ["Pin dự phòng yếu", "Mới", c.teal],
      ]
        .map(([label, badgeText, color], index) => `${softBox(1162, 760 + index * 24, 312, 18, { fill: c.surfaceSoft, stroke: mix(color, 0.2), rx: 9 })}${textBlock(1176, 774 + index * 24, label, { cls: "tiny", maxChars: 26 })}${chip(1388, 746 + index * 24, 86, badgeText, color)}`)
        .join("")}
    `,
    c.navy
  );

const vehicleTableFigure = (title, subtitle, alertMode = false) =>
  appShell(
    title,
    subtitle,
    `
      ${box(370, 334, 1132, 78, { fill: c.surface, stroke: c.line, rx: 22 })}
      ${textBlock(398, 381, alertMode ? "Bộ lọc cảnh báo, xe, mức độ và khoảng thời gian." : "Tìm kiếm xe, lọc theo trạng thái, khách hàng và thiết bị gắn kèm.", { cls: "small", maxChars: 76 })}
      ${box(370, 438, 1132, 404, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(398, 482, alertMode ? "Danh sách cảnh báo đang hoạt động" : "Danh sách phương tiện và trạng thái thiết bị", { cls: "card-title", maxChars: 34 })}
      ${textBlock(400, 530, "Mã", { cls: "small" })}
      ${textBlock(510, 530, alertMode ? "Loại cảnh báo" : "Biển số", { cls: "small" })}
      ${textBlock(760, 530, alertMode ? "Mức độ" : "Thiết bị", { cls: "small" })}
      ${textBlock(930, 530, alertMode ? "Xe" : "Trạng thái", { cls: "small" })}
      ${textBlock(1110, 530, "Tình trạng", { cls: "small" })}
      ${textBlock(1276, 530, "Cập nhật", { cls: "small" })}
      ${textBlock(1416, 530, "Thao tác", { cls: "small" })}
      ${[0, 1, 2, 3, 4, 5]
        .map((row) => {
          const top = 558 + row * 46;
          const data = alertMode
            ? [`ALT-10${row}`, ["Geofence", "Mất nguồn", "Mất kết nối", "Pin yếu", "Quá tốc độ", "Rung bất thường"][row], ["Cao", "Trung bình", "Cao", "Thấp", "Khẩn", "Trung bình"][row], ["Vios 2020", "City 2021", "Mazda 3", "Accent", "Veloz", "Attrage"][row], ["Mới", "Đang xử lý", "Mới", "Đã nhận", "Mới", "Đã nhận"][row], `10:${row}5`]
            : [`51A-12${row}.4${row}`, ["Tracker-01", "Tracker-02", "Tracker-03", "Tracker-04", "Tracker-05", "Tracker-06"][row], ["Online", "Idle", "Offline", "Online", "Maintenance", "Online"][row], ["Toyota Vios", "Honda City", "Mazda 3", "Accent", "Veloz", "Attrage"][row], ["Mới", "Tốt", "Gián đoạn", "Mới", "Bảo trì", "Mới"][row], `10:${row}2`];
          const badgeText = data[2];
          const badgeColor = alertMode
            ? { Cao: c.rose, "Trung bình": c.amber, Thấp: c.teal, Khẩn: c.rose }[badgeText]
            : { Online: c.emerald, Idle: c.amber, Offline: c.rose, Maintenance: c.violet }[badgeText];
          return `
            <line x1="392" y1="${top}" x2="1478" y2="${top}" stroke="${mix(c.line, 0.88)}" stroke-width="2"/>
            ${textBlock(400, top + 28, data[0], { cls: "body", maxChars: 10 })}
            ${textBlock(510, top + 28, data[1], { cls: "body", maxChars: 18 })}
            ${chip(738, top + 4, 110, badgeText, badgeColor)}
            ${textBlock(930, top + 28, data[3], { cls: "body", maxChars: 14 })}
            ${chip(1088, top + 4, 120, data[4], alertMode ? c.navy : c.teal)}
            ${textBlock(1286, top + 28, data[5], { cls: "body", maxChars: 8 })}
            ${note(1384, top + 2, "Xem / Sửa", 96, c.surfaceSoft, mix(c.navy, 0.2))}
          `;
        })
        .join("")}
    `,
    alertMode ? c.rose : c.teal
  );

const mapFigure = (title, subtitle, { geofence = false, route = false } = {}) =>
  appShell(
    title,
    subtitle,
    `
      ${box(370, 334, 268, 508, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(398, 378, geofence ? "Sự kiện geofence" : route ? "Phân đoạn hành trình" : "Danh sách xe hoạt động", { cls: "card-title", maxChars: 18 })}
      ${[0, 1, 2, 3, 4, 5, 6].map((row) => `${softBox(396, 420 + row * 52, 216, 38, { fill: c.surfaceSoft, stroke: mix(c.navy, 0.14), rx: 14 })}${textBlock(426, 444 + row * 52, geofence ? `Cảnh báo ${row + 1}` : route ? `Đoạn tuyến ${row + 1}` : `Xe V0${row + 1}`, { cls: "body", maxChars: 18 })}`).join("")}
      ${box(666, 334, 836, 508, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(694, 378, geofence ? "Bản đồ vùng cảnh báo" : route ? "Bản đồ đồng bộ sau khi phục hồi mạng" : "Bản đồ vị trí thời gian thực", { cls: "card-title", maxChars: 28 })}
      <polyline points="724,760 810,676 928,700 1042,612 1160,648 1272,590 1408,634" fill="none" stroke="${route ? c.teal : c.navy}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
      ${[[820, 682, "V01"], [1042, 612, "V08"], [1272, 590, geofence ? "ALT" : "V17"]].map(([mx, my, label], index) => `<circle cx="${mx}" cy="${my}" r="18" fill="${geofence && index === 2 ? c.rose : c.navy}"/><text x="${mx}" y="${my + 38}" class="small" text-anchor="middle">${esc(label)}</text>`).join("")}
      ${geofence ? `<circle cx="1186" cy="556" r="120" fill="${mix(c.rose, 0.14)}" stroke="${c.rose}" stroke-width="4"/><text x="1186" y="562" class="card-title" text-anchor="middle">Geofence</text>` : ""}
      ${route ? `<line x1="980" y1="564" x2="980" y2="756" stroke="${c.rose}" stroke-width="4" stroke-dasharray="12 12"/><text x="998" y="664" class="small">Khoảng mất mạng</text>${chip(1240, 762, 170, "Đồng bộ lại 100%", c.emerald)}` : ""}
    `,
    geofence ? c.rose : c.navy
  );

const uiPatternsFigure = (title, subtitle) =>
  appShell(
    title,
    subtitle,
    `
      ${box(370, 334, 478, 226, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(398, 378, "Mẫu bảng dữ liệu", { cls: "card-title", maxChars: 18 })}
      ${[0, 1, 2, 3, 4].map((row) => `<line x1="398" y1="${420 + row * 28}" x2="820" y2="${420 + row * 28}" stroke="${mix(c.line, 0.9)}" stroke-width="2"/>`).join("")}
      ${textBlock(410, 410, "Biển số", { cls: "small" })}${textBlock(556, 410, "Thiết bị", { cls: "small" })}${textBlock(720, 410, "Trạng thái", { cls: "small" })}
      ${box(876, 334, 626, 226, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(904, 378, "Mẫu biểu mẫu xác thực", { cls: "card-title", maxChars: 22 })}
      ${[0, 1, 2, 3].map((row) => softBox(904, 412 + row * 42, 572, 28, { fill: c.surfaceSoft, stroke: mix(c.violet, 0.16), rx: 12 })).join("")}
      ${chip(1272, 514, 164, "Lưu thay đổi", c.violet)}
      ${box(370, 590, 1132, 252, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(398, 634, "Mẫu chart telemetry", { cls: "card-title", maxChars: 20 })}
      <polyline points="426,770 548,724 670,736 792,680 914,650 1036,672 1158,628 1280,654 1402,620" fill="none" stroke="${c.navy}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="426,770 548,724 670,736 792,680 914,650 1036,672 1158,628 1280,654 1402,620 1402,806 426,806" fill="${mix(c.navy, 0.12)}" stroke="none"/>
    `,
    c.violet
  );

const observabilityFigure = (title, subtitle, { emqx = false } = {}) =>
  appShell(
    title,
    subtitle,
    `
      ${statCard(370, 334, emqx ? "Client kết nối" : "CPU dịch vụ", emqx ? "128" : "31%", "+", emqx ? c.navy : c.emerald)}
      ${statCard(646, 334, emqx ? "Thông lượng / giây" : "Độ trễ MQTT", emqx ? "4.8K" : "185 ms", "P95", emqx ? c.navy : c.amber)}
      ${statCard(922, 334, emqx ? "Rule hit" : "Write throughput", emqx ? "98" : "12K/s", "ổn", emqx ? c.navy : c.teal)}
      ${statCard(1198, 334, emqx ? "Broker health" : "Cảnh báo mở", emqx ? "99.9%" : "3", "24h", emqx ? c.navy : c.rose)}
      ${box(370, 520, 742, 322, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(398, 562, emqx ? "Xu hướng client theo thời gian" : "Timeline tài nguyên hệ thống", { cls: "card-title", maxChars: 28 })}
      <polyline points="430,780 532,742 640,730 748,700 856,674 964,662 1070,670" fill="none" stroke="${emqx ? c.navy : c.teal}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <polygon points="430,780 532,742 640,730 748,700 856,674 964,662 1070,670 1070,812 430,812" fill="${mix(emqx ? c.navy : c.teal, 0.12)}" stroke="none"/>
      ${box(1144, 520, 358, 322, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(1172, 562, emqx ? "Trạng thái kết nối" : "Tổng hợp cảnh báo", { cls: "card-title", maxChars: 20 })}
      ${chip(1172, 608, 204, emqx ? "Healthy 118" : "Khỏe mạnh 9", c.emerald)}
      ${chip(1172, 676, 204, emqx ? "Warning 8" : "Cảnh báo 2", c.amber)}
      ${chip(1172, 744, 204, emqx ? "Critical 2" : "Khẩn cấp 1", c.rose)}
    `,
    emqx ? c.navy : c.emerald
  );

const labSetupFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.teal },
    `
      ${group({ x: 110, y: 230, w: 1380, h: 640, title: "Bàn đo lường", accent: c.teal, subtitle: "Các thiết bị được bố trí để đo dòng, điện áp, log hệ thống và mô phỏng OBD2." })}
      ${[
        ["Nguồn DC 12V / 24V", "Cấp đầu vào cho tracker", c.navy, 180, 320],
        ["Đồng hồ DMM", "Đo dòng tiêu thụ", c.rose, 510, 320],
        ["Tracker prototype", "Thiết bị cần kiểm thử", c.teal, 840, 320],
        ["OBD2 simulator", "Sinh khung dữ liệu động cơ", c.violet, 1170, 320],
        ["Laptop thu log", "Serial, MQTT, Grafana", c.amber, 510, 580],
        ["Oscilloscope", "Quan sát xung và rail nguồn", c.emerald, 840, 580],
      ]
        .map(([heading, body, accent, x, y]) => component({ x, y, w: 250, h: 144, title: heading, body: [body], accent, tag: "bench" }))
        .join("")}
      ${edge({ x1: 430, y1: 392, x2: 510, y2: 392, color: c.navy, label: "nguồn vào", labelX: 430, labelY: 352, marker: "arrow-slate" })}
      ${edge({ x1: 760, y1: 392, x2: 840, y2: 392, color: c.rose, label: "đo dòng", labelX: 760, labelY: 352, marker: "arrow-slate" })}
      ${edge({ x1: 1090, y1: 392, x2: 1170, y2: 392, color: c.teal, label: "khung OBD2", labelX: 1090, labelY: 352, marker: "arrow-slate" })}
      ${edge({ x1: 636, y1: 580, x2: 840, y2: 580, color: c.amber, label: "thu log", labelX: 690, labelY: 542, marker: "arrow-slate" })}
      ${edge({ x1: 965, y1: 580, x2: 965, y2: 464, color: c.emerald, label: "đo rail", labelX: 1002, labelY: 526, marker: "arrow-slate" })}
    `
  );

const vehicleInstallFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.amber },
    `
      ${box(80, 200, 1440, 720, { fill: c.surface, stroke: mix(c.amber, 0.18), rx: 34, shadow: false })}
      <path d="M238 610 L290 520 L430 468 L730 468 L840 520 L916 520 L954 574 L954 632 L866 632 L838 676 L730 676 L706 632 L468 632 L442 676 L330 676 L304 632 L220 632 L220 590 Z" fill="${mix(c.navy, 0.08)}" stroke="${mix(c.navy, 0.42)}" stroke-width="4"/>
      <circle cx="384" cy="674" r="52" fill="#fff" stroke="${mix(c.navy, 0.42)}" stroke-width="4"/>
      <circle cx="766" cy="674" r="52" fill="#fff" stroke="${mix(c.navy, 0.42)}" stroke-width="4"/>
      ${component({ x: 342, y: 452, w: 190, h: 118, title: "Cổng OBD2", body: ["Nguồn xe + dữ liệu chẩn đoán"], accent: c.amber, tag: "port" })}
      ${component({ x: 602, y: 420, w: 210, h: 136, title: "Tracker trong cabin", body: ["ESP32-S3 + SIM7600CE-T", "Đặt gần bảng táp-lô"], accent: c.navy, tag: "device" })}
      ${component({ x: 850, y: 436, w: 124, h: 102, title: "Anten", body: ["LTE / GNSS"], accent: c.teal, tag: "rf" })}
      ${component({ x: 1118, y: 310, w: 312, h: 160, title: "Kết nối chính", body: ["OBD2 cung cấp nguồn xe và dữ liệu động cơ.", "Tracker lấy GNSS từ modem và gửi MQTT qua 4G."], accent: c.amber, tag: "note" })}
      ${component({ x: 1118, y: 520, w: 312, h: 178, title: "Lưu ý lắp đặt", body: ["Đi dây gọn, tránh gần vùng nhiệt cao.", "Anten đặt thoáng để cải thiện GNSS.", "Thiết bị cố định để hạn chế rung lắc."], accent: c.teal, tag: "checklist" })}
      ${edge({ x1: 532, y1: 500, x2: 602, y2: 488, color: c.amber, label: "nguồn + OBD2", labelX: 516, labelY: 454, marker: "arrow-slate" })}
      ${edge({ x1: 812, y1: 470, x2: 850, y2: 488, color: c.teal, label: "RF", labelX: 790, labelY: 434, marker: "arrow-slate" })}
      ${polyEdge({ points: [[812, 488], [1018, 488], [1118, 388]], color: c.navy, label: "luồng telemetry", labelX: 930, labelY: 446, marker: "arrow-slate" })}
    `
  );

const testEnvironmentFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.teal },
    `
      ${component({ x: 150, y: 280, w: 300, h: 170, title: "Bench phần cứng", body: ["Tracker + OBD2 simulator", "Nguồn DC và công cụ đo"], accent: c.navy, tag: "hardware" })}
      ${component({ x: 650, y: 240, w: 300, h: 200, title: "Cloud test stack", body: ["EMQX, MQTT Bridge, Backend", "VictoriaMetrics, VictoriaLogs, PostgreSQL"], accent: c.teal, tag: "cloud" })}
      ${component({ x: 1140, y: 280, w: 300, h: 170, title: "Công cụ tải", body: ["k6, MQTT Bench, Playwright"], accent: c.amber, tag: "load" })}
      ${component({ x: 1140, y: 590, w: 300, h: 170, title: "Frontend browser", body: ["Dashboard, Lighthouse, WebSocket"], accent: c.violet, tag: "ui" })}
      ${component({ x: 650, y: 610, w: 300, h: 170, title: "Thu thập kết quả", body: ["PromQL, LogsQL, log file", "Biểu đồ, báo cáo, đối soát"], accent: c.emerald, tag: "analysis" })}
      ${edge({ x1: 450, y1: 364, x2: 650, y2: 340, color: c.navy, label: "MQTT / HTTP", labelX: 510, labelY: 316, marker: "arrow-slate" })}
      ${edge({ x1: 950, y1: 340, x2: 1140, y2: 364, color: c.amber, label: "stress traffic", labelX: 1000, labelY: 316, marker: "arrow-slate" })}
      ${edge({ x1: 950, y1: 690, x2: 1140, y2: 676, color: c.emerald, label: "dashboard metrics", labelX: 1000, labelY: 652, marker: "arrow-slate" })}
      ${edge({ x1: 800, y1: 440, x2: 800, y2: 610, color: c.teal, label: "log + metrics", labelX: 840, labelY: 522, marker: "arrow-slate" })}
    `
  );

const twoRowStageFigure = (title, subtitle, { topTitle, bottomTitle, items, accent = c.navy }) => {
  const positions = [
    { x: 138, y: 304 },
    { x: 560, y: 304 },
    { x: 982, y: 304 },
    { x: 138, y: 620 },
    { x: 560, y: 620 },
    { x: 982, y: 620 },
  ];

  return svgDoc(
    1600,
    1000,
    { title, subtitle, accent },
    `
      ${group({ x: 94, y: 236, w: 1412, h: 246, title: topTitle, accent, subtitle: "Ba bước đầu giữ nhịp triển khai hoặc kiểm tra trước khi chuyển sang pha kế tiếp." })}
      ${group({ x: 94, y: 552, w: 1412, h: 246, title: bottomTitle, accent: c.teal, subtitle: "Ba bước cuối chốt vòng thực thi, đánh giá và hoàn thiện hệ thống." })}
      ${items
        .map((item, index) =>
          component({
            x: positions[index].x,
            y: positions[index].y,
            w: 280,
            h: 128,
            title: item.title,
            body: item.body ?? [],
            accent: item.accent ?? accent,
            tag: item.tag ?? "step",
          })
        )
        .join("")}
      ${edge({ x1: 418, y1: 368, x2: 560, y2: 368, color: accent, marker: "arrow-slate" })}
      ${edge({ x1: 840, y1: 368, x2: 982, y2: 368, color: accent, marker: "arrow-slate" })}
      ${polyEdge({ points: [[1122, 368], [1236, 368], [1236, 684], [982, 684]], color: c.teal, label: "chuyển pha", labelX: 1190, labelY: 514, marker: "arrow-slate" })}
      ${edge({ x1: 418, y1: 684, x2: 560, y2: 684, color: c.teal, marker: "arrow-slate" })}
      ${edge({ x1: 840, y1: 684, x2: 982, y2: 684, color: c.teal, marker: "arrow-slate" })}
    `
  );
};

const buckConverterFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.navy },
    `
      ${group({ x: 90, y: 242, w: 300, h: 522, title: "Nguồn vào", accent: c.navy, subtitle: "Nhánh lấy điện từ ắc quy xe qua cầu chì và tụ lọc đầu vào." })}
      ${group({ x: 432, y: 242, w: 350, h: 522, title: "Khối chuyển đổi buck", accent: c.teal, subtitle: "MP2482 tạo bus 5V chính từ nguồn 12V hoặc 24V." })}
      ${group({ x: 824, y: 242, w: 686, h: 522, title: "Khối đầu ra 5V", accent: c.amber, subtitle: "Cuộn cảm, diode và tụ đầu ra phối hợp để giữ rail 5V ổn định." })}
      ${component({ x: 124, y: 332, w: 232, h: 124, title: "Ắc quy xe", body: ["Nguồn 12V hoặc 24V"], accent: c.navy, tag: "vin" })}
      ${component({ x: 124, y: 534, w: 232, h: 124, title: "Cầu chì đầu vào", body: ["Bảo vệ khi có sự cố quá dòng"], accent: c.navy, tag: "fuse" })}
      ${component({ x: 474, y: 332, w: 266, h: 124, title: "Tụ lọc C1", body: ["100 uF / 50V", "Giảm nhiễu đầu vào"], accent: c.teal, tag: "filter" })}
      ${component({ x: 474, y: 534, w: 266, h: 146, title: "MP2482-5.0", body: ["Buck 5V / 3A", "Rail nguồn chính cho tracker"], accent: c.teal, tag: "buck" })}
      ${component({ x: 874, y: 318, w: 196, h: 124, title: "Cuộn cảm", body: ["100 uH"], accent: c.amber, tag: "L" })}
      ${component({ x: 874, y: 536, w: 196, h: 124, title: "Diode Schottky", body: ["1N5822"], accent: c.amber, tag: "D" })}
      ${component({ x: 1120, y: 430, w: 188, h: 138, title: "Bus 5V chính", body: ["Nguồn runtime cho các rail chức năng"], accent: c.emerald, tag: "bus" })}
      ${component({ x: 1358, y: 430, w: 118, h: 138, title: "C2", body: ["220 uF / 16V"], accent: c.emerald, tag: "cap" })}
      ${edge({ x1: 240, y1: 456, x2: 240, y2: 534, color: c.navy, marker: "arrow-slate" })}
      ${edge({ x1: 356, y1: 596, x2: 474, y2: 606, color: c.navy, marker: "arrow-slate" })}
      ${edge({ x1: 607, y1: 456, x2: 607, y2: 534, color: c.teal, marker: "arrow-slate" })}
      ${edge({ x1: 740, y1: 606, x2: 874, y2: 598, color: c.teal, marker: "arrow-slate" })}
      ${edge({ x1: 740, y1: 606, x2: 874, y2: 380, color: c.teal, label: "xung buck", labelX: 784, labelY: 460, marker: "arrow-slate" })}
      ${edge({ x1: 1070, y1: 380, x2: 1120, y2: 484, color: c.amber, marker: "arrow-slate" })}
      ${edge({ x1: 1070, y1: 598, x2: 1120, y2: 514, color: c.amber, marker: "arrow-slate" })}
      ${edge({ x1: 1308, y1: 500, x2: 1358, y2: 500, color: c.emerald, marker: "arrow-slate" })}
    `
  );

const boostConverterFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.violet },
    `
      ${group({ x: 108, y: 258, w: 1384, h: 506, title: "Chuỗi nguồn dự phòng", accent: c.violet, subtitle: "Pin 21700 cấp qua BMS và boost converter để duy trì bus 5V backup khi nguồn chính mất." })}
      ${[
        ["Pin 21700", ["Điện áp 3.0V đến 4.2V"], c.violet, "cell"],
        ["BMS 1S", ["Bảo vệ quá xả, quá sạc và ngắn mạch"], c.navy, "bms"],
        ["SX1308", ["Boost lên 5V cho nhánh dự phòng"], c.teal, "boost"],
        ["Diode Schottky", ["Cách ly với bus 5V chính"], c.amber, "diode"],
        ["Bus 5V backup", ["Nguồn runtime khi xe mất điện đầu vào"], c.emerald, "bus"],
        ["Tải runtime", ["Giữ tracker hoạt động để gửi heartbeat hoặc cảnh báo"], c.rose, "load"],
      ]
        .map(([heading, body, accentColor, tag], index) =>
          component({
            x: 138 + index * 230,
            y: 444,
            w: 198,
            h: 132,
            title: heading,
            body,
            accent: accentColor,
            tag,
          })
        )
        .join("")}
      ${[0, 1, 2, 3, 4]
        .map((index) => edge({ x1: 336 + index * 230, y1: 510, x2: 368 + index * 230, y2: 510, color: c.violet, marker: "arrow-slate" }))
        .join("")}
    `
  );

const powerMuxFigureCustom = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.teal },
    `
      ${group({ x: 92, y: 228, w: 388, h: 596, title: "Hai nhánh nguồn", accent: c.navy, subtitle: "Nguồn chính từ MP2482 và nguồn backup từ SX1308 hội tụ qua diode-OR." })}
      ${group({ x: 520, y: 228, w: 370, h: 596, title: "ESP32 Power FSM", accent: c.teal, subtitle: "Firmware đọc LVD + ADC rồi quyết định chọn nhánh nguồn và trạng thái sạc." })}
      ${group({ x: 930, y: 228, w: 578, h: 596, title: "Bus runtime và rail chức năng", accent: c.amber, subtitle: "Bus 5V runtime cấp về rail 3.3V và ~4V cho toàn hệ thống." })}
      ${component({ x: 132, y: 320, w: 308, h: 128, title: "MP2482 5V", body: ["Nhánh nguồn chính khi ắc quy xe còn đủ áp"], accent: c.navy, tag: "main" })}
      ${component({ x: 132, y: 544, w: 308, h: 128, title: "SX1308 5V backup", body: ["Nhánh dự phòng từ pin 21700"], accent: c.violet, tag: "backup" })}
      ${component({ x: 560, y: 304, w: 290, h: 138, title: "Đầu vào giám sát", body: ["GPIO19 LVD_STATUS", "GPIO4 ADC", "Ngưỡng profile 12V / 24V"], accent: c.teal, tag: "sense" })}
      ${component({ x: 560, y: 526, w: 290, h: 158, title: "Điều khiển FSM", body: ["GPIO18 POWER_PATH_EN chọn nhánh runtime", "GPIO5 CHARGER_EN bật hoặc tắt sạc"], accent: c.teal, tag: "control" })}
      ${component({ x: 970, y: 430, w: 218, h: 148, title: "D1 + D2 Schottky", body: ["Diode-OR cách ly hai nhánh"], accent: c.amber, tag: "or" })}
      ${component({ x: 1230, y: 430, w: 238, h: 148, title: "Bus 5V runtime", body: ["Không reset khi chuyển nguồn"], accent: c.emerald, tag: "bus" })}
      ${component({ x: 1100, y: 648, w: 498, h: 126, title: "Rail đầu ra", body: ["XL1509 3.3V cho ESP32-S3, LIS3DH", "TPS54231 ~4V cho SIM7600CE-T"], accent: c.rose, tag: "rails" })}
      ${edge({ x1: 440, y1: 384, x2: 560, y2: 372, color: c.navy, marker: "arrow-slate" })}
      ${edge({ x1: 440, y1: 608, x2: 560, y2: 604, color: c.violet, marker: "arrow-slate" })}
      ${edge({ x1: 850, y1: 372, x2: 970, y2: 476, color: c.teal, label: "LVD + ADC", labelX: 872, labelY: 414, marker: "arrow-slate" })}
      ${polyEdge({ points: [[850, 604], [930, 604], [930, 522], [970, 522]], color: c.teal, label: "GPIO18 / GPIO5", labelX: 882, labelY: 566, marker: "arrow-slate" })}
      ${edge({ x1: 1188, y1: 504, x2: 1230, y2: 504, color: c.amber, marker: "arrow-slate" })}
      ${edge({ x1: 1348, y1: 578, x2: 1348, y2: 648, color: c.emerald, marker: "arrow-slate" })}
    `
  );

const chargerBackupFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.rose },
    `
      ${group({ x: 110, y: 258, w: 1380, h: 510, title: "Chuỗi sạc và dự phòng năng lượng", accent: c.rose, subtitle: "Bus 5V từ nhánh chính sạc pin 21700 qua TP4056 và BMS; pin này lại nuôi nhánh backup SX1308." })}
      ${[
        ["Bus 5V từ MP2482", ["Nguồn sạc khi xe đang hoạt động"], c.navy, "bus"],
        ["TP4056", ["Mạch sạc Li-ion"], c.rose, "charge"],
        ["BMS 1S", ["Bảo vệ pin và giới hạn dòng"], c.amber, "bms"],
        ["Pin 21700", ["Dung lượng 5000 mAh"], c.violet, "cell"],
        ["SX1308 backup", ["Tạo nhánh 5V dự phòng"], c.teal, "boost"],
        ["Nguồn dự phòng", ["Cấp cho tracker khi mất nguồn chính"], c.emerald, "runtime"],
      ]
        .map(([heading, body, accentColor, tag], index) =>
          component({
            x: 142 + index * 220,
            y: 442,
            w: 188,
            h: 136,
            title: heading,
            body,
            accent: accentColor,
            tag,
          })
        )
        .join("")}
      ${note(344, 338, "GPIO5 CHARGER_EN bật hoặc tắt mạch sạc TP4056", 330, c.surfaceSoft, mix(c.rose, 0.26))}
      ${edge({ x1: 330, y1: 510, x2: 362, y2: 510, color: c.navy, marker: "arrow-slate" })}
      ${[1, 2, 3, 4]
        .map((index) => edge({ x1: 330 + index * 220, y1: 510, x2: 362 + index * 220, y2: 510, color: c.rose, marker: "arrow-slate" }))
        .join("")}
      ${edge({ x1: 508, y1: 392, x2: 472, y2: 442, color: c.rose, marker: "arrow-slate" })}
    `
  );

const enclosureLayoutFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.amber },
    `
      ${group({ x: 88, y: 224, w: 1424, h: 618, title: "Bố cục bên trong vỏ hộp tracker 100 x 70 x 35 mm", accent: c.amber, subtitle: "Phân vùng modem, anten và khối nguồn để giảm nhiễu chéo và thuận tiện đi dây." })}
      ${component({ x: 152, y: 318, w: 286, h: 136, title: "ESP32-S3 DevKit", body: ["Khối điều khiển trung tâm"], accent: c.navy, tag: "controller" })}
      ${component({ x: 152, y: 516, w: 286, h: 136, title: "TP4056 + BMS", body: ["Nhánh sạc và bảo vệ pin"], accent: c.rose, tag: "charger" })}
      ${component({ x: 508, y: 318, w: 300, h: 136, title: "SIM7600CE-T + rail ~4V", body: ["Tách khỏi khối nguồn xung để giảm EMI"], accent: c.teal, tag: "modem" })}
      ${component({ x: 508, y: 516, w: 300, h: 136, title: "Pin 21700 + giá đỡ", body: ["Khối dự phòng ở trung tâm trọng lượng"], accent: c.violet, tag: "battery" })}
      ${component({ x: 878, y: 318, w: 274, h: 136, title: "MP2482 + XL1509", body: ["Nguồn 5V chính và 3.3V"], accent: c.amber, tag: "power" })}
      ${component({ x: 878, y: 516, w: 274, h: 136, title: "SX1308 + diode-OR", body: ["Nhánh backup và power path"], accent: c.emerald, tag: "backup" })}
      ${component({ x: 1222, y: 318, w: 216, h: 118, title: "Anten 4G/LTE", body: ["Đặt thoáng, tránh che chắn"], accent: c.navy, tag: "rf" })}
      ${component({ x: 1222, y: 482, w: 216, h: 118, title: "Anten GNSS", body: ["Ưu tiên gần mặt thoáng"], accent: c.teal, tag: "gnss" })}
      ${component({ x: 1222, y: 646, w: 216, h: 118, title: "OBD2 / USB / khe SIM", body: ["Tập trung đầu nối để dễ thao tác"], accent: c.rose, tag: "io" })}
      ${polyEdge({ points: [[438, 386], [508, 386]], color: c.navy, marker: "arrow-slate" })}
      ${polyEdge({ points: [[438, 584], [508, 584]], color: c.rose, marker: "arrow-slate" })}
      ${polyEdge({ points: [[808, 386], [878, 386]], color: c.teal, marker: "arrow-slate" })}
      ${polyEdge({ points: [[808, 584], [878, 584]], color: c.violet, marker: "arrow-slate" })}
      ${edge({ x1: 1152, y1: 386, x2: 1222, y2: 376, color: c.amber, marker: "arrow-slate" })}
      ${edge({ x1: 1152, y1: 584, x2: 1222, y2: 542, color: c.emerald, marker: "arrow-slate" })}
    `
  );

const obdPlacementFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.amber },
    `
      ${group({ x: 118, y: 234, w: 520, h: 590, title: "Khu vực táp-lô / chân lái", accent: c.amber, subtitle: "Cổng OBD2 nằm dưới táp-lô; vgate iCar Pro cắm trực tiếp để lấy dữ liệu động cơ." })}
      ${group({ x: 822, y: 234, w: 662, h: 590, title: "Vị trí tracker", accent: c.teal, subtitle: "Tracker đặt trong cabin hoặc gần hộp cầu chì và giao tiếp BLE không dây với adapter OBD2." })}
      ${component({ x: 166, y: 372, w: 424, h: 140, title: "Cổng OBD2 dưới táp-lô", body: ["Cấp nguồn xe tại chân 16 và mass tại chân 4 / 5"], accent: c.amber, tag: "port" })}
      ${component({ x: 166, y: 586, w: 424, h: 140, title: "vgate iCar Pro", body: ["BLE dongle cắm trực tiếp", "Đọc dữ liệu OBD2 và trạng thái IGN"], accent: c.violet, tag: "dongle" })}
      ${component({ x: 872, y: 404, w: 260, h: 146, title: "Tracker trong cabin", body: ["Không cần cắm cố định vào cổng OBD2"], accent: c.teal, tag: "tracker" })}
      ${component({ x: 1182, y: 404, w: 252, h: 146, title: "Gần hộp cầu chì", body: ["Thuận tiện lấy nguồn và đi dây"], accent: c.navy, tag: "mount" })}
      ${component({ x: 912, y: 618, w: 472, h: 130, title: "Kết luận lắp đặt", body: ["BLE không dây giúp tracker tách khỏi cổng OBD2.", "Thiết bị vẫn lấy nguồn riêng từ hệ xe và bố trí linh hoạt hơn."], accent: c.emerald, tag: "note" })}
      ${edge({ x1: 378, y1: 512, x2: 378, y2: 586, color: c.amber, marker: "arrow-slate" })}
      ${polyEdge({ points: [[590, 656], [760, 656], [872, 476]], color: c.violet, label: "BLE", labelX: 720, labelY: 612, marker: "arrow-slate" })}
      ${edge({ x1: 1132, y1: 476, x2: 1182, y2: 476, color: c.teal, marker: "arrow-slate" })}
      ${polyEdge({ points: [[1002, 550], [1002, 618]], color: c.emerald, marker: "arrow-slate" })}
    `
  );

const lighthouseFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.violet },
    `
      ${box(82, 188, 1436, 734, { fill: c.surface, stroke: mix(c.violet, 0.18), rx: 34, shadow: false })}
      ${[
        ["Performance", "87", c.violet],
        ["First Contentful Paint", "1.2 s", c.navy],
        ["Largest Contentful Paint", "2.1 s", c.teal],
        ["Total Blocking Time", "120 ms", c.amber],
        ["Cumulative Layout Shift", "0.05", c.emerald],
        ["Time To Interactive", "2.5 s", c.rose],
      ]
        .map(([label, value, accent], index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          return component({ x: 170 + col * 418, y: 300 + row * 230, w: 308, h: 170, title: label, body: [value], accent, tag: "metric" });
        })
        .join("")}
    `
  );

const obdRealtimeFigure = (title, subtitle) =>
  appShell(
    title,
    subtitle,
    `
      ${box(370, 334, 1132, 508, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(398, 378, "Biểu đồ OBD2 thời gian thực", { cls: "card-title", maxChars: 28 })}
      <polyline points="430,498 520,470 610,412 700,434 790,388 880,420 970,398" fill="none" stroke="${c.navy}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="430,676 520,640 610,612 700,620 790,596 880,612 970,624" fill="none" stroke="${c.teal}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="1038,590 1108,562 1180,546 1252,534 1324,512 1396,520" fill="none" stroke="${c.amber}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      ${textBlock(430, 450, "RPM", { cls: "small" })}
      ${textBlock(430, 626, "Tốc độ", { cls: "small" })}
      ${textBlock(1038, 492, "Nhiệt độ nước làm mát", { cls: "small", maxChars: 24 })}
    `,
    c.navy
  );

const remoteCommandFigure = (title, subtitle) =>
  appShell(
    title,
    subtitle,
    `
      ${box(370, 334, 430, 508, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(398, 378, "Danh sách lệnh", { cls: "card-title", maxChars: 18 })}
      ${["request_location", "update_config", "restart_device", "enable_alert_mode"].map((command, index) => `${softBox(398, 424 + index * 92, 374, 62, { fill: c.surfaceSoft, stroke: mix(c.navy, 0.16), rx: 18 })}${textBlock(426, 462 + index * 92, command, { cls: "mono", maxChars: 24 })}`).join("")}
      ${box(830, 334, 672, 508, { fill: c.surface, stroke: c.line, rx: 28 })}
      ${textBlock(858, 378, "Kết quả round-trip", { cls: "card-title", maxChars: 20 })}
      ${[
        ["request_location", "Done", "3 s"],
        ["update_config", "Done", "2 s"],
        ["restart_device", "Done", "15 s"],
        ["enable_alert_mode", "Done", "2 s"],
      ]
        .map(([name, status, delay], index) => `${softBox(858, 430 + index * 92, 616, 62, { fill: c.surfaceSoft, stroke: mix(c.teal, 0.14), rx: 18 })}${textBlock(886, 468 + index * 92, name, { cls: "mono", maxChars: 28 })}${chip(1180, 444 + index * 92, 96, status, c.emerald)}${textBlock(1418, 468 + index * 92, delay, { cls: "body", anchor: "end" })}`).join("")}
    `,
    c.teal
  );

const mqttBridgeFlowFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.teal },
    `
      ${group({ x: 100, y: 224, w: 300, h: 602, title: "Nguồn vào", accent: c.navy, subtitle: "EMQX đẩy message theo topic telemetry và alert." })}
      ${group({ x: 436, y: 224, w: 372, h: 602, title: "MQTT Bridge", accent: c.teal, subtitle: "Chuỗi xử lý tuần tự trước khi fan-out." })}
      ${group({ x: 844, y: 224, w: 660, h: 602, title: "Đích đến", accent: c.rose, subtitle: "Dữ liệu được ghi đúng kho và đồng bộ ra giao diện." })}
      ${component({ x: 126, y: 336, w: 248, h: 150, title: "EMQX Broker", body: ["Topic telemetry, alerts, command"], accent: c.navy, tag: "ingest" })}
      ${component({ x: 126, y: 554, w: 248, h: 140, title: "Payload JSON", body: ["device_id, GPS, OBD2, nguồn, alert"], accent: c.navy, tag: "payload" })}
      ${component({ x: 466, y: 286, w: 312, h: 126, title: "1. Subscribe và parse", body: ["Nhận message, giải nén và chuẩn hóa topic"], accent: c.teal, tag: "step" })}
      ${component({ x: 466, y: 442, w: 312, h: 126, title: "2. Validate schema Zod", body: ["Loại bỏ payload lỗi, gắn timestamp chuẩn"], accent: c.teal, tag: "step" })}
      ${component({ x: 466, y: 598, w: 312, h: 126, title: "3. Fan-out và phát sự kiện", body: ["Ghi song song vào kho dữ liệu, gửi Socket.IO"], accent: c.teal, tag: "step" })}
      ${component({ x: 884, y: 280, w: 184, h: 126, title: "VictoriaMetrics", body: ["GPS, tốc độ, OBD2"], accent: c.rose, tag: "tsdb" })}
      ${component({ x: 1096, y: 280, w: 184, h: 126, title: "VictoriaLogs", body: ["Log kết nối, lỗi, audit"], accent: c.rose, tag: "logs" })}
      ${component({ x: 1308, y: 280, w: 168, h: 126, title: "PostgreSQL", body: ["Runtime, session, alert"], accent: c.rose, tag: "sql" })}
      ${component({ x: 996, y: 560, w: 366, h: 160, title: "Socket.IO / Dashboard", body: ["Đẩy sự kiện realtime cho trang tổng quan, bản đồ và cảnh báo."], accent: c.amber, tag: "realtime" })}
      ${edge({ x1: 374, y1: 410, x2: 466, y2: 348, color: c.navy, marker: "arrow-slate" })}
      ${edge({ x1: 622, y1: 412, x2: 622, y2: 442, color: c.teal, marker: "arrow-slate" })}
      ${edge({ x1: 622, y1: 568, x2: 622, y2: 598, color: c.teal, marker: "arrow-slate" })}
      ${edge({ x1: 778, y1: 650, x2: 884, y2: 344, color: c.teal, marker: "arrow-slate" })}
      ${edge({ x1: 778, y1: 662, x2: 1096, y2: 344, color: c.teal, marker: "arrow-slate" })}
      ${edge({ x1: 778, y1: 674, x2: 1308, y2: 344, color: c.teal, marker: "arrow-slate" })}
      ${edge({ x1: 778, y1: 694, x2: 996, y2: 640, color: c.amber, marker: "arrow-slate" })}
    `
  );

const ivmStructureFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.teal },
    `
      ${component({ x: 520, y: 178, w: 560, h: 116, title: "iot-vehicle-tracking-system/", body: ["Thư mục gốc gom các service Docker độc lập theo chuẩn IVM26."], accent: c.teal, tag: "root" })}
      ${[
        ["Tracking_Backend", "Express + TypeScript", c.navy, 120, 380],
        ["Tracking_Frontend", "Next.js Dashboard", c.violet, 410, 380],
        ["Tracking_MqttBridge", "Dịch vụ fan-out MQTT", c.teal, 700, 380],
        ["Tracking_EMQX", "Broker MQTT", c.amber, 990, 380],
        ["Tracking_PostgreSQL", "CSDL quan hệ", c.rose, 1280, 380],
        ["Tracking_VictoriaMetrics", "Time-series DB", c.rose, 120, 640],
        ["Tracking_VictoriaLogs", "Kho log tập trung", c.rose, 410, 640],
        ["Tracking_Grafana", "Dashboard giám sát", c.emerald, 700, 640],
        ["Tracking_NPM", "Reverse proxy", c.slate, 990, 640],
        ["Tracking_Data", "Volumes runtime gitignored", c.teal, 1280, 640],
      ]
        .map(([name, desc, accent, x, y]) => `${component({ x, y, w: 220, h: 138, title: name, body: [desc], accent, tag: "service" })}${edge({ x1: 800, y1: 294, x2: x + 110, y2: y, color: accent, marker: "arrow-slate" })}`)
        .join("")}
    `
  );

const backendFolderFigure = (title, subtitle) =>
  packageDiagram({
    title,
    subtitle,
    rootLabel: "Tracking_Backend / src",
    accent: c.amber,
    columns: [
      { title: "core/", items: ["interfaces, types", "zod schema và primitive dùng chung"], accent: c.navy, tag: "foundation", link: "types" },
      { title: "modules/", items: ["auth, device, vehicle, telemetry", "service, repository, controller"], accent: c.amber, tag: "domain", link: "ddd" },
      { title: "middleware/", items: ["auth, rate-limit, metrics", "request-id, sentry, error handler"], accent: c.rose, tag: "pipeline", link: "http" },
      { title: "shared/", items: ["utils, async-handler, response", "helper và cross-cutting concerns"], accent: c.teal, tag: "shared", link: "reuse" },
      { title: "api entrypoints", items: ["index.ts, routes, Socket.IO", "kết nối PostgreSQL và VictoriaMetrics"], accent: c.violet, tag: "entry", link: "entry" },
    ],
  });

const frontendFolderFigure = (title, subtitle) =>
  packageDiagram({
    title,
    subtitle,
    rootLabel: "Tracking_Frontend / src",
    accent: c.violet,
    columns: [
      { title: "app/", items: ["layout.tsx, page.tsx", "dashboard/, map/, alerts/"], accent: c.navy, tag: "routing", link: "routes" },
      { title: "components/", items: ["ui/, layout/, forms/", "map/, charts/, providers/"], accent: c.teal, tag: "shared-ui", link: "ui" },
      { title: "features/", items: ["vehicles/, alerts/, trips/", "module hóa theo feature"], accent: c.violet, tag: "feature", link: "use case" },
      { title: "lib/", items: ["api/, realtime/, store/", "utils và cấu hình dùng chung"], accent: c.amber, tag: "infra", link: "data" },
      { title: "types/", items: ["Kiểu TypeScript toàn cục", "Bắc cầu giữa REST và UI"], accent: c.emerald, tag: "support", link: "types" },
    ],
  });

const problemSolutionFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.navy },
    `
      ${group({ x: 84, y: 220, w: 620, h: 620, title: "Vấn đề hiện tại", accent: c.rose, subtitle: "Quản lý thủ công tạo độ trễ và làm mất tính quan sát theo thời gian thực." })}
      ${group({ x: 894, y: 220, w: 620, h: 620, title: "Giải pháp đề xuất", accent: c.emerald, subtitle: "Tracker gửi dữ liệu liên tục để tự động hóa giám sát và điều phối." })}
      ${component({ x: 130, y: 316, w: 240, h: 176, title: "Quản lý rời rạc", body: ["Gọi điện, giấy tờ, xác nhận thủ công", "Thông tin xe cập nhật chậm"], accent: c.rose, tag: "manual" })}
      ${component({ x: 414, y: 316, w: 240, h: 176, title: "Rủi ro vận hành", body: ["Khó biết xe đang ở đâu", "Chậm xử lý sự cố và vi phạm"], accent: c.rose, tag: "risk" })}
      ${component({ x: 250, y: 560, w: 240, h: 176, title: "Hệ quả", body: ["Thiếu dữ liệu lịch sử", "Không có cảnh báo tức thời", "Quyết định dựa trên cảm tính"], accent: c.rose, tag: "impact" })}
      ${component({ x: 936, y: 286, w: 240, h: 176, title: "Thiết bị tracker", body: ["GPS, OBD2, IMU, 4G LTE"], accent: c.navy, tag: "device" })}
      ${component({ x: 1198, y: 286, w: 268, h: 176, title: "Cloud + lưu trữ", body: ["EMQX, MQTT Bridge, Backend", "PostgreSQL, VictoriaMetrics, VictoriaLogs"], accent: c.teal, tag: "cloud" })}
      ${component({ x: 1066, y: 560, w: 268, h: 176, title: "Dashboard giám sát", body: ["Bản đồ thời gian thực", "Cảnh báo, báo cáo, điều khiển"], accent: c.emerald, tag: "ui" })}
      ${edge({ x1: 654, y1: 528, x2: 936, y2: 414, color: c.navy, label: "chuyển đổi số", labelX: 746, labelY: 448, marker: "arrow" })}
      ${edge({ x1: 1176, y1: 374, x2: 1198, y2: 374, color: c.teal, marker: "arrow-slate" })}
      ${edge({ x1: 1332, y1: 648, x2: 1240, y2: 462, color: c.emerald, marker: "arrow-slate" })}
    `
  );

const powerModeFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.teal },
    `
      ${component({ x: 618, y: 236, w: 360, h: 176, title: "Chế độ lái xe", body: ["IGN ON", "BLE OBD2 + GNSS + 4G hoạt động đầy đủ"], accent: c.navy, tag: "driving" })}
      ${component({ x: 188, y: 560, w: 360, h: 176, title: "Chế độ đỗ xe", body: ["IGN OFF", "ESP32 deep sleep, IMU canh rung động"], accent: c.emerald, tag: "parking" })}
      ${component({ x: 1050, y: 560, w: 360, h: 176, title: "Chế độ cảnh báo", body: ["IMU phát hiện chuyển động", "Thiết bị thức dậy và gửi alert ưu tiên"], accent: c.amber, tag: "alert" })}
      ${edge({ x1: 508, y1: 560, x2: 618, y2: 412, color: c.navy, label: "Bật máy", labelX: 520, labelY: 468, marker: "arrow-slate" })}
      ${edge({ x1: 978, y1: 412, x2: 1050, y2: 560, color: c.amber, label: "Xe đỗ nhưng có rung", labelX: 1030, labelY: 468, marker: "arrow-slate" })}
      ${edge({ x1: 1050, y1: 648, x2: 548, y2: 648, color: c.teal, label: "Timeout / reset", labelX: 754, labelY: 608, marker: "arrow-slate" })}
      ${edge({ x1: 978, y1: 324, x2: 1050, y2: 324, color: c.navy, label: "Tiếp tục lái", labelX: 996, labelY: 286, marker: "arrow-slate" })}
      ${edge({ x1: 618, y1: 324, x2: 548, y2: 560, color: c.emerald, label: "Tắt máy", labelX: 542, labelY: 390, marker: "arrow-slate" })}
    `
  );

const mapIntegrationFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.violet },
    `
      ${group({ x: 112, y: 232, w: 1378, h: 590, title: "Kiến trúc map realtime", accent: c.violet, subtitle: "Leaflet nhận dữ liệu vị trí qua store trung gian để đồng bộ marker và panel thông tin." })}
      ${component({ x: 170, y: 322, w: 286, h: 154, title: "Backend API + Socket.IO", body: ["Nhận telemetry từ MQTT Bridge", "Phát event vehicle:{id}:location"], accent: c.navy, tag: "server" })}
      ${component({ x: 528, y: 322, w: 276, h: 154, title: "Zustand Realtime Store", body: ["Lưu vị trí hiện tại", "Điều phối cập nhật sang UI"], accent: c.violet, tag: "store" })}
      ${component({ x: 872, y: 286, w: 254, h: 182, title: "React Leaflet Map", body: ["Tile Layer", "Marker Layer", "Geofence Overlay"], accent: c.teal, tag: "map" })}
      ${component({ x: 1194, y: 286, w: 238, h: 182, title: "Sidebar thông tin", body: ["Danh sách xe", "Thông tin chuyến và cảnh báo"], accent: c.amber, tag: "sidebar" })}
      ${component({ x: 942, y: 578, w: 260, h: 164, title: "Marker / Route Replay", body: ["Nội suy vị trí", "Phát lại hành trình"], accent: c.emerald, tag: "visual" })}
      ${edge({ x1: 456, y1: 398, x2: 528, y2: 398, color: c.navy, marker: "arrow-slate" })}
      ${edge({ x1: 804, y1: 382, x2: 872, y2: 374, color: c.violet, marker: "arrow-slate" })}
      ${edge({ x1: 804, y1: 430, x2: 1194, y2: 374, color: c.violet, marker: "arrow-slate" })}
      ${edge({ x1: 1000, y1: 468, x2: 1046, y2: 578, color: c.teal, marker: "arrow-slate" })}
    `
  );

const optimizedArchitectureFigure = (title, subtitle) =>
  svgDoc(
    1600,
    1000,
    { title, subtitle, accent: c.emerald },
    `
      ${group({ x: 98, y: 242, w: 262, h: 522, title: "Thiết bị", accent: c.navy, subtitle: "Tracker, OBD2 và cảm biến." })}
      ${group({ x: 404, y: 242, w: 250, h: 522, title: "Messaging", accent: c.teal, subtitle: "EMQX và MQTT Bridge." })}
      ${group({ x: 694, y: 242, w: 250, h: 522, title: "Backend", accent: c.amber, subtitle: "API, session, command." })}
      ${group({ x: 984, y: 242, w: 246, h: 522, title: "Frontend", accent: c.violet, subtitle: "Next.js, Query, Zustand." })}
      ${group({ x: 1270, y: 242, w: 232, h: 522, title: "Quan trắc", accent: c.rose, subtitle: "Metrics, logs, Grafana." })}
      ${component({ x: 122, y: 334, w: 214, h: 150, title: "ESP32-S3 + SIM7600CE-T", body: ["GPS, OBD2, cảnh báo ưu tiên"], accent: c.navy, tag: "device" })}
      ${component({ x: 428, y: 334, w: 202, h: 140, title: "EMQX", body: ["MQTT uplink / downlink"], accent: c.teal, tag: "broker" })}
      ${component({ x: 428, y: 530, w: 202, h: 150, title: "MQTT Bridge", body: ["validate -> fan-out -> Socket.IO"], accent: c.teal, tag: "bridge" })}
      ${component({ x: 718, y: 430, w: 202, h: 174, title: "Backend API", body: ["REST, auth, command", "Query Postgres / Metrics"], accent: c.amber, tag: "service" })}
      ${component({ x: 1008, y: 334, w: 198, h: 140, title: "TanStack Query", body: ["Cache dữ liệu lịch sử"], accent: c.violet, tag: "query" })}
      ${component({ x: 1008, y: 530, w: 198, h: 150, title: "Zustand + Socket.IO", body: ["State realtime cho map và dashboard"], accent: c.violet, tag: "store" })}
      ${component({ x: 1294, y: 334, w: 184, h: 140, title: "VictoriaMetrics", body: ["Time-series"], accent: c.rose, tag: "metrics" })}
      ${component({ x: 1294, y: 530, w: 184, h: 150, title: "VictoriaLogs + Grafana", body: ["Log và quan trắc"], accent: c.rose, tag: "ops" })}
      ${edge({ x1: 336, y1: 408, x2: 428, y2: 404, color: c.navy, label: "MQTT", labelX: 344, labelY: 370, marker: "arrow" })}
      ${edge({ x1: 528, y1: 474, x2: 528, y2: 530, color: c.teal, label: "fan-out", labelX: 464, labelY: 500, marker: "arrow-slate" })}
      ${edge({ x1: 630, y1: 604, x2: 718, y2: 516, color: c.teal, label: "events", labelX: 646, labelY: 548, marker: "arrow-slate" })}
      ${edge({ x1: 920, y1: 474, x2: 1008, y2: 404, color: c.amber, label: "REST", labelX: 930, labelY: 404, marker: "arrow-slate" })}
      ${edge({ x1: 920, y1: 548, x2: 1008, y2: 604, color: c.amber, label: "Socket.IO", labelX: 936, labelY: 566, marker: "arrow-slate" })}
      ${edge({ x1: 920, y1: 474, x2: 1294, y2: 404, color: c.amber, label: "queries", labelX: 1088, labelY: 380, marker: "arrow-slate" })}
      ${edge({ x1: 630, y1: 604, x2: 1294, y2: 604, color: c.teal, label: "logs + metrics", labelX: 904, labelY: 566, marker: "arrow-slate" })}
    `
  );

const output = [
  ["01-chuong-1-gioi-thieu-hinh-1-1.svg", problemSolutionFigure("Sơ đồ tổng quan vấn đề và giải pháp đề xuất", "Đối chiếu giữa mô hình quản lý thủ công và phương án tracker IoT tự động.")],
  ["01-chuong-1-gioi-thieu-hinh-1-2.svg", twoRowStageFigure("Quy trình phát triển dự án theo các giai đoạn", "Sáu giai đoạn được gom thành hai pha để tăng độ dễ đọc trên trang báo cáo.", {
    topTitle: "Ba giai đoạn nền tảng",
    bottomTitle: "Ba giai đoạn hoàn thiện hệ thống",
    items: [
      { title: "Giai đoạn 1", body: ["Nghiên cứu và thiết kế phần cứng"], accent: c.navy, tag: "phase 1" },
      { title: "Giai đoạn 2", body: ["Phát triển firmware ESP-IDF"], accent: c.teal, tag: "phase 2" },
      { title: "Giai đoạn 3", body: ["Triển khai hạ tầng cloud"], accent: c.amber, tag: "phase 3" },
      { title: "Giai đoạn 4", body: ["Xây dựng backend API"], accent: c.rose, tag: "phase 4" },
      { title: "Giai đoạn 5", body: ["Phát triển frontend dashboard"], accent: c.emerald, tag: "phase 5" },
      { title: "Giai đoạn 6", body: ["Tích hợp và kiểm thử"], accent: c.violet, tag: "phase 6" },
    ],
  })],
  ["01-chuong-1-gioi-thieu-hinh-1-3.svg", systemArchitectureFigure("Kiến trúc tổng thể hệ thống IoT Vehicle Tracking", "Sơ đồ component UML mô tả luồng dữ liệu từ thiết bị đến dashboard và lớp lưu trữ.")],
  ["01-chuong-1-gioi-thieu-hinh-1-4.svg", powerModeFigure("Sơ đồ chuyển đổi giữa các chế độ năng lượng", "Thiết bị chuyển giữa lái xe, đỗ xe và cảnh báo theo trạng thái IGN và dữ liệu IMU.")],
  ["01-chuong-1-gioi-thieu-hinh-1-5.svg", twoRowStageFigure("Lộ trình phát triển dự án theo các giai đoạn", "Roadmap được tách làm hai cụm mốc để giữ hình cân trang và dễ theo dõi hơn.", {
    topTitle: "Các mốc hoàn thiện prototype",
    bottomTitle: "Các mốc mở rộng sản phẩm",
    items: [
      { title: "Mốc 1", body: ["Prototype hoàn chỉnh"], accent: c.navy, tag: "m1" },
      { title: "Mốc 2", body: ["Pilot trong xe thử nghiệm"], accent: c.teal, tag: "m2" },
      { title: "Mốc 3", body: ["Ổn định hóa cloud và dashboard"], accent: c.amber, tag: "m3" },
      { title: "Mốc 4", body: ["Ứng dụng di động và thông báo đẩy"], accent: c.rose, tag: "m4" },
      { title: "Mốc 5", body: ["PCB chuyên dụng và tối ưu sản xuất"], accent: c.emerald, tag: "m5" },
      { title: "Mốc 6", body: ["Mở rộng AI, bảo mật và scale-out"], accent: c.violet, tag: "m6" },
    ],
  })],
  ["02-chuong-2-phan-tich-hinh-2-1.svg", dataArchitectureFigure("Kiến trúc dữ liệu của hệ thống", "Phân tách dữ liệu quan hệ, chuỗi thời gian và nhật ký theo đúng chiến lược lưu trữ.")],
  ["03-chuong-3-giai-phap-phan-cung-hinh-3-1.svg", trackerBlockFigure("Sơ đồ khối tracker", "Bám theo schematic và pin mapping firmware hiện tại với nhãn tiếng Việt đầy đủ.")],
  ["03-chuong-3-giai-phap-phan-cung-hinh-3-4.svg", powerManagementFigure("Sơ đồ khối hệ thống quản lý nguồn", "Thể hiện đầy đủ rail 5V, 3.3V, ~4V, pin backup và logic chuyển nguồn.")],
  ["05-chuong-3-giai-phap-backend-hinh-3-12.svg", systemArchitectureFigure("Kiến trúc tổng quan hệ thống Cloud", "Kiến trúc phân tầng kết hợp event-driven cho luồng dữ liệu IoT liên tục.")],
  ["05-chuong-3-giai-phap-backend-hinh-3-13.svg", dataArchitectureFigure("Chiến lược lưu trữ kép của hệ thống", "Mỗi loại dữ liệu được ghi vào đúng kho chuyên biệt để tối ưu vận hành và truy vấn.")],
  ["06-chuong-3-giai-phap-frontend-hinh-3-15.svg", featureFrontendFigure("Kiến trúc Feature-Sliced Design của ứng dụng Frontend", "Sơ đồ package UML mô tả rõ vai trò app/, features/, components/ và lib/.")],
  ["06-chuong-3-giai-phap-frontend-hinh-3-16.svg", sequenceAuthFigure("Biểu đồ trình tự luồng xác thực người dùng", "Sequence diagram thể hiện quá trình login, tạo session và bảo vệ route.")],
  ["06-chuong-3-giai-phap-frontend-hinh-3-17.svg", dashboardFigure("Giao diện trang Dashboard tổng quan", "Wireframe sáng, dùng tiếng Việt có dấu và các khối UI dễ đọc.")],
  ["06-chuong-3-giai-phap-frontend-hinh-3-18.svg", vehicleTableFigure("Giao diện trang quản lý phương tiện", "Data table mô phỏng danh sách xe, trạng thái tracker và thao tác quản trị.")],
  ["06-chuong-3-giai-phap-frontend-hinh-3-19.svg", mapIntegrationFigure("Kiến trúc tích hợp bản đồ thời gian thực", "Luồng dữ liệu từ Backend Socket.IO qua store đến React Leaflet và các lớp hiển thị.")],
  ["06-chuong-3-giai-phap-frontend-hinh-3-20.svg", mapFigure("Giao diện trang bản đồ thời gian thực", "Marker xe, tuyến di chuyển và vùng giám sát được hiển thị rõ ràng trên nền sáng.")],
  ["06-chuong-3-giai-phap-frontend-hinh-3-21.svg", dashboardFigure("Wireframe bố cục giao diện Dashboard", "Bố cục sáng, tiếng Việt có dấu và các khối chức năng chính được tách rõ.")],
  ["06-chuong-3-giai-phap-frontend-hinh-3-22.svg", uiPatternsFigure("Các mẫu thiết kế UI của hệ thống", "Tổng hợp pattern cho data table, form và chart trong cùng một ngôn ngữ thị giác.")],
  ["06-chuong-3-giai-phap-frontend-hinh-3-23.svg", optimizedArchitectureFigure("Sơ đồ kiến trúc tổng thể phương án tối ưu", "Phương án tối ưu hóa luồng dữ liệu giữa thiết bị, backend, frontend và quan trắc.")],
  ["07-chuong-4-trien-khai-hardware-hinh-4-1.svg", trackerBlockFigure("Sơ đồ khối tổng thể hệ thống tracker IoT", "Phiên bản triển khai thực tế của tracker với pin mapping đã chuẩn hóa.")],
  ["07-chuong-4-trien-khai-hardware-hinh-4-7.svg", buckConverterFigure("Sơ đồ nguyên lý mạch Buck Converter MP2482", "Minh họa lại luồng nguồn 12V / 24V sang bus 5V chính với các linh kiện then chốt.")],
  ["07-chuong-4-trien-khai-hardware-hinh-4-8.svg", boostConverterFigure("Sơ đồ nguyên lý mạch Boost Converter SX1308", "Chuỗi dự phòng từ pin 21700 qua BMS, boost và diode Schottky để duy trì bus 5V backup.")],
  ["07-chuong-4-trien-khai-hardware-hinh-4-9.svg", powerMuxFigureCustom("Sơ đồ mạch Power Path và logic chuyển nguồn tự động", "Ghép lại logic chọn nhánh chính hoặc backup, bám đúng tín hiệu ADC, LVD_STATUS, GPIO18 và GPIO5.")],
  ["07-chuong-4-trien-khai-hardware-hinh-4-10.svg", chargerBackupFigure("Sơ đồ mạch sạc TP4056 và bảo vệ pin 21700", "Thể hiện rõ chuỗi sạc pin và mối liên hệ giữa TP4056, BMS, pin 21700 và nhánh backup SX1308.")],
  ["07-chuong-4-trien-khai-hardware-hinh-4-11.svg", enclosureLayoutFigure("Sơ đồ bố cục bên trong vỏ hộp bảo vệ", "Bố cục lại các khối trong vỏ để nhấn mạnh nguyên tắc tách RF, nguồn xung và đầu nối.")],
  ["07-chuong-4-trien-khai-hardware-hinh-4-12.svg", twoRowStageFigure("Quy trình lắp ráp prototype phần cứng", "Sáu bước lắp ráp được tách thành hai pha để tăng độ rõ và tránh hình quá dài.", {
    topTitle: "Chuẩn bị và tích hợp điện",
    bottomTitle: "Kết nối, test và hoàn thiện",
    items: [
      { title: "Bước 1", body: ["Kiểm tra linh kiện"], accent: c.navy, tag: "step 1" },
      { title: "Bước 2", body: ["Lắp nhánh nguồn"], accent: c.teal, tag: "step 2" },
      { title: "Bước 3", body: ["Gắn ESP32-S3 và đi dây GPIO"], accent: c.amber, tag: "step 3" },
      { title: "Bước 4", body: ["Kết nối modem, IMU và ADC"], accent: c.rose, tag: "step 4" },
      { title: "Bước 5", body: ["Nạp firmware test tích hợp"], accent: c.emerald, tag: "step 5" },
      { title: "Bước 6", body: ["Đóng vỏ và hoàn thiện anten"], accent: c.violet, tag: "step 6" },
    ],
  })],
  ["07-chuong-4-trien-khai-hardware-hinh-4-14.svg", obdPlacementFigure("Minh họa vị trí cổng OBD2 trên xe và cách kết nối", "Làm rõ việc adapter OBD2 cắm trực tiếp vào cổng xe, còn tracker giao tiếp BLE không dây và đặt linh hoạt trong cabin.")],
  ["07-chuong-4-trien-khai-hardware-hinh-4-15.svg", vehicleInstallFigure("Minh họa lắp đặt thiết bị tracker trong xe và đi dây", "Bố cục trực quan hơn cho vị trí tracker, anten và đường kết nối chính khi lắp đặt trong xe.")],
  ["07-chuong-4-trien-khai-hardware-hinh-4-16.svg", twoRowStageFigure("Checklist kiểm tra hệ thống sau khi lắp đặt trong xe", "Checklist sau lắp đặt được chia hai cụm kiểm tra để tránh layout quá hẹp và giúp đọc nhanh hơn.", {
    topTitle: "Kiểm tra kết nối và định vị",
    bottomTitle: "Kiểm tra truyền thông và năng lượng",
    items: [
      { title: "Bước 1", body: ["Nguồn điện đầu vào đạt 12V hoặc 24V"], accent: c.navy, tag: "check 1" },
      { title: "Bước 2", body: ["BLE OBD2 đọc IGN, RPM, tốc độ"], accent: c.teal, tag: "check 2" },
      { title: "Bước 3", body: ["GNSS fix vị trí ổn định"], accent: c.amber, tag: "check 3" },
      { title: "Bước 4", body: ["4G / LTE đăng ký mạng và gửi MQTT"], accent: c.rose, tag: "check 4" },
      { title: "Bước 5", body: ["Power path chuyển nguồn không reset"], accent: c.emerald, tag: "check 5" },
      { title: "Bước 6", body: ["IMU wake-up và deep sleep hoạt động đúng chu kỳ"], accent: c.violet, tag: "check 6" },
    ],
  })],
  ["07-chuong-4-trien-khai-hardware-hinh-4-6.svg", powerManagementFigure("Kiến trúc tổng thể mạch quản lý nguồn", "Nhấn mạnh power path, pin dự phòng và rail cấp riêng cho modem.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-15.svg", systemArchitectureFigure("Kiến trúc tổng thể hệ thống Cloud và luồng dữ liệu", "Sơ đồ triển khai thực tế giữa EMQX, MQTT Bridge, Backend và các lớp lưu trữ.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-16.svg", ivmStructureFigure("Cấu trúc thư mục hệ thống theo quy ước IVM26", "Các dịch vụ Docker được tách độc lập và dùng chung dữ liệu runtime.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-17.svg", mqttBridgeFlowFigure("Luồng xử lý dữ liệu của MQTT Bridge", "Activity / component diagram cho subscribe, validate, fan-out và realtime.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-18.svg", backendFolderFigure("Cấu trúc thư mục Backend theo kiến trúc DDD", "Mô tả package core, modules, middleware và shared theo hệ triển khai hiện tại.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-19.svg", frontendFolderFigure("Cấu trúc thư mục Frontend theo kiến trúc Feature-Sliced", "Package diagram cho app, components, features, lib và types.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-20.svg", dashboardFigure("Giao diện trang Dashboard tổng quan", "Phiên bản trình bày cho chương triển khai cloud sau khi tích hợp Socket.IO và chart realtime.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-21.svg", vehicleTableFigure("Giao diện trang quản lý xe", "Danh sách phương tiện, trạng thái tracker và cột thao tác quản lý.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-22.svg", mapFigure("Giao diện bản đồ thời gian thực với vị trí các xe", "Bản đồ sáng, marker rõ ràng và không còn lỗi chữ đè nhau.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-23.svg", vehicleTableFigure("Giao diện trang quản lý cảnh báo", "Danh sách cảnh báo theo mức độ, xe liên quan và trạng thái xử lý.", true)],
  ["09-chuong-4-trien-khai-cloud-hinh-4-24.svg", observabilityFigure("Grafana dashboard hiển thị tổng quan hiệu năng hệ thống", "Mô phỏng dashboard giám sát CPU, độ trễ MQTT và tài nguyên ghi dữ liệu.")],
  ["09-chuong-4-trien-khai-cloud-hinh-4-25.svg", observabilityFigure("EMQX Dashboard hiển thị trạng thái kết nối thiết bị", "Mô phỏng số lượng client, thông lượng và sức khỏe broker.", { emqx: true })],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-20.svg", labSetupFigure("Bố trí thiết bị đo lường trong phòng thí nghiệm", "Sơ đồ bench test cho nguồn DC, DMM, tracker, OBD2 simulator và máy thu log.")],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-21.svg", vehicleInstallFigure("Thiết bị tracker được lắp đặt trên xe thử nghiệm", "Minh họa vị trí tracker, cổng OBD2, anten và tuyến đi dây chính.")],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-22.svg", testEnvironmentFigure("Sơ đồ môi trường thử nghiệm tổng thể", "Liên kết giữa bench phần cứng, cloud test stack, công cụ tải và dashboard.")],
];

const charts = [
  ["10-chuong-4-ket-qua-do-luong-hinh-4-23.svg", svgDoc(1600, 1000, { title: "Đồ thị dòng tiêu thụ theo chu kỳ hoạt động", subtitle: "Chuỗi Driving -> Parking -> Alert -> Parking với đỉnh 4G phát ở pha cảnh báo.", accent: c.navy }, lineChart({ x: 150, y: 270, w: 1280, h: 480, title: "Dòng tiêu thụ theo thời gian", subtitle: "Thiết bị giảm sâu khi Parking và tăng mạnh khi kích hoạt cảnh báo ưu tiên.", values: [350, 360, 180, 15, 0.5, 380, 15], labels: ["Drive 0'", "Drive 5'", "Idle 10'", "Sleep 20'", "Deep 25'", "Alert 32'", "Park 40'"], yTicks: [0, 100, 200, 300, 400, 500], yMax: 550, color: c.navy, area: true }))],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-24.svg", svgDoc(1600, 1000, { title: "Đồ thị điện áp pin dự phòng theo thời gian", subtitle: "Kiểm thử tracking liên tục trên pin 21700 với nhánh boost SX1308.", accent: c.emerald }, lineChart({ x: 150, y: 270, w: 1280, h: 480, title: "Điện áp pin dự phòng", subtitle: "Điện áp suy giảm đều nhưng vẫn duy trì vùng làm việc an toàn cho boost converter.", values: [4.2, 4.05, 3.92, 3.78, 3.62, 3.45, 3.28], labels: ["0h", "0.5h", "1h", "2h", "3h", "3.5h", "4h"], yTicks: [3.0, 3.3, 3.6, 3.9, 4.2], yMax: 4.4, color: c.emerald, area: true, formatter: numberText }))],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-25.svg", svgDoc(1600, 1000, { title: "Đồ thị dòng tiêu thụ theo nhiệt độ môi trường", subtitle: "Mức tiêu thụ tăng rõ khi tiến gần biên nhiệt của modem 4G.", accent: c.rose }, lineChart({ x: 150, y: 270, w: 1280, h: 480, title: "Dòng tiêu thụ so với nhiệt độ", subtitle: "Mốc 70 độ C cho thấy dấu hiệu mất ổn định khi modem tải mạnh.", values: [330, 338, 350, 355, 362, 410, 0], labels: ["-10°C", "0°C", "25°C", "45°C", "60°C", "70°C", "80°C"], yTicks: [0, 100, 200, 300, 400], yMax: 450, color: c.rose, area: true }))],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-26.svg", svgDoc(1600, 1000, { title: "Biểu đồ phân bố thời gian kết nối BLE OBD2", subtitle: "20 lần đo cho thấy phần lớn phiên kết nối hoàn tất trong 3-5 giây.", accent: c.teal }, barChart({ x: 150, y: 270, w: 1280, h: 480, title: "Phân bố thời gian kết nối", subtitle: "Adapter vgate iCar Pro giữ được độ ổn định tốt trong nhiều lần ghép nối.", labels: ["2-3s", "3-4s", "4-5s", "5-6s", "6-8s"], groups: [{ label: "Số lần đo", color: c.teal, values: [2, 7, 6, 3, 2] }], yTicks: [0, 2, 4, 6, 8], yMax: 8 }))],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-27.svg", svgDoc(1600, 1000, { title: "Đồ thị thời gian bắt vệ tinh GPS", subtitle: "So sánh ba kịch bản Cold Start, Warm Start và Hot Start trên GNSS tích hợp.", accent: c.navy }, barChart({ x: 150, y: 270, w: 1280, h: 480, title: "Thời gian bắt vệ tinh GNSS", subtitle: "Warm/Hot Start có lợi thế rõ rệt khi modem còn giữ ephemeris và trạng thái hoạt động.", labels: ["Cold", "Warm", "Hot"], groups: [{ label: "Min", color: c.navy, values: [20, 3, 0.5] }, { label: "Avg", color: c.teal, values: [30, 5, 1] }, { label: "Max", color: c.amber, values: [60, 12, 3] }], yTicks: [0, 15, 30, 45, 60], yMax: 65 }))],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-28.svg", svgDoc(1600, 1000, { title: "Biểu đồ phân bố độ trễ MQTT", subtitle: "So sánh QoS0, QoS1 và điều kiện mạng mạnh/yếu trong kiểm thử 4G.", accent: c.rose }, barChart({ x: 150, y: 270, w: 1280, h: 480, title: "Độ trễ MQTT theo điều kiện mạng", subtitle: "QoS1 tăng độ tin cậy nhưng tạo thêm overhead khi chất lượng sóng kém.", labels: ["4G/QoS0", "4G/QoS1", "Weak/QoS0", "Weak/QoS1"], groups: [{ label: "Avg", color: c.navy, values: [120, 180, 350, 500] }, { label: "P95", color: c.rose, values: [250, 380, 800, 1500] }], yTicks: [0, 400, 800, 1200, 1600], yMax: 1600 }))],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-29.svg", svgDoc(1600, 1000, { title: "Biểu đồ thời gian phản hồi API", subtitle: "P50, P95 và P99 cho các endpoint chính của backend.", accent: c.amber }, barChart({ x: 150, y: 270, w: 1280, h: 480, title: "P50 / P95 / P99 của API backend", subtitle: "Các endpoint đọc dữ liệu duy trì P95 dưới 200 ms; login cao hơn do bước xác thực mật khẩu.", labels: ["Vehicles", "Vehicle by ID", "Telemetry", "Alerts", "Auth"], groups: [{ label: "P50", color: c.navy, values: [38, 28, 45, 42, 100] }, { label: "P95", color: c.teal, values: [95, 72, 110, 100, 200] }, { label: "P99", color: c.amber, values: [150, 120, 180, 165, 350] }], yTicks: [0, 100, 200, 300], yMax: 380 }))],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-30.svg", svgDoc(1600, 1000, { title: "Đồ thị phân bố độ trễ end-to-end", subtitle: "So sánh độ trễ qua từng chặng từ thiết bị đến dashboard.", accent: c.navy }, barChart({ x: 150, y: 270, w: 1280, h: 480, title: "Độ trễ end-to-end của hệ thống", subtitle: "Mạng 4G vẫn là chặng chiếm tỷ trọng lớn nhất trong tổng độ trễ.", labels: ["MQTT uplink", "EMQX->Bridge", "Bridge->VM", "Bridge->API", "WebSocket", "Total"], groups: [{ label: "Avg", color: c.navy, values: [150, 5, 10, 5, 15, 185] }, { label: "P95", color: c.rose, values: [300, 15, 30, 12, 40, 400] }], yTicks: [0, 100, 200, 300, 400], yMax: 420 }))],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-31.svg", svgDoc(1600, 1000, { title: "Đồ thị hiệu suất hệ thống theo số lượng thiết bị", subtitle: "Theo dõi CPU, RAM và độ trễ khi tăng tải đồng thời.", accent: c.teal }, barChart({ x: 150, y: 270, w: 1280, h: 480, title: "Mức tải của hệ thống theo số thiết bị đồng thời", subtitle: "Ngưỡng 50-100 thiết bị còn nhiều dư địa; 200 thiết bị tiến sát giới hạn tài nguyên.", labels: ["10", "25", "50", "100", "200"], groups: [{ label: "CPU %", color: c.navy, values: [5, 10, 18, 30, 55] }, { label: "RAM / 100MB", color: c.teal, values: [12, 15, 18, 25, 35] }, { label: "Latency / 10ms", color: c.amber, values: [15, 16, 18, 22, 35] }], yTicks: [0, 15, 30, 45, 60], yMax: 60 }))],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-32.svg", lighthouseFigure("Kết quả Lighthouse Performance Audit của trang Dashboard", "Các chỉ số trọng yếu được trình bày lại bằng thẻ metric rõ ràng và dễ đọc.")],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-33.svg", mapFigure("Screenshot giao diện Dashboard hiển thị vị trí xe đang di chuyển trên bản đồ", "Mô phỏng trạng thái xe đang chạy trên nền bản đồ sáng, ưu tiên khả năng đọc.")],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-34.svg", obdRealtimeFigure("Screenshot biểu đồ dữ liệu OBD2 thời gian thực", "RPM, tốc độ và nhiệt độ nước làm mát được trình bày bằng chart sáng, không chồng chữ.")],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-35.svg", mapFigure("Screenshot cảnh báo Geofence trên giao diện Dashboard", "Vùng geofence và marker cảnh báo được tô rõ trên nền sáng.", { geofence: true })],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-36.svg", remoteCommandFigure("Screenshot giao diện gửi lệnh điều khiển từ Dashboard", "Hiển thị danh sách lệnh và round-trip phản hồi từ thiết bị theo bố cục rõ ràng.")],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-37.svg", mapFigure("Screenshot hành trình trên bản đồ sau khi phục hồi kết nối", "Mô phỏng tuyến đường đồng bộ đầy đủ sau khi bridge đẩy bù dữ liệu.", { route: true })],
  ["10-chuong-4-ket-qua-do-luong-hinh-4-38.svg", radarChart("Biểu đồ radar so sánh chỉ tiêu thiết kế và kết quả đạt được", "Tổng hợp nhanh các nhóm chỉ tiêu chính của hệ thống tracker IoT.")],
];

try {
  for (const [name, content] of [...output, ...charts]) {
    writeFileSync(join(outDir, name), content, "utf8");
  }

  for (const { name, code } of mermaidDiagrams) {
    const sourcePath = join(mermaidTempDir, name.replace(/\.svg$/u, ".mmd"));
    writeFileSync(sourcePath, code, "utf8");
    if (skipMermaidRender) continue;
    const outputPath = join(outDir, name);
    const args = ["-i", sourcePath, "-o", outputPath, "-c", mermaidConfigPath, "-b", "white", "-w", "1600", "-H", "900", "-q"];
    if (mermaidCliPath) execFileSync(process.execPath, [mermaidCliPath, ...args], { stdio: "pipe" });
    else execFileSync(npxBin, ["-y", "@mermaid-js/mermaid-cli", ...args], { stdio: "pipe", shell: process.platform === "win32" });
  }
} finally {
  rmSync(mermaidTempDir, { recursive: true, force: true });
}
