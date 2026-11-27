idf_component_register(
    SRCS
        # Storage initialization and task
        "src/storage_task.c"
        # NVS records
        "src/nvs/nvs_store.c"
        # Offline queue and on-disk format
        "src/queue/queue_store.c"
        "src/queue/queue_rw.c" "src/queue/queue_peek.c"
        # SD mount and log
        "src/sd/sd_mount.c" "src/sd/sd_log.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES nvs_flash fatfs sdmmc esp_driver_sdmmc vfs platform
)
