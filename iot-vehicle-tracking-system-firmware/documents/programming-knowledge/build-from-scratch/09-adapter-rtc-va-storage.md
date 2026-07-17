# 09 — Adapter RTC (DS3231M) và Storage offline queue

> 🎯 Mục tiêu: xây hạ tầng lưu trữ — **RTC DS3231M** (đồng hồ thật, giữ giờ khi mất điện) và **storage offline queue** (đệm telemetry khi mất mạng, replay khi có mạng lại).

Nguồn thật: `components/adapter-rtc-ds3231m/` (`rtc_ds3231m.c`), `components/adapter-storage-sdmmc-fatfs/` (`sd_log_store.c`), `components/domain-storage/` (`offline_queue.c`).

> ⚠️ **Phân tầng quan trọng:** logic hàng đợi (enqueue/replay/peek/pop) nằm ở **`domain-storage/offline_queue.c`** — logic thuần. Còn việc ghi byte xuống thẻ SD (SDMMC 4-bit + FATFS) nằm ở **adapter `sd_log_store.c`**. Domain quyết "lưu gì, replay khi nào"; adapter lo "ghi vào đâu trên thẻ".

## Phần A — RTC DS3231M

### A1. Vì sao cần RTC ngoài

ESP32-S3 mất nguồn là mất giờ. Telemetry cần timestamp **đáng tin** (`time_trusted`). DS3231M có pin nuôi riêng, giữ giờ chính xác qua deep-sleep và mất điện. Chia sẻ cùng bus I2C với IMU (SDA=GPIO2, SCL=GPIO1).

### A2. Các hàm điền `rtc_clock_port_t`

🧩 `rtc_ds3231m.c` (rút gọn)

```c
#define DS3231_ADDR 0x68

esp_err_t rtc_ds3231m_init(void) {
    // I2C bus thường đã được IMU init; chỉ probe WHO/registers
    return ds3231_probe();
}

esp_err_t rtc_ds3231m_get_time_ms(uint64_t *out_ms) {
    uint8_t reg[7];
    esp_err_t err = ds3231_read(0x00, reg, 7);   // seconds..year
    if (err != ESP_OK) return err;
    struct tm t = ds3231_bcd_to_tm(reg);         // BCD → tm
    *out_ms = (uint64_t)mktime(&t) * 1000ULL;
    return ESP_OK;
}

esp_err_t rtc_ds3231m_set_time_ms(uint64_t ms) {
    struct tm t; time_t s = ms / 1000; gmtime_r(&s, &t);
    uint8_t reg[7]; ds3231_tm_to_bcd(&t, reg);
    return ds3231_write(0x00, reg, 7);
}

esp_err_t rtc_ds3231m_get_health(bool *available, bool *time_valid) {
    *available = ds3231_probe() == ESP_OK;
    // bit OSF (Oscillator Stop Flag) trong status reg = giờ KHÔNG tin được
    *time_valid = *available && !ds3231_oscillator_stopped();
    return ESP_OK;
}
```

> 💡 **OSF flag là điểm mấu chốt.** Nếu pin RTC từng hết, oscillator dừng → giờ rác. `get_health` đọc OSF để báo `time_valid=false`, FSM sẽ đánh dấu telemetry là `time_trusted=false` và xin sync giờ từ cloud/GNSS.

### A3. DS3231M lưu giờ dạng BCD

Register dùng **BCD** (Binary-Coded Decimal): `0x59` nghĩa là 59 thập phân, không phải 0x59=89. Phải convert. Xem `07_rtc/ds3231m_register_reference.md`.

## Phần B — Storage offline queue

### B1. Bài toán

Mất sóng LTE giữa đường → không vứt telemetry. Phải lưu xuống SD card, khi có mạng lại thì gửi lần lượt (replay).

### B2. Các hàm điền `storage_queue_port_t` (ở `domain-storage/offline_queue.c`)

🧩 `offline_queue.c` (khái niệm)

