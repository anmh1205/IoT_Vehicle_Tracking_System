idf_component_register(
    SRCS
        "src/obd.c" "src/obd_task.c"
        # NimBLE host and callbacks
        "src/ble/obd_ble.c" "src/ble/obd_ble_gap.c" "src/ble/obd_ble_gatt.c"
        # ELM327 session, discovery and polling
        "src/session/obd_session.c" "src/session/obd_discovery.c"
        "src/poll/obd_poll.c" "src/poll/obd_diag.c"
        "src/elm/elm327.c" "src/elm/obd_pid.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES bt platform
)
