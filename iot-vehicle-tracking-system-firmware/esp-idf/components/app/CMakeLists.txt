idf_component_register(
    SRCS
        "src/app.c"
        # Boot composition and policy
        "src/boot/app_boot.c" "src/boot/app_wiring.c" "src/boot/app_config.c"
        # App task, queue and event dispatch
        "src/runtime/app_task.c" "src/runtime/app_dispatch.c"
        "src/runtime/fsm_actions.c" "src/app_clock.c" "src/persist/msg_seq.c"
        # Device and telemetry
        "src/device/app_device.c" "src/device/app_link.c"
        "src/telemetry.c"
        # Power and persistence
        "src/sleep_controller.c" "src/device/gnss_arbiter.c" "src/led_pattern.c"
        "src/persist/rtc_context.c" "src/persist/app_records.c"
        # Publishing, session and alarms
        "src/publish/publisher.c" "src/publish/messages.c" "src/publish/replay.c"
        "src/publish/outbox.c"
        "src/session_tracker.c" "src/motion_alarm.c"
        # Commands and firmware updates
        "src/command/cmd_inbox.c" "src/command/cmd_table.c" "src/command/cmd_config.c"
        "src/command/cmd_ota.c" "src/command/cmd_location.c" "src/command/cmd_session.c"
        "src/command/cmd_restart.c" "src/command/cmd_receipts.c"
        "src/fw_update.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    PRIV_REQUIRES ivts-core board storage modem obd ota platform esp_system heap freertos
)
