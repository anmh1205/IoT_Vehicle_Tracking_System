idf_component_register(
    SRCS "src/platform.c" "src/platform_rtos.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core esp_common
    PRIV_REQUIRES esp_timer esp_system log freertos
)
