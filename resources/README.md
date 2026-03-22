# Resources — IoT Vehicle Tracking System

> Index file cho thư mục `resources/`. Mỗi folder = 1 domain rõ ràng.

---

## Cấu trúc chuẩn (taxonomy)

### 1) Plans (Agent đọc để implement)

| Folder | Mô tả | Entry Point |
|--------|--------|-------------|
| **`plans/cloud/`** | Backend, Frontend, Mobile, Infra — master coding plan | `00-README.md` |
| **`plans/firmware/`** | ESP32-S3 firmware coding plan | `00-firmware-architecture.md` |
| **`plans/frontend-enhancement/`** | Frontend UI enhancement plans (EH-0→EH-5) | `00-README.md` |

### 2) Reports (Đọc tham khảo, không implement trực tiếp)

| Folder | Mô tả |
|--------|--------|
| **`reports/system-design/iot-vehicle-tracking-report/`** | Full system design report (hardware, firmware, backend, frontend) |
| **`reports/system-design/cloud-system-audit/`** | Cloud system audit report |
| **`reports/system-design/firmware-development/`** | Firmware development report |
| **`reports/thesis/chapters/`** | Thesis chapter sources (Markdown/HTML/assets) |
| **`reports/thesis/defense-slides/`** | HTML slides for thesis defense |
| **`reports/thesis/final/`** | Final thesis artifacts (docx/pdf) |
| **`reports/previews/landing-page/`** | Preview artifacts cho landing page |
| **`reports/diagram-reference-packs/`** | Diagram reference packs và QA/build artifacts |

### 3) References

| Folder | Mô tả |
|--------|--------|
| **`references/example/`** | Reference code (ví dụ `esp32-obd2-meter/`) |
| **`references/template/`** | Generic IoT project template |
| **`docs/hardware-datasheets/extracted-text/`** | Text extracts từ datasheet để grep/tra cứu nhanh |

## Naming & versioning policy

- Không dùng hậu tố mơ hồ như `.updated`.
- Bản final dùng format rõ ràng: `final-<topic>-vX.Y.<ext>` hoặc `YYYY-MM-DD-<topic>-vX.Y.<ext>`.
- Với binary lớn: chỉ giữ 1 bản canonical cho mỗi version.
- Với artifact generated: ưu tiên giữ output cần thiết, không giữ dependency cache (ví dụ `node_modules`).

## Temp / Build Policy

- Không để `tmp*` ở root repo.
- Artifact quan trọng phải đặt vào đúng domain trong `resources/`.
- Scratch/cache/build output phải xoá sau khi dùng, hoặc chỉ giữ khi user yêu cầu rõ.
