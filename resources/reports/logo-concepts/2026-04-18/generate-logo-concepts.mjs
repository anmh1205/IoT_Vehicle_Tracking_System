import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.dirname(fileURLToPath(import.meta.url));
const wrapSvg = (defs, body) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">
  ${defs}
  <g transform="translate(0 4)">${body}</g>
</svg>
`;

const concepts = [
  { slug: 'signal-pin', title: 'Signal Pin', style: 'Monoline locator', bg: 'radial-gradient(circle at 20% 20%, #0f766e 0%, #082f49 42%, #020617 100%)', palette: '#2dd4bf, #7dd3fc, #f59e0b', signal: 'GNSS + realtime positioning', defs: '<defs><linearGradient id="g" x1="128" y1="84" x2="376" y2="420" gradientUnits="userSpaceOnUse"><stop stop-color="#2dd4bf"/><stop offset="0.6" stop-color="#67e8f9"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>', body: '<path d="M256 82C184 82 126 140 126 212c0 95 102 189 130 213 28-24 130-118 130-213 0-72-58-130-130-130Z" fill="#0b1120" fill-opacity="0.04" stroke="url(#g)" stroke-width="24" stroke-linejoin="round"/><circle cx="256" cy="210" r="38" fill="#f8fafc"/><circle cx="256" cy="210" r="18" fill="#0f172a"/><path d="M208 298c18 16 38 26 62 32" stroke="#f59e0b" stroke-width="16" stroke-linecap="round"/><path d="M168 168a118 118 0 0 1 164-36" stroke="#7dd3fc" stroke-width="14" stroke-linecap="round"/><path d="M352 152a118 118 0 0 1 28 58" stroke="#f59e0b" stroke-width="14" stroke-linecap="round"/>' },
  { slug: 'fleet-matrix', title: 'Fleet Matrix', style: 'Geometric system badge', bg: 'linear-gradient(135deg, #082f49 0%, #0f172a 50%, #052e16 100%)', palette: '#38bdf8, #14b8a6, #f59e0b', signal: 'Fleet orchestration on one surface', defs: '', body: '<rect x="92" y="92" width="328" height="328" rx="76" fill="#0f172a" fill-opacity="0.06" stroke="#38bdf8" stroke-width="22"/><path d="M178 178h156M178 334h156M178 178v156M334 178v156" stroke="#14b8a6" stroke-width="12" stroke-linecap="round"/><circle cx="178" cy="178" r="26" fill="#38bdf8"/><circle cx="334" cy="178" r="26" fill="#e2e8f0"/><circle cx="178" cy="334" r="26" fill="#e2e8f0"/><circle cx="334" cy="334" r="26" fill="#f59e0b"/><path d="M178 178c54 0 68 78 110 78 22 0 32-20 46-42" stroke="#14b8a6" stroke-width="16" stroke-linecap="round" fill="none"/>' },
  { slug: 'circuit-car', title: 'Circuit Car', style: 'Embedded tech mark', bg: 'linear-gradient(160deg, #111827 0%, #0f172a 55%, #3f2d0f 100%)', palette: '#22d3ee, #14b8a6, #f59e0b', signal: 'ESP32 device intelligence on vehicle', defs: '<defs><linearGradient id="g" x1="108" y1="174" x2="448" y2="338" gradientUnits="userSpaceOnUse"><stop stop-color="#22d3ee"/><stop offset="0.65" stop-color="#14b8a6"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>', body: '<path d="M108 302h40l32-70c12-26 38-42 66-42h72c26 0 50 13 64 35l28 45h34c14 0 26 12 26 26v36h-34" stroke="url(#g)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="M184 332h120" stroke="#e2e8f0" stroke-width="20" stroke-linecap="round"/><circle cx="198" cy="336" r="30" fill="#0f172a" stroke="#f8fafc" stroke-width="14"/><circle cx="364" cy="336" r="30" fill="#0f172a" stroke="#f8fafc" stroke-width="14"/><path d="M224 224h46m42 0h26" stroke="#14b8a6" stroke-width="12" stroke-linecap="round"/><path d="M246 224v-34m66 34v-52" stroke="#14b8a6" stroke-width="12" stroke-linecap="round"/><circle cx="246" cy="186" r="10" fill="#14b8a6"/><circle cx="312" cy="170" r="10" fill="#f59e0b"/>' },
  { slug: 'geofence-shield', title: 'Geofence Shield', style: 'Security badge', bg: 'linear-gradient(180deg, #052e16 0%, #0f172a 50%, #082f49 100%)', palette: '#22c55e, #e2e8f0, #f59e0b', signal: 'Policy engine + boundary protection', defs: '', body: '<path d="M256 74 376 124v86c0 100-58 182-120 234-62-52-120-134-120-234v-86L256 74Z" fill="#0f172a" fill-opacity="0.08" stroke="#22c55e" stroke-width="22" stroke-linejoin="round"/><path d="M174 248 230 182 328 198 342 284 258 334 176 290Z" fill="none" stroke="#e2e8f0" stroke-width="14" stroke-linejoin="round"/><path d="M156 300c34-4 52-18 70-42 18-24 36-38 74-38h38" stroke="#f59e0b" stroke-width="16" stroke-linecap="round"/><circle cx="340" cy="220" r="18" fill="#22c55e"/><circle cx="200" cy="280" r="14" fill="#38bdf8"/>' },
  { slug: 'orbit-relay', title: 'Orbit Relay', style: 'Network orchestrator', bg: 'radial-gradient(circle at 50% 50%, #0e7490 0%, #0f172a 55%, #111827 100%)', palette: '#38bdf8, #14b8a6, #f59e0b', signal: 'Broker, backend, mobile, dashboard', defs: '', body: '<circle cx="256" cy="256" r="48" fill="#0f172a"/><circle cx="256" cy="256" r="88" stroke="#38bdf8" stroke-width="16"/><path d="M104 256c0-84 68-152 152-152 30 0 60 9 84 25" stroke="#14b8a6" stroke-width="16" stroke-linecap="round"/><path d="M408 256c0 84-68 152-152 152-30 0-60-9-84-25" stroke="#f59e0b" stroke-width="16" stroke-linecap="round"/><circle cx="256" cy="104" r="14" fill="#14b8a6"/><circle cx="408" cy="256" r="14" fill="#f59e0b"/><circle cx="256" cy="408" r="14" fill="#e2e8f0"/><path d="M256 184 302 256 256 234 210 256Z" fill="#f8fafc"/><path d="M256 234v88" stroke="#f8fafc" stroke-width="18" stroke-linecap="round"/>' },
  { slug: 'northstar-gps', title: 'Northstar GPS', style: 'Premium compass emblem', bg: 'linear-gradient(135deg, #082f49 0%, #0f172a 45%, #1e293b 100%)', palette: '#f8fafc, #0ea5e9, #f59e0b', signal: 'Precision navigation + field confidence', defs: '', body: '<path d="M256 86 286 204 426 256 286 308 256 426 226 308 86 256 226 204Z" fill="#f8fafc"/><path d="M256 122 276 220 390 256 276 292 256 390 236 292 122 256 236 220Z" fill="#0ea5e9"/><path d="M256 176c-35 0-64 29-64 64 0 44 47 87 64 102 17-15 64-58 64-102 0-35-29-64-64-64Z" fill="#0f172a"/><circle cx="256" cy="240" r="20" fill="#f59e0b"/>' },
  { slug: 'pulse-dashboard', title: 'Pulse Dashboard', style: 'Operational UI mark', bg: 'linear-gradient(160deg, #431407 0%, #0f172a 48%, #082f49 100%)', palette: '#f97316, #38bdf8, #14b8a6', signal: 'Alerts, health, observability', defs: '', body: '<rect x="82" y="126" width="348" height="260" rx="48" fill="#0f172a" fill-opacity="0.08" stroke="#f97316" stroke-width="22"/><path d="M128 286h50l30-62 46 118 42-88 24 32h64" stroke="#38bdf8" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><rect x="138" y="186" width="88" height="18" rx="9" fill="#e2e8f0"/><rect x="240" y="186" width="134" height="18" rx="9" fill="#fdba74"/><path d="M256 390v34" stroke="#14b8a6" stroke-width="20" stroke-linecap="round"/><path d="M214 408h84" stroke="#14b8a6" stroke-width="22" stroke-linecap="round"/><circle cx="256" cy="442" r="30" fill="#14b8a6"/>' },
  { slug: 'hex-device', title: 'Hex Device', style: 'Hardware-first symbol', bg: 'linear-gradient(135deg, #052e16 0%, #0f172a 50%, #082f49 100%)', palette: '#06b6d4, #84cc16, #f59e0b', signal: 'Tracker hardware + firmware core', defs: '', body: '<path d="M256 88 366 152 366 280 256 344 146 280 146 152 256 88Z" fill="#0f172a" fill-opacity="0.08" stroke="#06b6d4" stroke-width="22" stroke-linejoin="round"/><path d="M256 88v-34M366 152l28-16M366 280l28 16M256 344v34M146 280l-28 16M146 152l-28-16" stroke="#84cc16" stroke-width="14" stroke-linecap="round"/><path d="M256 144c-38 0-70 32-70 70 0 48 52 95 70 112 18-17 70-64 70-112 0-38-32-70-70-70Z" fill="#e2e8f0"/><circle cx="256" cy="214" r="24" fill="#0ea5e9"/><path d="M318 170a98 98 0 0 1 34 44" stroke="#f59e0b" stroke-width="14" stroke-linecap="round"/>' },
  { slug: 'dock-link', title: 'Dock Link', style: 'Abstract platform connector', bg: 'linear-gradient(145deg, #0f172a 0%, #082f49 52%, #431407 100%)', palette: '#0ea5e9, #14b8a6, #f59e0b', signal: 'Thing dock + telemetry docking metaphor', defs: '', body: '<path d="M134 146v220c0 16 13 30 30 30h68" stroke="#0ea5e9" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/><path d="M378 146v220c0 16-13 30-30 30h-68" stroke="#0ea5e9" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/><path d="M184 256h56c22 0 40-18 40-40s18-40 40-40h24" stroke="#14b8a6" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><path d="M328 216h-24c-22 0-40 18-40 40s-18 40-40 40h-40" stroke="#f59e0b" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><circle cx="256" cy="256" r="24" fill="#f8fafc"/><circle cx="256" cy="256" r="10" fill="#0f172a"/>' },
  { slug: 'telemetry-totem', title: 'Telemetry Totem', style: 'Bold abstract monogram', bg: 'linear-gradient(180deg, #082f49 0%, #0f172a 50%, #111827 100%)', palette: '#38bdf8, #14b8a6, #f59e0b', signal: 'Command center beacon', defs: '', body: '<path d="M128 158h256" stroke="#38bdf8" stroke-width="28" stroke-linecap="round"/><path d="M256 158v196" stroke="#14b8a6" stroke-width="24" stroke-linecap="round"/><path d="M210 354 256 424 302 354" stroke="#f59e0b" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/><path d="M166 222a112 112 0 0 1 180 0" stroke="#e2e8f0" stroke-width="16" stroke-linecap="round"/><path d="M196 274a74 74 0 0 1 120 0" stroke="#14b8a6" stroke-width="14" stroke-linecap="round"/>' },
];

const report = `# Logo concepts - 2026-04-18

