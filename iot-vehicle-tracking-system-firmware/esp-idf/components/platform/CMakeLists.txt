idf_component_register(
    SRCS "src/platform_clock.c" "src/platform_reset.c" "src/platform_err.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core esp_common
    PRIV_REQUIRES esp_timer esp_system log
)
