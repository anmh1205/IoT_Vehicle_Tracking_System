from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMAND = (
    ROOT / "components" / "domain-connectivity" / "src" / "command_handler.c"
).read_text(encoding="utf-8")
NVS = (
    ROOT / "components" / "adapter-kv-nvs" / "src" / "nvs_config.c"
).read_text(encoding="utf-8")
HEADER = (
    ROOT / "components" / "adapter-kv-nvs" / "include" / "nvs_config.h"
).read_text(encoding="utf-8")
KEYS = (
    ROOT / "components" / "adapter-kv-nvs" / "include" / "nvs_store_keys.h"
).read_text(encoding="utf-8")


def test_recent_command_window_is_persisted_and_restored():
    assert "TRACKER_COMMAND_DEDUPE_CACHE_LEN 32U" in HEADER
    assert 'TRACKER_NVS_COMMAND_DEDUPE_KEY "cmd_dedupe_v1"' in KEYS
    assert "nvs_config_load_command_dedupe_context" in COMMAND
    assert "nvs_config_save_command_dedupe_context" in COMMAND
    assert "persisted_dedupe.command_ids" in COMMAND


def test_side_effect_consumption_waits_for_dedupe_persistence():
    consume = COMMAND[COMMAND.index("command_action_t command_handler_consume_action"):]
    persist_gate = consume.index("s_recent_command_persist_dirty")
    dequeue = consume.index("xQueueReceive")
    assert persist_gate < dequeue
    assert "command_handler_persist_recent_command_ids_locked() != ESP_OK" in consume
    assert "s_recent_command_persist_blocked" in consume


def test_dedupe_blob_layout_mismatch_does_not_boot_loop():
    loader = NVS[NVS.index("nvs_config_load_command_dedupe_context"):]
    assert "ignoring legacy blob" in loader
    assert "return ESP_OK;" in loader
