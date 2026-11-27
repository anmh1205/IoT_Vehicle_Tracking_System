idf_component_register(
    SRCS
        "src/storage.c" "src/storage_task.c"
        # NVS records and SD log
        "src/nvs/nvs_store.c" "src/sd/sd_mount.c" "src/sd/sd_log.c"
        # Offline queue and on-disk format
        "src/queue/queue.c" "src/queue/queue_open.c" "src/queue/queue_segments.c"
        "src/queue/queue_frame.c" "src/queue/queue_cursor.c" "src/queue/queue_peek_slot.c"
        "src/queue/queue_push.c" "src/queue/queue_peek.c" "src/queue/queue_pop.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES nvs_flash fatfs sdmmc esp_driver_sdmmc vfs platform
)
