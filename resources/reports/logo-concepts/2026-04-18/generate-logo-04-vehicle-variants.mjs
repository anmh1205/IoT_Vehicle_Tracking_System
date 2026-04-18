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

const variants = [
  {
    slug: 'geofence-vehicle-core',
    title: '04A. Geofence Vehicle Core',
    angle: 'Best balance of geofence + vehicle',
    signal: 'Shield perimeter outside, moving car inside, polygon geofence locked to the body.',
    palette: '#22c55e, #e2e8f0, #f59e0b',
    bg: 'linear-gradient(180deg, #052e16 0%, #0f172a 55%, #082f49 100%)',
    defs: '',
    body: '<path d="M256 74 376 124v86c0 100-58 182-120 234-62-52-120-134-120-234v-86L256 74Z" fill="#0f172a" fill-opacity="0.08" stroke="#22c55e" stroke-width="22" stroke-linejoin="round"/><path d="M162 262h28l24-54c9-20 28-32 49-32h58c20 0 38 10 49 27l22 35h20c12 0 22 10 22 22v28h-28" stroke="#e2e8f0" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path d="M216 288h92" stroke="#e2e8f0" stroke-width="18" stroke-linecap="round"/><circle cx="226" cy="292" r="24" fill="#0f172a" stroke="#f8fafc" stroke-width="10"/><circle cx="344" cy="292" r="24" fill="#0f172a" stroke="#f8fafc" stroke-width="10"/><path d="M190 214 242 184 320 194 350 244 318 300 230 312 182 268Z" fill="none" stroke="#f59e0b" stroke-width="12" stroke-linejoin="round"/><circle cx="350" cy="244" r="12" fill="#22c55e"/>'
  },
  {
    slug: 'route-car-shield',
    title: '04B. Route Car Shield',
    angle: 'More operational, more movement',
    signal: 'Car sits on route lines, shield frame gives policy and alert meaning.',
    palette: '#22c55e, #38bdf8, #f59e0b',
    bg: 'linear-gradient(150deg, #082f49 0%, #0f172a 52%, #431407 100%)',
    defs: '',
    body: '<path d="M256 78 382 126v92c0 98-60 176-126 228-66-52-126-130-126-228v-92L256 78Z" fill="#0f172a" fill-opacity="0.08" stroke="#38bdf8" stroke-width="22" stroke-linejoin="round"/><path d="M162 320c46-10 74-28 102-68 25-36 52-56 100-56h20" stroke="#22c55e" stroke-width="18" stroke-linecap="round"/><path d="M152 356c68-10 110-34 156-92" stroke="#f59e0b" stroke-width="14" stroke-linecap="round" stroke-dasharray="6 16"/><path d="M194 274h20l24-48c8-16 24-26 42-26h42c16 0 32 8 42 22l22 30h18c11 0 20 9 20 20v24h-24" stroke="#f8fafc" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><path d="M240 296h86" stroke="#f8fafc" stroke-width="16" stroke-linecap="round"/><circle cx="244" cy="300" r="20" fill="#0f172a" stroke="#f8fafc" stroke-width="8"/><circle cx="352" cy="300" r="20" fill="#0f172a" stroke="#f8fafc" stroke-width="8"/><circle cx="386" cy="196" r="14" fill="#22c55e"/>'
  },
  {
    slug: 'front-grille-guard',
    title: '04C. Front Grille Guard',
    angle: 'Feels most like a fleet product mark',
    signal: 'Vehicle front face is obvious; upper arcs imply radar and monitored perimeter.',
    palette: '#22c55e, #e2e8f0, #14b8a6',
    bg: 'linear-gradient(180deg, #052e16 0%, #0f172a 48%, #111827 100%)',
    defs: '',
    body: '<path d="M256 78 380 126v94c0 102-60 178-124 228-64-50-124-126-124-228v-94L256 78Z" fill="#0f172a" fill-opacity="0.08" stroke="#22c55e" stroke-width="22" stroke-linejoin="round"/><path d="M184 250c0-38 32-70 70-70h4c38 0 70 32 70 70v56c0 14-12 26-26 26H210c-14 0-26-12-26-26v-56Z" fill="none" stroke="#f8fafc" stroke-width="18"/><path d="M214 216h84" stroke="#14b8a6" stroke-width="14" stroke-linecap="round"/><path d="M208 262h96" stroke="#f8fafc" stroke-width="16" stroke-linecap="round"/><path d="M218 294h28M266 294h28" stroke="#f8fafc" stroke-width="16" stroke-linecap="round"/><circle cx="216" cy="332" r="24" fill="#0f172a" stroke="#f8fafc" stroke-width="10"/><circle cx="296" cy="332" r="24" fill="#0f172a" stroke="#f8fafc" stroke-width="10"/><path d="M154 208a122 122 0 0 1 204 0" stroke="#14b8a6" stroke-width="14" stroke-linecap="round"/><path d="M184 184a90 90 0 0 1 144 0" stroke="#f59e0b" stroke-width="12" stroke-linecap="round"/>'
  },
  {
    slug: 'radar-fleet-shield',
    title: '04D. Radar Fleet Shield',
    angle: 'Most surveillance and command-center oriented',
    signal: 'Shield perimeter, radar sweep, and a compact car form for monitoring at a glance.',
    palette: '#22c55e, #38bdf8, #f8fafc',
    bg: 'radial-gradient(circle at 50% 10%, #0e7490 0%, #0f172a 60%, #020617 100%)',
    defs: '',
    body: '<path d="M256 76 376 124v90c0 100-60 178-120 230-60-52-120-130-120-230v-90L256 76Z" fill="#0f172a" fill-opacity="0.08" stroke="#38bdf8" stroke-width="22" stroke-linejoin="round"/><circle cx="256" cy="240" r="92" stroke="#22c55e" stroke-width="14"/><path d="M256 148a92 92 0 0 1 82 50" stroke="#f8fafc" stroke-width="12" stroke-linecap="round"/><path d="M256 240 334 194" stroke="#f59e0b" stroke-width="14" stroke-linecap="round"/><circle cx="256" cy="240" r="18" fill="#f8fafc"/><path d="M196 298h18l18-38c7-14 20-22 35-22h42c14 0 28 7 36 18l18 24h13c9 0 16 7 16 16v18h-18" stroke="#f8fafc" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="M230 316h72" stroke="#f8fafc" stroke-width="14" stroke-linecap="round"/><circle cx="236" cy="320" r="18" fill="#0f172a" stroke="#f8fafc" stroke-width="8"/><circle cx="322" cy="320" r="18" fill="#0f172a" stroke="#f8fafc" stroke-width="8"/>'
  }
];

