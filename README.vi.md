# Hệ thống Theo dõi Phương tiện IoT

Monorepo theo dõi đội xe IoT thời gian thực: firmware thiết bị, ingestion MQTT, backend API, dashboard web, mobile shell và stack quan sát hệ thống.

Ngôn ngữ: [English](README.md) | Tiếng Việt

**Lần xác thực gần nhất:** 2026-03-24
**Nhánh triển khai chính:** `uat` (các dịch vụ runtime)
**Mô hình triển khai:** Docker Compose tách theo từng service + mạng external dùng chung `tracking-network`

---

## Table of Contents
- [Tổng quan dự án](#project-overview)
- [Đối tượng sử dụng repository](#who-this-repository-is-for)
- [Khởi động nhanh](#quick-start)
- [Kiến trúc hệ thống (không dùng ảnh)](#system-architecture-image-free)
- [Luồng dữ liệu và hợp đồng MQTT](#data-flow-and-mqtt-contract)
- [Danh mục dịch vụ](#service-catalog)
- [Cổng và giao diện](#ports-and-interfaces)
- [Cấu hình môi trường](#environment-configuration)
- [Thứ tự khởi động và phụ thuộc](#startup-order-and-dependencies)
- [Quy trình phát triển cục bộ](#local-development-workflows)
- [Cổng chất lượng (tương đương CI)](#quality-gates-ci-parity)
- [Workflow CI/CD](#cicd-workflows)
- [Quan sát hệ thống](#observability)
- [Bối cảnh firmware và phần cứng](#firmware-and-hardware-context)
- [Khắc phục sự cố](#troubleshooting)
- [Đường cơ sở bảo mật](#security-baseline)
- [Bản đồ tài liệu](#documentation-map)
- [Ghi chú đóng góp](#contributing-notes)

---

## Project Overview

Repository này chứa một nền tảng theo dõi phương tiện IoT đầy đủ với các miền chính:

- **Phía thiết bị**: firmware ESP32-S3, điều phối modem LTE/GNSS, tích hợp OBD2 BLE, logic đánh thức dựa trên IMU.
- **Phía ingestion**: broker EMQX + MQTT Bridge xử lý và định tuyến dữ liệu.
- **Phía ứng dụng**: Backend API/WebSocket + Frontend dashboard + Mobile shell.
- **Phía vận hành**: PostgreSQL, VictoriaMetrics, VictoriaLogs, Grafana, Nginx Proxy Manager (tuỳ chọn).

Runtime được tách chủ đích thành các service độc lập để mỗi service có thể triển khai/scale độc lập.

---

## Who This Repository Is For

- **Kỹ sư Backend/Platform**: API, ingestion MQTT, storage, pipeline CI/CD.
- **Kỹ sư Frontend**: dashboard, hành vi auth/session, realtime UI.
- **Kỹ sư Mobile**: Flutter shell và tích hợp runtime mobile.
- **Kỹ sư Embedded/IoT**: kiến trúc firmware và tích hợp phần cứng.
- **Ops/SRE**: triển khai compose, giám sát, chẩn đoán runtime.

---

## Quick Start

### Path A — Chạy full stack cục bộ (khuyến nghị)

#### 1) Tạo Docker network dùng chung
```bash
docker network create tracking-network
```

#### 2) Chuẩn bị file môi trường
Tạo/copy các file sau:
- `iot-vehicle-tracking-system/Tracking_Backend/.env`
- `iot-vehicle-tracking-system/Tracking_Frontend/.env`
- `iot-vehicle-tracking-system/Tracking_MqttBridge/.env`
- `iot-vehicle-tracking-system/Tracking_EMQX/.env`
- `iot-vehicle-tracking-system/Tracking_PostgreSQL/.env`
- `iot-vehicle-tracking-system/Tracking_Grafana/.env`
- `iot-vehicle-tracking-system/Tracking_Mobile/.env` (cho luồng mobile)

Template có sẵn ở các file `.env.example` tương ứng (nếu có).

#### 3) Khởi động trước nhóm dịch vụ hạ tầng
```bash
docker compose -f iot-vehicle-tracking-system/Tracking_PostgreSQL/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system/Tracking_EMQX/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system/Tracking_VictoriaMetrics/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system/Tracking_VictoriaLogs/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system/Tracking_Grafana/docker-compose.yml up -d
```

#### 4) Khởi động nhóm dịch vụ ứng dụng
```bash
docker compose -f iot-vehicle-tracking-system/Tracking_MqttBridge/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system/Tracking_Backend/docker-compose.yml up -d
docker compose -f iot-vehicle-tracking-system/Tracking_Frontend/docker-compose.yml up -d
```

#### 5) Xác thực runtime
- Frontend: http://localhost:4001
- Backend health: http://localhost:4000/health
- Backend WS health: http://localhost:4000/ws-health
- API docs: http://localhost:4000/api-docs
- Grafana: http://localhost:4002
- EMQX dashboard: http://localhost:18083

---

### Path B — Phát triển một service đơn lẻ

Nếu bạn chỉ cần một service ở chế độ watch, hãy giữ hạ tầng chạy bằng Docker và chạy service ứng dụng cục bộ.

Backend:
```bash
cd iot-vehicle-tracking-system/Tracking_Backend
npm ci
npm run dev
```

Frontend:
```bash
cd iot-vehicle-tracking-system/Tracking_Frontend
npm ci
npm run dev
```

MQTT Bridge:
```bash
cd iot-vehicle-tracking-system/Tracking_MqttBridge
npm ci
npm run dev
```

Mobile:
```bash
cd iot-vehicle-tracking-system/Tracking_Mobile
flutter pub get
flutter test
flutter run
```

---

### Path C — Kiểm tra tương đương CI trước khi push

Backend:
```bash
cd iot-vehicle-tracking-system/Tracking_Backend
npm run lint
npm run typecheck
npm run test
npm run build
```

Frontend:
```bash
cd iot-vehicle-tracking-system/Tracking_Frontend
npm run lint
npm run typecheck
npm run build
```

MQTT Bridge:
```bash
cd iot-vehicle-tracking-system/Tracking_MqttBridge
npm run typecheck
npm run build
```

Mobile:
```bash
cd iot-vehicle-tracking-system/Tracking_Mobile
flutter test
flutter build apk --release --target-platform android-arm64
flutter build appbundle --release
```

---

## System Architecture (Image-Free)

```text
+----------------+        MQTT         +----------------+
|  IoT Devices   | ------------------> |      EMQX      |
+----------------+                     +----------------+
                                               |
                                               v
                                       +---------------------+
                                       | Tracking_MqttBridge |
                                       +---------------------+
                                        |         |         |
                                        v         v         v
                                 +-----------+ +-----------------+ +--------------+
                                 | PostgreSQL| | VictoriaMetrics | | VictoriaLogs |
                                 +-----------+ +-----------------+ +--------------+
                                      \             |                    |
                                       \            |                    |
                                        v           v                    v
                               +-----------------------------------------------+
                               | Tracking_Backend (REST + Realtime + OpenAPI) |
                               +-----------------------------------------------+
                                      |                         |
                                      v                         v
                           +----------------------+    +------------------+
                           | Tracking_Frontend    |    | Tracking_Mobile  |
                           +----------------------+    +------------------+

Grafana hiển thị dữ liệu từ VictoriaMetrics và VictoriaLogs.
```

---

## Data Flow and MQTT Contract

### Luồng end-to-end
1. Thiết bị publish telemetry/events/status/firmware lên EMQX.
2. MQTT Bridge subscribe và định tuyến dữ liệu vào pipeline lưu trữ.
3. Backend phục vụ API và đẩy cập nhật realtime cho client.
4. Frontend và Mobile tiêu thụ API/kênh realtime từ backend.
5. Metrics/logs được lưu ở stack Victoria và trực quan hoá qua Grafana.

### Hợp đồng topic MQTT

| Topic | Hướng | QoS | Mục đích |
|---|---|---|---|
| `v1/{device_id}/rawdata` | Device -> Server | 0 | Telemetry tần suất cao (chấp nhận mất gói) |
| `v1/{device_id}/status` | Device -> Server | 1 | Heartbeat / trạng thái phiên |
| `v1/{device_id}/events` | Device -> Server | 1 | Cảnh báo và sự kiện quan trọng |
| `v1/{device_id}/firmware` | Device -> Server | 1 | Tiến trình/kết quả OTA |
| `v1/{device_id}/commands` | Server -> Device | 1 | Lệnh từ xa/cập nhật cấu hình |

### Ví dụ lệnh từ xa

| Command | Mục đích | Trường thường dùng |
|---|---|---|
| `update_config` | Cập nhật cấu hình runtime | `heartbeat_interval_s`, `tracking_interval_s` |
| `ota_update` | Kích hoạt OTA update | `jobId`, `version`, `url`, `size`, `sha256`, `force`, `confirmTimeoutSec` |

---

## Service Catalog

| Service | Path | Runtime | Vai trò chính | Lệnh chạy local |
|---|---|---|---|---|
| Backend | `iot-vehicle-tracking-system/Tracking_Backend` | Node.js + Express + TS | REST, realtime, docs, health, metrics | `npm run dev` |
| Frontend | `iot-vehicle-tracking-system/Tracking_Frontend` | Next.js + React + TS | Dashboard + landing | `npm run dev` |
| MQTT Bridge | `iot-vehicle-tracking-system/Tracking_MqttBridge` | Node.js + TS | Ingest MQTT + routing | `npm run dev` |
| Mobile | `iot-vehicle-tracking-system/Tracking_Mobile` | Flutter | Mobile shell | `flutter run` |
| EMQX | `iot-vehicle-tracking-system/Tracking_EMQX` | Docker image | MQTT broker | `docker compose up -d` |
| PostgreSQL | `iot-vehicle-tracking-system/Tracking_PostgreSQL` | Docker image | CSDL quan hệ | `docker compose up -d` |
| VictoriaMetrics | `iot-vehicle-tracking-system/Tracking_VictoriaMetrics` | Docker image | Kho metrics | `docker compose up -d` |
| VictoriaLogs | `iot-vehicle-tracking-system/Tracking_VictoriaLogs` | Docker image | Kho logs | `docker compose up -d` |
| Grafana | `iot-vehicle-tracking-system/Tracking_Grafana` | Docker image | Dashboard quan sát | `docker compose up -d` |
| NPM (tuỳ chọn) | `iot-vehicle-tracking-system/Tracking_NPM` | Docker image | Quản lý reverse proxy | `docker compose --profile production up -d` |

---

## Ports and Interfaces

| Thành phần | Cổng host | Ghi chú |
|---|---|---|
| Frontend | `4001` | Next.js UI |
| Backend API | `4000` | `/health`, `/ws-health`, `/api-docs`, `/metrics`, `/api/v1/*` |
| PostgreSQL | `5432` | Truy cập DB |
| EMQX MQTT | `1883`, `8883` | MQTT / MQTTS |
| EMQX WebSocket | `8083`, `8084` | WS / WSS |
| EMQX Dashboard | `18083` | UI quản trị broker |
| Grafana | `4002` | Dashboard giám sát |
| VictoriaMetrics | `8428` | Endpoint metrics |
| VictoriaLogs | `9428` | Endpoint logs |
| NPM (tuỳ chọn) | `80`, `81`, `443` | Reverse proxy + admin |

---

## Environment Configuration

### Các secret tối thiểu bắt buộc

#### Backend (`Tracking_Backend/.env`)
Bắt buộc:
- `POSTGRESQL_PASSWORD`
- `MQTT_PASSWORD`
- `SESSION_SECRET`

Bắt buộc cho production:
- `METRICS_PASSWORD`

#### Frontend (`Tracking_Frontend/.env`)
Bắt buộc theo source code:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

Ghi chú:
- Source hiện tại đọc `NEXT_PUBLIC_API_URL` (API rewrite) và `NEXT_PUBLIC_WS_URL` (socket provider).

#### MQTT Bridge (`Tracking_MqttBridge/.env`)
Bắt buộc:
- `MQTT_PASSWORD`
- `POSTGRESQL_PASSWORD`

#### EMQX (`Tracking_EMQX/.env`)
Bắt buộc:
- `EMQX_DASHBOARD__DEFAULT_PASSWORD`
- `EMQX_NODE__COOKIE`

#### PostgreSQL (`Tracking_PostgreSQL/.env`)
Bắt buộc:
- `POSTGRES_PASSWORD`

#### Grafana (`Tracking_Grafana/.env`)
Bắt buộc:
- `GRAFANA_PASSWORD`

#### Mobile (`Tracking_Mobile/.env`)
Biến chính:
- `WEB_APP_URL`
- `API_BASE_URL`
- `WS_URL`
- `FIREBASE_PROJECT_ID` (tuỳ chọn)

Quan trọng:
- `Tracking_Mobile/.env.example` đã dùng mặc định theo runtime (`4000/4001`); chỉ cần chỉnh lại nếu môi trường local của bạn dùng cổng khác.

---

## Startup Order and Dependencies

Thứ tự khởi động khuyến nghị:
1. **Network**: tạo `tracking-network`
2. **Storage/Broker**: PostgreSQL, EMQX, VictoriaMetrics, VictoriaLogs
3. **Visualization**: Grafana
4. **Ingestion**: MQTT Bridge
5. **Application**: Backend
6. **Clients**: Frontend / Mobile

Vì sao theo thứ tự này:
- MQTT Bridge và Backend phụ thuộc broker/database/storage phải sẵn sàng.
- Frontend và Mobile chỉ thực sự hữu ích khi API/realtime endpoint đã chạy.

---

## Local Development Workflows

### Backend
```bash
cd iot-vehicle-tracking-system/Tracking_Backend
npm ci
npm run dev
```

Lệnh thường dùng:
```bash
npm run lint
npm run typecheck
npm run test
npm run test:cov
npm run build
npm run verify
```

### Frontend
```bash
cd iot-vehicle-tracking-system/Tracking_Frontend
npm ci
npm run dev
```

Lệnh thường dùng:
```bash
npm run lint
npm run typecheck
npm run build
```

### MQTT Bridge
```bash
cd iot-vehicle-tracking-system/Tracking_MqttBridge
npm ci
npm run dev
```

Lệnh thường dùng:
```bash
npm run typecheck
npm run build
npm run verify
```

### Mobile
```bash
cd iot-vehicle-tracking-system/Tracking_Mobile
flutter pub get
flutter test
flutter run
```

---

## Quality Gates (CI Parity)

Trước khi push thay đổi theo service:

- Backend: lint + typecheck + test + build
- Frontend: lint + typecheck + build
- MQTT Bridge: typecheck + build
- Mobile: test + release artifacts (cho workflow phát hành)

Các bước này phản chiếu phần quality trong workflow UAT.

---

## CI/CD Workflows

### Runtime/UAT workflows (chủ yếu `push` vào `uat` với path filter)

| Khu vực | File workflow | Mô hình trigger |
|---|---|---|
| Backend | [.github/workflows/backend-uat.yml](.github/workflows/backend-uat.yml) | `push: uat` + path filter |
| Frontend | [.github/workflows/frontend-uat.yml](.github/workflows/frontend-uat.yml) | `push: uat` + path filter |
| MQTT Bridge | [.github/workflows/mqtt-bridge-uat.yml](.github/workflows/mqtt-bridge-uat.yml) | `push: uat` + path filter |
| Mobile | [.github/workflows/mobile-uat.yml](.github/workflows/mobile-uat.yml) | `push: uat` + path filter |
| EMQX | [.github/workflows/emqx-uat.yml](.github/workflows/emqx-uat.yml) | `push: uat` + path filter |
| PostgreSQL | [.github/workflows/postgresql-uat.yml](.github/workflows/postgresql-uat.yml) | `push: uat` + path filter |
| Grafana | [.github/workflows/grafana-uat.yml](.github/workflows/grafana-uat.yml) | `push: uat` + path filter |
| VictoriaMetrics | [.github/workflows/victoria-metrics-uat.yml](.github/workflows/victoria-metrics-uat.yml) | `push: uat` + path filter |
| VictoriaLogs | [.github/workflows/victoria-logs-uat.yml](.github/workflows/victoria-logs-uat.yml) | `push: uat` + path filter |
| NPM | [.github/workflows/npm-uat.yml](.github/workflows/npm-uat.yml) | `push: uat` + path filter |

### Workflow docs/artifact (mô hình trigger khác)

| Khu vực | File workflow | Mô hình trigger |
|---|---|---|
| Diagram Pack CI | [.github/workflows/diagram-pack-ci.yml](.github/workflows/diagram-pack-ci.yml) | `pull_request` + `push` (`feature/system-coding`, `uat`) |
| Diagram Pack Release | [.github/workflows/diagram-pack-release.yml](.github/workflows/diagram-pack-release.yml) | `workflow_dispatch` + `push: main` |

---

## Observability

- Backend public các endpoint:
  - `/health`
  - `/ws-health`
  - `/metrics`
- Đường dẫn provisioning Grafana:
  - `iot-vehicle-tracking-system/Tracking_Grafana/provisioning`
- Retention mặc định từ compose:
  - VictoriaMetrics: `30d`
  - VictoriaLogs: `7d`

Ghi chú vận hành:
- Hãy đảm bảo Grafana và các service Victoria đang chạy trước khi chẩn đoán sâu; nếu không, truy vấn telemetry/log có thể trông giống lỗi ứng dụng.

---

## Firmware and Hardware Context

Theo tài liệu thesis draft và đồng bộ với tài sản dự án hiện tại:

- **MCU**: ESP32-S3 làm bộ điều khiển trung tâm.
- **Cellular + GNSS**: SIM7600CE-T (LTE + GNSS tích hợp), điều khiển qua luồng AT command.
- **IMU**: LIS3DH cho cơ chế đánh thức theo chuyển động.
- **Tích hợp OBD2**: luồng BLE adapter (nhóm thiết bị vgate iCar Pro).

Hành vi vận hành liên quan:
- Chính sách MQTT QoS theo lớp (QoS 0 cho telemetry tần suất cao, QoS 1 cho event/lệnh quan trọng).
- Cấu hình từ xa qua `update_config` trên command topic.
- Luồng OTA qua hợp đồng payload `ota_update`.

---

## Troubleshooting

| Triệu chứng | Nguyên nhân khả dĩ | Cần kiểm tra |
|---|---|---|
| Service không resolve được nhau | Thiếu `tracking-network` | `docker network ls` rồi tạo network |
| Frontend không gọi được backend | Sai key env frontend | Đảm bảo `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_WS_URL` |
| Backend thoát khi khởi động | Thiếu secret bắt buộc | Kiểm tra DB/MQTT/session trong `.env` backend |
| MQTT Bridge không nhận dữ liệu | Sai auth broker/topic | Xác minh credential EMQX và ACL/pattern topic |
| Không đăng nhập được EMQX dashboard | Sai credential broker env | Kiểm tra lại `Tracking_EMQX/.env` |
| Không đăng nhập được Grafana | Sai credential Grafana env | Kiểm tra lại `Tracking_Grafana/.env` |
| Panel metrics/log rỗng | Service Victoria chưa sẵn sàng | Kiểm tra health/state container ở `8428`, `9428` |
| Mobile không kết nối API | Lệch cổng env mobile | Đồng bộ `API_BASE_URL`/`WS_URL` với backend cổng 4000 |

---

## Security Baseline

- Không commit `.env` hoặc giá trị secret.
- Dùng credential mạnh cho DB, broker, dashboard.
- Trong production:
  - ưu tiên TLS MQTT (`8883`)
  - tránh public các cổng không cần thiết
  - bắt buộc ACL theo topic để mỗi thiết bị chỉ truy cập phạm vi topic của chính nó (`v1/{device_id}/...`)
- Luôn xoay vòng session/auth secret và tránh giá trị mặc định.

---

## Documentation Map

Tài liệu lõi:
- [docs/project-overview-pdr.md](docs/project-overview-pdr.md)
- [docs/system-architecture.md](docs/system-architecture.md)
- [docs/codebase-summary.md](docs/codebase-summary.md)
- [docs/development-roadmap.md](docs/development-roadmap.md)
- [docs/project-changelog.md](docs/project-changelog.md)
- [docs/code-standards.md](docs/code-standards.md)

Tham chiếu kỹ thuật mở rộng:
- `resources/reports/thesis/final/99-bao-cao-thesis-hoan-chinh-readability-draft.md`

---

## Contributing Notes

- Giữ phạm vi thay đổi đúng service bạn chỉnh sửa.
- Chạy quality gate cục bộ trước khi push.
- Nếu thay đổi ảnh hưởng kiến trúc/luồng dữ liệu, cập nhật tài liệu trong [docs/](docs/).
- Nếu thay đổi chạm vào hành vi deploy, đảm bảo workflow và file compose liên quan vẫn nhất quán.

---

Nếu cần, bạn có thể duy trì cặp README song ngữ (`README.vi.md`) trong khi giữ [README.md](README.md) là tài liệu onboarding kỹ thuật chuẩn.
