idf_component_register(
    SRCS "src/ota_task.c" "src/ota_job.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES app_update esp_app_format esp_partition mbedtls platform
)
