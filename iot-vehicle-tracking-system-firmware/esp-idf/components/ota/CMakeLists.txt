idf_component_register(
    SRCS "src/ota.c" "src/ota_os.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES app_update esp_app_format esp_partition mbedtls esp_timer
)
