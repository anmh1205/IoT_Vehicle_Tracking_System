idf_component_register(
    SRCS "src/storage.c" "src/storage_nvs.c" "src/storage_sd.c" "src/storage_queue.c" "src/storage_os.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES nvs_flash fatfs sdmmc esp_driver_sdmmc vfs esp_timer
)
