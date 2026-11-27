idf_component_register(
    SRCS
        "src/obd_task.c"
        # NimBLE host and callbacks
        "src/obd_ble.c"
        # ELM327 session, discovery and polling
        "src/obd_session.c"
        "src/obd_poll.c"
        "src/obd_elm327.c" "src/obd_pid.c"
    INCLUDE_DIRS "include"
    PRIV_INCLUDE_DIRS "src"
    REQUIRES ivts-core
    PRIV_REQUIRES bt platform
)
