# Hardware Specs Index

## 1) Scope

Index này chuẩn hóa bộ artifact phần cứng trong `hardware-specs/` để phục vụ tra cứu và lập trình firmware.

- Chuẩn metadata: `path`, `size_bytes`, `pages`, `sha256`, `source_class`, `trust_level`.
- `trust_level`:
  - `A`: tài liệu hãng (vendor primary) hoặc đã đối chiếu rõ.
  - `B`: mirror/distributor/community copy, dùng được nhưng cần đối chiếu khi release.

## 2) Board-level artifacts

| artifact | path | size_bytes | pages | sha256 | source_class | trust_level |
|---|---|---:|---:|---|---|---|
| Main board schematic PDF | `hardware-specs/iot-vehicle-tracking-system-main.pdf` | 2333497 | 7 | `4ff2885e52e324b855d5e04cd0741d131df64217f0321f876dba89dfdb6c9ec1` | project-export | A |
| Netlist (EasyEDA export) | `hardware-specs/iot-vehicle-tracking-system-main-netlist.NET` | 16589 | n/a | `b5ca3cc0f7e52275fa2a031896b8037bc8dbed024c3e6853ac2ab6b3d126754a` | project-export | A |

## 3) Component datasheets

| component | artifact | path | size_bytes | pages | sha256 | source_class | trust_level |
|---|---|---|---:|---:|---|---|---|
| MCU | ESP32-S3 Datasheet | `hardware-specs/components/mcu/esp32-s3-datasheet-en.pdf` | 1108481 | 87 | `7904070a6a95ddbdfcf2a39d63ccadbc9e2945ea354f9d949340571553ed3ecb` | vendor | A |
| MCU | ESP32-S3 TRM | `hardware-specs/components/mcu/esp32-s3-technical-reference-manual-en.pdf` | 15215232 | 1531 | `4484bf8a69035ec42a731c58c64ada6fbd1f1618c5559409f134d9ea083f444f` | vendor | A |
| Modem | SIM7600 Series AT Manual v2.00 | `hardware-specs/components/modem/sim7600-series-at-command-manual-v2.00.pdf` | 2851632 | 460 | `c34dfedaa695607743f420c498267ae45c77ed49817ef18d6384c9ecee4946d9` | vendor | A |
| Modem | SIMCom SIM7600 Series Hardware Design | `hardware-specs/components/modem/simcom-sim7600-series-hardware-design.pdf` | 4194160 | 74 | `a350542058087f383f4501c2a715d5becadede488efe5bff19416fad83028473` | vendor | A |
| Modem | SIM7600CE Hardware Design v1.04 | `hardware-specs/components/modem/sim7600ce-hardware-design-v1.04.pdf` | 2707670 | 68 | `8991e05907bb29ad9af06aa10ea418b0ffa4caee27b64835dc83be8504e88edb` | vendor | A |
| IMU | LIS3DSH Datasheet | `hardware-specs/components/imu/lis3dsh-datasheet.pdf` | 956301 | 58 | `d175331969297dd816760863fb75a1677166fe5799a8d1147d85b764a07dadd9` | vendor | A |
| Flash | W25Q128JV Datasheet | `hardware-specs/components/flash/w25q128jv-datasheet.pdf` | 2462647 | 78 | `809f066e62bcde10b12c2202daf05f4776929ad7dc5f9d3b5131cdcc84502bc1` | vendor/distributor | A |
| RTC | DS3231M Datasheet | `hardware-specs/components/rtc/ds3231m-datasheet.pdf` | 912296 | 20 | `dcc1cd00b353b9f3cb6dc054a0ddf3eadea31c064f322b49b0ac4af08ef65fea` | vendor | A |
| Power | MP2482 Datasheet | `hardware-specs/components/power/mp2482-datasheet.pdf` | 412530 | 14 | `a416fc340de0f63aa1f6e7b520c677aa9d280ade10f85fb8f493dced1869f29d` | vendor | A |
| Power | TPS54231 Datasheet | `hardware-specs/components/power/tps54231-datasheet.pdf` | 1035367 | 35 | `352abd5a57c15364dded8ce1ac29f573642cc1c4e8246b04298703be482b73d3` | vendor | A |
| Power | TP4056 Datasheet (Top Power) | `hardware-specs/components/power/tp4056-datasheet-top-power.pdf` | 738034 | 15 | `de2a2f802eb7e0e5070273c79dfd33f67ac028c49cb74971d566b70e753a4858` | vendor | A |
| Power | AP2112 Datasheet | `hardware-specs/components/power/ap2112-datasheet.pdf` | 755270 | 18 | `ef8d376f2ec356e29172eb9e053819a0ebdcc576dba7fc9ab0505c568427920f` | vendor | A |
| Power | SX1308 Datasheet (Suosemi/JLC copy) | `hardware-specs/components/power/sx1308-datasheet-suosemi-jlc.pdf` | 864144 | 7 | `0a0d971df83cdc8cf72b94fee98b5b0d016415978c41f21f429102ae96372fd3` | distributor/community-mirror | B |

## 4) Quality gates used

- File integrity: SHA-256 recorded.
- PDF sanity: page count extracted.
- Naming: kebab-case, grouped by component.

## 5) Notes for maintainers

- Khi thay đổi bất kỳ PDF/NET nào, cập nhật lại hàng tương ứng (size, pages, sha256).
- Artifact `SX1308` hiện có nguồn distributor/community; nếu có thể nên thay bằng bản vendor-primary trong lần cập nhật sau.

## 6) Unresolved questions

- Không tìm thấy file rời trong `hardware-specs/schematics/` ở thời điểm lập index (ví dụ `main-schematic.pdf`, `power.pdf`). Hiện board-level schematic đang dùng `hardware-specs/iot-vehicle-tracking-system-main.pdf`.
