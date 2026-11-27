idf_component_register(
    SRCS
        "src/storage_task.c"
        # NVS records and SD log
        "src/nvs_store.c" "src/sd/sd_mount.c" "src/sd/sd_log.c"
        # Offline queue and on-disk format
        "src/queue/queue_store.c"
        "src/queue/queue_rw.c" "src/queue/queue_peek.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES nvs_flash fatfs sdmmc esp_driver_sdmmc vfs platform
)