## Repo DNA
- Real-time IoT fleet tracking.
- ESP32-S3 + LTE/GNSS + MQTT ingest is the technical core.
- Dashboard, mobile shell, geofence, observability are the product surfaces.
- Brand tone should be: reliable, technical, realtime, field-ready.

## 10 logo directions
${concepts.map((c, i) => `### ${i + 1}. ${c.title}
- File: \`logo-${String(i + 1).padStart(2, '0')}-${c.slug}.svg\`
- Style: ${c.style}
- Signal: ${c.signal}
- Palette: ${c.palette}`).join('\n\n')}

## Shortlist suggestion
- If brand should feel like a SaaS product: Signal Pin, Orbit Relay, Pulse Dashboard.
- If brand should lean to tracker hardware: Circuit Car, Hex Device.
- If brand should lean to abstract platform branding: Dock Link, Telemetry Totem.

## Unresolved questions
- What is the final product name: generic project name or a brand like ThingDock?
- Should the logo lean toward B2B SaaS, tracker hardware, or fleet operations platform?
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Logo concepts</title><style>
body{margin:0;background:#020617;color:#e2e8f0;font-family:"Segoe UI Variable Display","Bahnschrift","Segoe UI",sans-serif}
.page{max-width:1480px;margin:0 auto;padding:48px 32px 64px}.hero{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-bottom:28px}
h1{margin:0;font-size:44px;line-height:1.05;font-weight:700;letter-spacing:-0.03em}.sub{max-width:720px;color:#94a3b8;font-size:18px;line-height:1.5}
.meta{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#67e8f9}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.card{position:relative;min-height:320px;border-radius:28px;padding:26px;border:1px solid rgba(148,163,184,.18);box-shadow:0 24px 80px rgba(0,0,0,.28);overflow:hidden}
.logo{display:flex;align-items:center;justify-content:center;height:220px;margin-bottom:14px;background:rgba(2,6,23,.14);border-radius:24px;backdrop-filter:blur(10px)}
.logo img{width:186px;height:186px}.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#cbd5e1}
.title{margin:8px 0 6px;font-size:28px;font-weight:700;letter-spacing:-.03em}.desc{display:flex;justify-content:space-between;gap:12px;color:#cbd5e1;font-size:15px;line-height:1.45}
.sig{max-width:58%}.pal{color:#f8fafc;font-weight:600;text-align:right}.footer{margin-top:28px;color:#64748b;font-size:14px}
@media (max-width:1100px){.grid{grid-template-columns:1fr}.hero{display:block}.sub{margin-top:14px}}
</style></head><body><div class="page"><div class="hero"><div><div class="meta">IoT Vehicle Tracking System</div><h1>10 logo directions</h1></div><div class="sub">Grounded in the repo: ESP32 tracker, LTE/GNSS positioning, MQTT ingestion, geofence policy, realtime dashboard, mobile shell, and observability.</div></div><div class="grid">${concepts.map((c, i) => `<article class="card" data-logo-card="${i + 1}" style="background:${c.bg}"><div class="logo"><img alt="${c.title}" src="./logo-${String(i + 1).padStart(2, '0')}-${c.slug}.svg"/></div><div class="eyebrow">${c.style}</div><div class="title">${String(i + 1).padStart(2, '0')}. ${c.title}</div><div class="desc"><div class="sig">${c.signal}</div><div class="pal">${c.palette}</div></div></article>`).join('')}</div><div class="footer">Saved under resources/reports/logo-concepts/2026-04-18</div></div></body></html>`;

await fs.writeFile(path.join(outDir, 'logo-concepts-report.md'), report, 'utf8');
await fs.writeFile(path.join(outDir, 'logo-board.html'), html, 'utf8');
await fs.writeFile(path.join(outDir, 'README.md'), '# Logo Concepts\n\nOpen `logo-board.html` to review. Individual assets are the `logo-*.svg` files.\n', 'utf8');
await Promise.all(concepts.map((c, i) => fs.writeFile(path.join(outDir, `logo-${String(i + 1).padStart(2, '0')}-${c.slug}.svg`), wrapSvg(c.defs, c.body), 'utf8')));
console.log(`Generated ${concepts.length} logo SVGs in ${outDir}`);