```c
esp_err_t offline_queue_init(void);  // mount SD (SDMMC 4-bit + FATFS), mở index

esp_err_t offline_queue_enqueue(offline_record_type_t type, const char *payload,
                                bool gps_fix, bool net_up, bool time_trusted,
                                uint64_t timestamp_ms) {
    // ghi 1 record (kèm metadata) vào file vòng (ring) trên SD
    return store_append_record(...);
}

void offline_queue_replay_tick(void) {
    if (!tracker_mqtt_is_connected()) return;          // chỉ replay khi có mạng
    for (int i = 0; i < REPLAY_BATCH; i++) {           // gửi từng nhúm nhỏ
        record_t rec;
        if (store_peek_oldest(&rec) != ESP_OK) break;
        if (tracker_mqtt_publish(rec.topic, rec.payload, 1) == ESP_OK)
            store_pop_oldest();                        // gửi xong mới xóa
        else break;                                    // lỗi → để lần sau
    }
}
```

> 💡 **Peek rồi mới pop.** Gửi MQTT thành công mới xóa record. Nếu xóa trước khi xác nhận gửi mà mạng rớt giữa chừng → mất dữ liệu. Đây là pattern at-least-once.

> 💡 **Replay theo batch nhỏ.** Đừng drain cả nghìn record một lúc — chiếm modem, đói watchdog. Mỗi `replay_tick` chỉ gửi vài gói, FSM gọi lại đều đặn.

### B3. Vì sao metadata theo record

`gps_fix, net_up, time_trusted` lưu kèm vì khi replay (có thể vài giờ sau), context đã khác. Backend cần biết "lúc bắt được điểm này, giờ có đáng tin không, có fix GPS không".

### B4. CMakeLists (thật)

```cmake
# adapter-rtc-ds3231m
idf_component_register(SRCS "src/rtc_ds3231m.c" INCLUDE_DIRS "include"
    REQUIRES driver log platform-board-esp32s3 shared-kernel)

# adapter-storage-sdmmc-fatfs — ghi byte xuống thẻ
idf_component_register(SRCS "src/sd_log_store.c" INCLUDE_DIRS "include"
    REQUIRES domain-telemetry driver fatfs log platform-board-esp32s3 sdmmc shared-kernel vfs)

# domain-storage — logic hàng đợi offline
idf_component_register(SRCS "src/offline_queue.c" INCLUDE_DIRS "include"
    REQUIRES adapter-mqtt-sim7600-at adapter-storage-sdmmc-fatfs domain-telemetry log shared-kernel)
```

> 💡 `offline_queue` (domain) `REQUIRES` cả `adapter-mqtt` và `adapter-storage`: nó điều phối "đọc từ SD → publish qua MQTT". Đây là domain "dày" (orchestration), khác với domain thuần logic như `domain-obd`.

## 🔧 Build & kiểm tra

- RTC: `set_time_ms` một giờ biết trước, deep-sleep 10s, `get_time_ms` lại — phải nhích đúng ~10s.
- Queue: ngắt mạng, enqueue 5 record, bật mạng, gọi `replay_tick` vài lần — đủ 5 gói tới broker.

## ⚠️ Bẫy thường gặp

- **Quên check OSF:** tin giờ rác sau khi RTC mất pin → timestamp sai lệch hàng năm.
- **SDMMC 4-bit trên ESP32-S3:** cần pull-up đúng và đôi khi phải hạ tốc; xem `06_storage/sdmmc_esp32s3_pitfalls.md`.
- **Replay vô hạn khi publish luôn fail:** thêm điều kiện dừng (mqtt connected) và batch cap.
- **Ghi SD trong lúc deep-sleep sắp tới:** flush/close file trước khi ngủ, nếu không file index hỏng.

## ➡️ Tiếp theo

[10 — Domain telemetry và fusion ignition/motion](./10-domain-telemetry-va-fusion.md)
