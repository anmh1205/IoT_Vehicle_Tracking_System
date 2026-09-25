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


def test_new_commands_backpressure_while_checkpoint_is_volatile():
    process = COMMAND_SOURCE.split("esp_err_t command_handler_process", 1)[1]
    assert "reason=dedupe_persist_pending" in process
    assert "return ESP_ERR_TIMEOUT;" in process
