# 01 — Thiết lập môi trường ESP-IDF

> 🎯 Mục tiêu: có một project ESP-IDF trống nhưng đúng cấu trúc, `app_main()` chạy và in log, sẵn sàng gắn các component ở bước sau.

## 1. Cài ESP-IDF

Dự án dùng ESP-IDF (target **esp32s3**). Cài theo hướng dẫn chính thức Espressif. Sau khi cài, mỗi lần mở terminal cần "export" môi trường:

```powershell
# Windows (PowerShell), giả sử cài ở C:\Espressif
. $HOME\esp\esp-idf\export.ps1
```

Kiểm tra:

```powershell
idf.py --version
```

## 2. Cấu trúc thư mục tối thiểu

ESP-IDF project chuẩn:

```
my-firmware/
├── CMakeLists.txt          # project-level
├── sdkconfig.defaults      # config mặc định (target, partition…)
├── partitions.csv          # bảng phân vùng (cần cho OTA sau này)
└── main/
    ├── CMakeLists.txt       # component-level cho main
    └── main.c
```

## 3. CMakeLists.txt cấp project

Đây là file gốc. Nó nạp hệ thống build của ESP-IDF rồi khai báo tên project.

🧩 `CMakeLists.txt`

```cmake
cmake_minimum_required(VERSION 3.16)

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(Tracking_Firmware)
```

> 💡 `project.cmake` tự quét thư mục `components/` và `main/`, tự build mọi component nó tìm thấy. Bạn **không** cần liệt kê từng component ở đây.

## 4. main component

🧩 `main/CMakeLists.txt`

```cmake
idf_component_register(
    SRCS "main.c"
    INCLUDE_DIRS "."
)
```

🧩 `main/main.c` (phiên bản khởi đầu)

```c
#include "esp_log.h"

static const char *TAG = "TRACKER_MAIN";

void app_main(void) {
    ESP_LOGI(TAG, "Firmware boot OK");
}
```

> 💡 `app_main()` là entry point ESP-IDF gọi sau khi khởi động xong FreeRTOS. Nó chạy trong một task riêng. **Không** được để nó `return` rồi kết thúc ở firmware thật — sau này nó sẽ chạy vòng lặp FSM vô hạn. Bản codebase thật chỉ có đúng 1 dòng: `app_core_bootstrap_run();`.

## 5. sdkconfig.defaults

File này khóa các lựa chọn quan trọng để mọi người build giống nhau. Tối thiểu:

🧩 `sdkconfig.defaults`

```ini
CONFIG_IDF_TARGET="esp32s3"
CONFIG_PARTITION_TABLE_CUSTOM=y
CONFIG_PARTITION_TABLE_CUSTOM_FILENAME="partitions.csv"
CONFIG_ESP_MAIN_TASK_STACK_SIZE=8192
```

> 💡 Stack của `app_main` task mặc định nhỏ. FSM + JSON + TLS sẽ cần nhiều stack hơn, nên nâng sớm để tránh stack overflow khó debug.

## 6. partitions.csv

OTA cần ít nhất 2 app slot (`ota_0`, `ota_1`) + `otadata`. Ví dụ tối thiểu:

🧩 `partitions.csv` (theo đúng dự án — `factory` + 2 slot OTA)

```csv
# Name,   Type, SubType,  Offset,   Size,  Flags
nvs,      data, nvs,      0x9000,   0x6000,
otadata,  data, ota,      0xf000,   0x2000,
phy_init, data, phy,      0x11000,  0x1000,
factory,  app,  factory,  0x20000,  1536K,
ota_0,    app,  ota_0,    ,         1536K,
ota_1,    app,  ota_1,    ,         1536K,
```

> 💡 `factory` chứa ảnh gốc; `ota_0`/`ota_1` luân phiên cho cập nhật OTA mà vẫn giữ bản cũ để rollback nếu bản mới lỗi (xem bước 13). `otadata` lưu slot nào đang active. Bộ này chưa có phân vùng FAT riêng cho SD vì dữ liệu offline ghi ra **thẻ SD ngoài** qua SDMMC (bước 09), không phải flash nội.

## 7. 🔧 Build & kiểm tra

```powershell
idf.py set-target esp32s3
idf.py build
```

Nạp + xem log (đổi COM cho đúng máy bạn):

```powershell
idf.py -p COM5 flash monitor
```

Kỳ vọng thấy:

```
I (xxx) TRACKER_MAIN: Firmware boot OK
```

Thoát monitor: `Ctrl+]`.

## 8. Tạo sẵn thư mục components

Tạo thư mục rỗng cho lộ trình:

```powershell
mkdir components
```

Từ bước sau, mỗi component nằm trong `components/<ten-component>/` với `CMakeLists.txt`, `include/`, `src/` riêng.

## ⚠️ Bẫy thường gặp

- **Quên `set-target esp32s3`:** build ra target mặc định (esp32) → lỗi pin/peripheral sau này.
- **Sửa `sdkconfig` tay rồi mất:** chỉnh trong `sdkconfig.defaults` (commit được) thay vì `sdkconfig` (sinh tự động).
- **`app_main` return sớm:** ở firmware học tập thì OK, nhưng nhớ rằng bản thật chạy vòng lặp vô hạn.

## ➡️ Tiếp theo

[02 — shared-kernel: models và config](./02-shared-kernel-models-va-config.md)
