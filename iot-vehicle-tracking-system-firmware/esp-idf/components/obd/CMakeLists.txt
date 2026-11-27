idf_component_register(
    SRCS "src/obd.c" "src/elm327.c" "src/obd_pid.c" "src/obd_ble.c" "src/obd_os.c"
    INCLUDE_DIRS "include"
    REQUIRES ivts-core
    PRIV_REQUIRES bt esp_timer
)
