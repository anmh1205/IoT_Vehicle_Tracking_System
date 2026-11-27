idf_component_register(
    SRCS
        # Base utilities
        "src/base/str.c"
        "src/base/backoff.c"
        "src/base/crc32.c"
        "src/base/civil.c"
        # Cross-task events
        "src/event/event.c"
        # Configuration, record and status models
        "src/model/config.c"
        "src/model/record.c"
        "src/model/status.c"
        # JSON and MQTT payloads
        "src/payload/json_writer.c"
        "src/payload/json_reader.c"
        "src/payload/json_fields.c"
        "src/payload/payload_common.c"
        "src/payload/payload_raw.c"
        "src/payload/payload_control.c"
        # State machines
        "src/fsm/axes.c"
        "src/fsm/fsm.c"
        "src/fsm/fsm_states.c"
        # OTA manifest and confirmation contracts
        "src/ota/contract.c"
    INCLUDE_DIRS
        "include"
    PRIV_INCLUDE_DIRS "src"
)
