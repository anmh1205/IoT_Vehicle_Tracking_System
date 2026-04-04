# Research Report: ESP-IDF SD Logging Reliability for ESP32-S3

Timestamp: 2026-04-04 17:38 Asia/Saigon

## Findings

### 1) Mount / unmount flow
- `esp_vfs_fat_sdmmc_mount()` is the correct all-in-one helper for SDMMC: init host, init card, mount FAT, register VFS.
- Unmount with `esp_vfs_fat_sdcard_unmount()`; close open files first.
- For real firmware, treat mount as a guarded state machine, not a one-shot call: probe, mount, verify, then expose logging.

### 2) Power-loss resilience with per-record fsync
- `CONFIG_FATFS_IMMEDIATE_FSYNC` forces `f_sync()` after each write-like op.
- This improves consistency and size reporting, but costs throughput.
- FATFS is still described by Espressif as having low resilience to sudden power-off.
- Default dual FAT tables reduce damage; `use_one_fat` saves space but lowers reliability.
- Conclusion: per-record fsync reduces loss window, but does not make FATFS power-fail safe.

### 3) Rotation / GC policy under quota
- Embedded-friendly pattern: fixed quota, append-only active file, rotate by size/time, delete oldest first.
- Keep enough slack space for FAT wear leveling; tiny partitions hurt reliability.
- Prefer few files, predictable names, and deterministic FIFO garbage collection.
- Do not depend on complex directory trees; keep metadata simple.

### 4) Card-detect / hot-plug patterns
- SDMMC host supports CD/WP mapped to arbitrary GPIOs via GPIO matrix.
- Set `cd` / `wp` in `sdmmc_slot_config_t` before `sdmmc_host_init_slot()`.
- Card-detect is possible, but docs do not give a full safe hot-plug workflow.
- Practical pattern: only write when card is present and mounted; on removal, stop logging, close files, unmount, then wait for reinsert.

### 5) SD-CLK pull-up risk
- Espressif docs require external pull-ups on CMD and DAT0-DAT3; 10 kΩ is called out.
- Docs do not require a CLK pull-up.
- Risk is mostly on CMD/DAT wiring and board-specific pin conflicts, not CLK pull-up.
- For 4-bit native SDMMC, validate board routing and ESP32-S3 pin map early.

## Recommendation
- Use SDMMC 4-bit native with external pull-ups on CMD/DAT0-DAT3.
- Enable per-record fsync, but still design for partial log loss after power cut.
- Use a dedicated logging partition with headroom, size quota, and FIFO rotation.
- Implement a strict mount state machine keyed off card-detect and ignition state.
- Keep logging append-only; never rewrite active records in place.

## Trade-offs
- Reliability vs speed: per-record fsync is safer but slower.
- Space vs robustness: one FAT copy saves space but raises corruption risk.
- Simplicity vs recovery: append-only FIFO is simpler than index-heavy schemes and easier to recover.
- Hot-plug vs determinism: CD helps safety, but removal handling must still be explicit in firmware.

## References
- [FATFS support](https://docs.espressif.com/projects/esp-idf/en/latest/api-reference/storage/fatfs.html)
- [File system considerations](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/file-system-considerations.html)
- [SDMMC host driver](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/sdmmc_host.html)
- [SD pull-up requirements](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/peripherals/sd_pullup_requirements.html)

## Unresolved Questions
- What exact GPIO mapping is used on the target ESP32-S3 PCB for SDMMC 4-bit lines?
- Is card-detect wired and debounced in hardware, or must firmware debounce it?
- What log quota fits the ignition-only session length and expected record rate?
