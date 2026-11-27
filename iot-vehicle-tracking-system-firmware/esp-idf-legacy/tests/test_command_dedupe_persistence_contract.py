from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMAND_SOURCE = (
    ROOT / "components" / "domain-connectivity" / "src" / "command_handler.c"
).read_text(encoding="utf-8")
NVS_HEADER = (
    ROOT / "components" / "adapter-kv-nvs" / "include" / "nvs_config.h"
).read_text(encoding="utf-8")
NVS_SOURCE = (
    ROOT / "components" / "adapter-kv-nvs" / "src" / "nvs_config.c"
).read_text(encoding="utf-8")
NVS_KEYS = (
    ROOT / "components" / "adapter-kv-nvs" / "include" / "nvs_store_keys.h"
).read_text(encoding="utf-8")
STATE_CORE = (
    ROOT / "components" / "app-core" / "src" / "state_machine_core.c"
).read_text(encoding="utf-8")
OTA_RUNTIME = (
    ROOT / "components" / "app-core" / "src" / "state_ota_runtime.c"
).read_text(encoding="utf-8")


def test_recent_command_window_is_persisted_and_restored():
    assert "TRACKER_COMMAND_DEDUPE_CACHE_LEN 32U" in NVS_HEADER
    assert "command_dedupe_context_t" in NVS_HEADER
    assert "TRACKER_NVS_COMMAND_DEDUPE_KEY" in NVS_KEYS
    assert "nvs_config_save_command_dedupe_context" in NVS_SOURCE
    assert "nvs_config_load_command_dedupe_context" in NVS_SOURCE
    assert "nvs_commit(handle)" in NVS_SOURCE
    assert "nvs_config_load_command_dedupe_context(&persisted_dedupe" in COMMAND_SOURCE
    assert "memcpy(s_recent_command_ids" in COMMAND_SOURCE


def test_side_effects_wait_for_durable_dedupe_checkpoint():
    assert "s_recent_command_persist_pending" in COMMAND_SOURCE
    assert "command_handler_persist_recent_command_ids()" in COMMAND_SOURCE
    consume = COMMAND_SOURCE.split("command_action_t command_handler_consume_action", 1)[1]
    before_dequeue = consume.split("xQueueReceive", 1)[0]
    assert "atomic_load(&s_recent_command_persist_pending)" in before_dequeue
    assert "command_handler_persist_recent_command_ids() != ESP_OK" in before_dequeue


def test_receive_callback_only_marks_dedupe_dirty_without_nvs_io():
    process = COMMAND_SOURCE.split("esp_err_t command_handler_process", 1)[1]
    process = process.split("bool command_handler_is_tracking_enabled", 1)[0]
    assert "command_handler_remember_command_id(parsed_command_id);" in process
    assert "command_handler_persist_recent_command_ids()" not in process
    assert "reason=dedupe_persist_pending" not in process


def test_checkpoint_handles_command_bursts_by_generation():
    assert "s_recent_command_generation" in COMMAND_SOURCE
    assert "s_recent_command_persisted_generation" in COMMAND_SOURCE
    assert "portENTER_CRITICAL(&s_recent_command_mux)" in COMMAND_SOURCE
    assert "snapshot_generation != atomic_load(&s_recent_command_generation)" in COMMAND_SOURCE
    assert "command_dedupe_checkpoint_superseded" in COMMAND_SOURCE


def test_acceptance_ack_gate_precedes_dedupe_checkpoint_and_action_dequeue():
    callback = STATE_CORE.split("static void state_machine_command_callback", 1)[1]
    callback = callback.split("static void state_machine_publish_pending_command_acks", 1)[0]
    assert "command_handler_process(payload, &command_id, &deferred, &duplicate)" in callback
    assert "xQueueSendToBack(s_command_ack_queue, &ack, 0)" in callback

    executor = OTA_RUNTIME.split("void state_machine_handle_pending_action", 1)[1]
    executor = executor.split("void state_machine_try_confirm_running_firmware", 1)[0]
    ack_gate = executor.index("state_machine_has_pending_command_acks()")
    consume = executor.index("command_handler_consume_action(&command_id)")
    assert ack_gate < consume

    command_consume = COMMAND_SOURCE.split("command_action_t command_handler_consume_action", 1)[1]
    checkpoint = command_consume.index("command_handler_persist_recent_command_ids()")
    dequeue = command_consume.index("xQueueReceive")
    assert checkpoint < dequeue
