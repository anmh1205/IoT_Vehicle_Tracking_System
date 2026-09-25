# Ghi chú các điểm cần fix trước khi nộp bài

> Các điểm dưới đây là chênh lệch docs/claim vs hiện trạng, hoặc việc còn phải làm.
> Trong đề cương/bản thảo coi như **đã clear** theo hướng xử lý ghi ở cột phải — chủ dự án sẽ fix.

---

## A. Bảng truth linh kiện (nguồn duy nhất)

**Nguồn đúng:** `iot-vehicle-tracking-system-firmware/documents/hardware-specs/iot-vehicle-tracking-system-main-netlist.NET` (+ `index/hardware-specs-index.md` cho datasheet).

**Không dùng làm nguồn tên linh kiện:** Altium `.PrjPcb` / `proj.txt` (đã drift — ví dụ từng ghi TP4056, SIM7600CE lẫn SIM7600E).

| Ref | Part (netlist) | Ghi chú |
|---|---|---|
| U1 | MP2482 | Buck → `+5V-BUCK` / bus 5 V |
| U2 | SX1308 | Boost từ `BATTERY+` |
| U3 | **TP5100** | Sạc 1S (QFN16). Index datasheet đang nhầm liệt kê TP4056 — cần thay/bổ sung datasheet TP5100 |
| U4 | **AP2112K-3.3TRG1** | LDO → `+3.3V-MCU` |
| U5 | TPS54231 | Buck → rail **`V-SIM` ~3.8 V** cho modem |
| U6 | ESP32-S3 | MCU |
| U7 | **DS3231M** | RTC |
| U8 | **W25Q128** | SPI flash (datasheet W25Q128JV trong hardware-specs) |
| U9 | **SIM7600CE-T** (board thật) | Modem LTE+GNSS. Netlist EasyEDA ghi `SIM7600E` / footprint `XCVR_SIM7600E` — **lệch nhãn**; bài viết và hình dùng **SIM7600CE-T**. Datasheet: `sim7600ce-hardware-design-v1.04.pdf` |
| U10 | **LIS3DSH** | IMU (không LIS3DH) |
| B1 | **18650-1C** | Pin dự phòng |
| J8 | MicroSIM socket | |

OBD ngoài board: **vgate iCar Pro** (BLE). Không có LM393 / LVD comparator trên netlist.

---

## B. Checklist fix khác

| # | Vấn đề | Hiện trạng | Việc cần làm |
|---|---|---|---|
| 1 | Per-device ACL trên EMQX | Chỉ có trong docs; `emqx.conf` deny-by-default + password | Đưa ACL per-device vào repo / verify device A↛B |
| 2 | Hexagonal layering | Naming + ports thật; CMake có leak domain→adapter | Sửa REQUIRES hoặc không claim “enforced hexagonal” |
| 3 | k6 load test | Không có script k6 trong repo | Thêm k6 hoặc ghi simulator nội bộ |
| 4 | Reconciler xuyên store | Không có | Thêm job hoặc future work |
| 5 | Offline recovery định lượng | Chỉ reconnect timing định tính | Chạy chiến dịch VI-C (1–60 phút) |
| 6 | Firmware unit test | Không có test tree | Chỉ nói HIL+field, hoặc bổ sung host tests |
| 7 | Pin dự phòng đo thật | Chưa đo cell production | Đo hoặc không đưa số runtime vào Results |
| 8 | LVD / CHARGER GPIO firmware | Không có trên netlist/`pin_map.h` | Không claim LVD LM393; ADC sense thôi |
| 8c | Modem DTR | `PIN_MODEM_DTR=GPIO_NUM_NC` | Warm-parked = giữ nguồn modem, không claim DTR handshake |
| 8d | Index datasheet charger | Index ghi TP4056; netlist U3=TP5100 | Cập nhật `hardware-specs-index.md` + file datasheet TP5100 |
| 8e | Tên modem netlist vs board | Board/thực tế = **SIM7600CE-T**; netlist + Fig.4-5 ghi SIM7600E | Bài viết **SIM7600CE-T**; sửa nhãn netlist/Fig.4-5 khi tiện |
| 9 | Cloud `timestamp_trusted` | Bridge validate optional, ít tiêu thụ | Badge/filter UI nếu muốn claim E2E |
| 10 | Command retry/timeout | Không có sweeper | Thêm hoặc ghi hạn chế |
| 11 | Auto-trip end stats | Ignition OFF không gọi endTripWithStats | Fix hoặc không claim stats auto-trip |
| 12 | Email/push | Flag only | Chỉ claim in-app notification |
| 13 | Drift docs ngoài hardware-specs | Altium/manifest/thesis lẫn TP4056, CE-T, LIS3DH, 21700, 4V… | Mọi tên linh kiện bài báo = bảng mục A |
| 14 | Firmware CI | Không có trong `.github/workflows` | Không claim CI firmware |
| 15 | Results yếu | Số luận văn thiếu artifact | Chạy lại VI P0 theo đề cương |
| 16 | AT-bus contention chưa đo | Trụ #2 chưa có số | Bench VI-B |
| 17 | Trusted-time chưa đo E2E | Cờ có firmware | Chạy VI-E |
