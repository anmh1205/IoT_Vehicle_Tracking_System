idf_component_register(
    SRCS "src/app.c" "src/app_os.c" "src/boot/app_init.c" "src/app_state.c"
         "src/publish/publisher.c" "src/publish/messages.c" "src/publish/replay.c"
         "src/publish/outbox.c" "src/publish/outbox_calc.c"
         "src/runtime/app_clock.c" "src/app_cmd.c"
         "src/fw_update/fw_update.c" "src/fw_update/fw_update_boot.c" "src/app_sleep.c" "src/app_rtc_ctx.c" "src/app_diag.c" "src/session/session_tracker.c" "src/alarm/motion_alarm.c" "src/link/app_link.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    PRIV_REQUIRES ivts-core board storage modem obd ota platform esp_system heap freertos
)
