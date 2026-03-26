# Landing Page Image Brief

**Date:** 2026-03-15
**Purpose:** Brief asset generation cho landing page, không thay screenshot thật.

## Principles

- Ảnh AI chỉ làm atmosphere, concept, support.
- Screenshot thật mới là proof chính.
- Không generate chữ trong ảnh.
- Style phải thống nhất với visual direction: industrial, telemetry, trustworthy.

## Output Convention

- Raw generated assets: `resources/design/landing-page/generated/`
- Optimized web assets: `iot-vehicle-tracking-system-cloud/Tracking_Frontend/public/landing/`
- Naming: kebab-case, mô tả đúng chức năng.

## Asset Matrix

| Asset | Type | Aspect ratio | Placement | Recommendation |
|------|------|--------------|-----------|----------------|
| `hero-command-center` | AI image | 16:10 | Hero phải | `creative` + `pro` |
| `mobile-alert-handoff` | AI image | 4:5 | Mobile/alerts section | `creative` + `pro` |
| `device-cutaway-telemetry` | AI image | 4:3 | Architecture/edge device section | `search` hoặc `creative` |
| `dashboard-map-proof` | Real screenshot | 16:10 | Product proof | Capture thật |
| `dashboard-ops-proof` | Real screenshot | 16:10 | Product proof | Capture thật |
| `system-flow-strip` | SVG/manual | responsive | Architecture strip | Tự dựng, không AI |

## Prompt 01: Hero Command Center

Premium editorial technology illustration of an IoT fleet operations command center, abstract city road network and topographic route lines, connected trucks and vehicles as moving light traces, telemetry overlays, map pulses, subtle Vietnamese logistics context, graphite and deep slate base with teal and amber highlights, cinematic but clean, trustworthy enterprise product aesthetic, no text, no watermark, no faces, high detail, strong focal composition for website hero.

## Prompt 02: Mobile Alert Handoff

Modern product illustration showing a smartphone receiving fleet alerts and geofence events, route line wrapping around the device, layered notification cards, clean industrial UI mood, teal and amber status accents, dark graphite background, realistic lighting, premium SaaS editorial style, no text, no watermark, no human face, clear negative space for web layout.

## Prompt 03: Device Cutaway Telemetry

Technical product illustration of an in-vehicle IoT tracking device with GNSS and LTE telemetry concept, rugged hardware enclosure, antenna signal arcs, vehicle power context, SIM and sensor hints, clean exploded-view inspiration, enterprise engineering aesthetic, slate background, teal signal glow, amber status details, no text labels, no watermark, not a patent drawing, high clarity.

## Screenshot Targets

- `dashboard-map-proof`
  - Route: `/dashboard/map`
  - Frame priority: live map, markers, side filter/list, controls
- `dashboard-ops-proof`
  - Route: `/dashboard` hoặc `/dashboard/system-status`
  - Frame priority: overview stats, alerts/activity, system health

## Generation Workflow

1. Confirm final direction: dark hero / mixed theme / light hero.
2. Run validation interview from `ai-artist` skill before final generation.
3. Generate 2-3 variants per AI asset.
4. Pick 1 hero, 1 mobile visual, 1 device visual.
5. Resize/export web versions, add alt text inventory.

## Example Commands

```bash
python .codex/skills/ai-artist/scripts/generate.py "IoT fleet operations command center with route lines and telemetry overlays" -o resources/design/landing-page/generated/hero-command-center.png --mode creative --model pro -ar 16:10

python .codex/skills/ai-artist/scripts/generate.py "smartphone receiving fleet alerts and geofence events, industrial telemetry aesthetic" -o resources/design/landing-page/generated/mobile-alert-handoff.png --mode creative --model pro -ar 4:5

python .codex/skills/ai-artist/scripts/generate.py "in-vehicle IoT tracker hardware cutaway with GNSS LTE telemetry concept" -o resources/design/landing-page/generated/device-cutaway-telemetry.png --mode search --model pro -ar 4:3
```

## Notes

- Nếu prompt ra quá sci-fi, giảm hologram và tăng realism enterprise.
- Nếu prompt ra generic SaaS art, tăng từ khóa `industrial`, `telemetry`, `topographic`, `enterprise`.
- Nếu cần trust cao hơn nữa, giảm AI asset xuống còn 2 và tăng screenshot thật.

## Unresolved Questions

- Có muốn visual bám phần cứng thật của board hiện tại hơn không?
- Có cần thêm một asset sáng nền cho section light theme không?
