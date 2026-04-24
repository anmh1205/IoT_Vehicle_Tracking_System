# Thesis Asset Linkage

## Canonical Rules
- Prefer `.tex`, `.toc`, and `.md` text sections before any image or rendered PDF.
- For diagrams, prefer `assets/uml/*.mmd` before `assets/figures/*.svg` or `.png`.
- Use rendered figures only to confirm structure already grounded in text.

## Asset Group Mapping

| Asset prefix | Linked thesis area | Why it matters in this batch |
|---|---|---|
| `01-chuong-1-gioi-thieu-*` | Ch1 overview and system framing | Architecture intent support |
| `02-chuong-2-phan-tich-*` | Ch2 requirements/constraints | Problem framing support |
| `03-chuong-3-giai-phap-phan-cung-*` | Ch3.1 hardware design | Hardware context only |
| `04-chuong-3-giai-phap-firmware-*` | Ch3.2 firmware design | State machine and runtime flow support |
| `05-chuong-3-giai-phap-backend-*` | Ch3.3 server/cloud design | Device-to-cloud flow support |
| `06-chuong-3-giai-phap-frontend-*` | Ch3.4 frontend design | Cloud-to-dashboard flow support |
| `07-chuong-4-trien-khai-hardware-*` | Ch4.2.2 hardware implementation | Historical implementation evidence |
| `08-chuong-4-trien-khai-firmware-*` | Ch4.2.3 firmware implementation | Firmware implementation support |
| `09-chuong-4-trien-khai-cloud-*` | Ch4.2.4 cloud implementation | Deployment/runbook support |
| `10-chuong-4-ket-qua-do-luong-*` | Ch4.3 measurements | Measurement provenance only |
| `14-phu-luc-*` | Appendix support materials | Supplemental only |

## Schematic Support
- `assets/schematic/iot-vehicle-tracking-system-main-netlist.NET`
- `assets/schematic/iot-vehicle-tracking-system-main.pdf`

These schematic artifacts support hardware cross-checks, especially modem control-line uncertainty, but were not used as first-pass runtime truth in wave 1.

