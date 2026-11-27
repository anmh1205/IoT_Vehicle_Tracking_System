idf_component_register(
    SRCS
        # Base types and model codecs
        "src/base/err.c"
        "src/base/str.c"
        "src/base/backoff.c"
        "src/base/crc32.c"
        "src/base/civil.c"
        "src/model_config.c"
        "src/model_record.c"
        "src/event.c"
        # JSON and MQTT payloads
        "src/payload/json_writer.c"
        "src/payload/json_tokenizer.c"
        "src/payload/json_reader.c"
        "src/payload/json_fields.c"
        "src/payload/payload_common.c"
        "src/payload/payload_raw.c"
        "src/payload/payload_control.c"
        # FSM and OTA contracts
        "src/fsm/axes.c"
        "src/fsm/fsm.c"
        "src/fsm/fsm_states.c"
        "src/ota_contract.c"
    INCLUDE_DIRS
        "include"
    PRIV_INCLUDE_DIRS "src"
)
