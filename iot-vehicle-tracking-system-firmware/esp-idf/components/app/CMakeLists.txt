idf_component_register(
    SRCS "src/app.c" "src/app_os.c" "src/boot/app_init.c" "src/app_state.c" "src/app_publish.c"
         "src/runtime/app_clock.c" "src/app_cmd.c" "src/app_sleep.c" "src/app_rtc_ctx.c" "src/app_diag.c" "src/app_session.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    PRIV_REQUIRES ivts-core board storage modem obd ota platform esp_system heap freertos
)
