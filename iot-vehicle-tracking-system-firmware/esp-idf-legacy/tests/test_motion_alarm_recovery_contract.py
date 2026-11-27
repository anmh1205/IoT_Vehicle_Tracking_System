from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
read = lambda rel: (ROOT / rel).read_text(encoding="utf-8")

CORE = read("components/app-core/src/state_machine_core.c")
PIPE = read("components/app-core/src/state_publish_pipeline.c")
NVS = read("components/adapter-kv-nvs/src/nvs_config.c")
SLEEP = read("components/app-core/src/state_sleep_controller.c")


def test_alarm_outcome_is_observable_and_first_occurrence_is_staged_once():
    header = read("components/app-core/include/state_publish_pipeline.h")
    assert "bool state_machine_publish_event(" in header
    block = CORE.split("static app_state_t state_machine_handle_alarm_state(void)", 1)[1].split(
        "static app_state_t state_machine_handle_heartbeat_state(void)", 1
    )[0]
    assert "state_machine_stage_motion_alarm()" in block
    assert 'state_machine_publish_event("warning", 1001' not in block
    assert "s_alarm_enter_ms = 0;" in block


def test_retry_preserves_message_identity_and_original_timestamp():
    stage = PIPE.split("void state_machine_stage_motion_alarm(void)", 1)[1]
    retry = PIPE.split("void state_machine_retry_pending_motion_alarm(void)", 1)[1].split(
        "void state_machine_stage_motion_alarm(void)", 1
    )[0]
    assert "state_machine_fill_message_id" in stage
    assert "state_machine_next_seq_no" in stage
    assert "state_machine_fill_message_id" not in retry
    assert "s_motion_alarm_checkpoint.message_id" in retry
    assert "s_motion_alarm_checkpoint.timestamp_ms" in retry
    assert "TRACKER_MOTION_ALARM_RETRY_MS" in retry
    assert "offline_queue_enqueue(OFFLINE_RECORD_EVENT" in retry


def test_persist_before_delivery_and_clear_only_after_acceptance():
    retry = PIPE.split("void state_machine_retry_pending_motion_alarm(void)", 1)[1].split(
        "void state_machine_stage_motion_alarm(void)", 1
    )[0]
    assert retry.index("nvs_config_save_motion_alarm(") < retry.index("tracker_mqtt_publish_event(")
    assert retry.index("s_motion_alarm_delivery_accepted = true") < retry.index(
        "nvs_config_clear_motion_alarm()"
    )
    assert "if (!s_motion_alarm_delivery_accepted)" in retry
    assert "s_motion_alarm_pending = false;" in retry


def test_reboot_restore_and_deep_sleep_protection():
    init = CORE.split("esp_err_t state_machine_core_init(", 1)[1]
    loop = CORE.split("app_state_t state_machine_core_run(", 1)[1]
    assert "state_machine_restore_pending_motion_alarm()" in init
    assert "state_machine_retry_pending_motion_alarm()" in loop
    assert "state_machine_has_pending_motion_alarm()" in SLEEP
    assert "state_machine_resolve_sleep_mode(APP_STATE_SLEEP) == TRACKER_SLEEP_MODE_DEEP" in SLEEP


def test_motion_alarm_flash_checkpoint_is_strictly_versioned_and_no_auth_token_copy():
    keys = read("components/adapter-kv-nvs/include/nvs_store_keys.h")
    header = read("components/adapter-kv-nvs/include/nvs_config.h")
    assert "motion_evt_v1" in keys
    assert "timestamp_ms" in header and "message_id[37]" in header
    assert "auth_token" not in header.split("tracker_motion_alarm_checkpoint_t", 1)[0].split(
        "/** Versioned identity of one unsent motion warning", 1
    )[-1]
    assert "checkpoint->magic != TRACKER_MOTION_ALARM_MAGIC" in NVS
    assert "size != sizeof(*out)" in NVS
    assert "nvs_commit(handle)" in NVS
    assert "memchr(out->message_id" in NVS
