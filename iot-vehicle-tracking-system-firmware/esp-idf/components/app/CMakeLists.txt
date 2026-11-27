idf_component_register(
    SRCS "src/app.c" "src/app_os.c" "src/app_init.c" "src/app_state.c" "src/app_publish.c"
         "src/app_cmd.c" "src/app_sleep.c" "src/app_rtc_ctx.c" "src/app_diag.c" "src/app_session.c"
    INCLUDE_DIRS "include"
    PRIV_REQUIRES ivts-core board storage modem obd ota esp_timer esp_system heap freertos
)
