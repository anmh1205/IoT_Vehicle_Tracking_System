idf_component_register(
    SRCS
        # App entry point
        "src/app.c"
        # Boot composition and policy
        "src/boot/app_boot.c" "src/boot/app_wiring.c" "src/boot/app_config.c"
        # App task, queue and event dispatch
        "src/runtime/app_task.c" "src/runtime/app_dispatch.c"
        "src/runtime/fsm_actions.c"
        # Session tracking, telemetry and parked motion alarms
        "src/session/session_tracker.c" "src/session/telemetry.c" "src/session/motion_alarm.c"
        # Firmware update orchestration
        "src/fw/fw_update.c"
        # Sleep coordination and status LED patterns
        "src/power/sleep_controller.c" "src/power/led_pattern.c"
        # Cloud commands and durable receipts
        "src/command/cmd_inbox.c" "src/command/cmd_config.c"
        "src/command/cmd_ota.c" "src/command/cmd_session.c"
        "src/command/cmd_restart.c" "src/command/cmd_receipts.c"
        # Publishing, acknowledgment routing and replay
        "src/publish/publisher.c" "src/publish/messages.c" "src/publish/replay.c"
        "src/publish/outbox.c"
        # Persistent records, RTC context and message sequence
        "src/persist/rtc_context.c" "src/persist/app_records.c" "src/persist/msg_seq.c"
        # Device policy, link and GNSS state, and clock access
        "src/device/app_device.c" "src/device/app_link.c"
        "src/device/gnss_arbiter.c" "src/device/app_clock.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    PRIV_REQUIRES ivts-core board storage modem obd ota platform esp_system heap freertos
)