const report = `# Concept 04 refinements - vehicle-focused

Base input:
- Keep the shield / geofence / security idea from concept 04.
- Add a clear vehicle cue so the logo connects faster to fleet tracking.

## Variants
${variants.map((v) => `### ${v.title}
- File: \`logo-${v.slug}.svg\`
- Angle: ${v.angle}
- Signal: ${v.signal}
- Palette: ${v.palette}`).join('\n\n')}

## Recommendation
- Strongest overall: 04A. It keeps the original geofence shield logic but now the car is obvious.
- Best if you want a more product-facing fleet feel: 04C.
- Best if you want more motion and route semantics: 04B.
- Best if you want more monitoring / command-center semantics: 04D.

## Open question
- For the next refinement, should the brand lean more toward "vehicle", "tracking map", or "security/policy"?
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Concept 04 variants</title><style>
body{margin:0;background:#020617;color:#e2e8f0;font-family:"Segoe UI Variable Display","Bahnschrift","Segoe UI",sans-serif}
.page{max-width:1480px;margin:0 auto;padding:48px 32px 64px}
.hero{display:flex;justify-content:space-between;gap:24px;align-items:end;margin-bottom:28px}
h1{margin:0;font-size:44px;line-height:1.05;font-weight:700;letter-spacing:-0.03em}
.sub{max-width:780px;color:#94a3b8;font-size:18px;line-height:1.5}
.meta{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#67e8f9}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}
.card{position:relative;min-height:336px;border-radius:28px;padding:26px;border:1px solid rgba(148,163,184,.18);box-shadow:0 24px 80px rgba(0,0,0,.28);overflow:hidden}
.logo{display:flex;align-items:center;justify-content:center;height:220px;margin-bottom:14px;background:rgba(2,6,23,.12);border-radius:24px;backdrop-filter:blur(10px)}
.logo img{width:186px;height:186px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#cbd5e1}
.title{margin:8px 0 6px;font-size:28px;font-weight:700;letter-spacing:-.03em}
.desc{color:#cbd5e1;font-size:15px;line-height:1.45;max-width:92%}
.footer{margin-top:28px;color:#64748b;font-size:14px}
@media (max-width:1100px){.grid{grid-template-columns:1fr}.hero{display:block}.sub{margin-top:14px}}
</style></head><body><div class="page"><div class="hero"><div><div class="meta">Refining concept 04</div><h1>Vehicle-focused shield variants</h1></div><div class="sub">Each option keeps the original geofence / policy shield, but adds a clearer vehicle read so the mark connects faster to fleet tracking.</div></div><div class="grid">${variants.map((v) => `<article class="card" style="background:${v.bg}"><div class="logo"><img alt="${v.title}" src="./logo-${v.slug}.svg"/></div><div class="eyebrow">${v.angle}</div><div class="title">${v.title}</div><div class="desc">${v.signal}</div></article>`).join('')}</div><div class="footer">Saved under resources/reports/logo-concepts/2026-04-18</div></div></body></html>`;

await fs.writeFile(path.join(outDir, 'logo-04-vehicle-variants-report.md'), report, 'utf8');
await fs.writeFile(path.join(outDir, 'logo-04-vehicle-variants-board.html'), html, 'utf8');
await Promise.all(
  variants.map((variant) =>
    fs.writeFile(path.join(outDir, `logo-${variant.slug}.svg`), wrapSvg(variant.defs, variant.body), 'utf8')
  )
);

console.log(`Generated ${variants.length} concept-04 vehicle variants in ${outDir}`);
