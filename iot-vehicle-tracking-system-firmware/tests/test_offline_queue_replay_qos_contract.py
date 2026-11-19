"""Regression guard for QoS1 SD replay and parked backlog drain."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
QUEUE = (ROOT / "components/domain-storage/src/offline_queue.c").read_text(encoding="utf-8")
CORE = (ROOT / "components/app-core/src/state_machine_core.c").read_text(encoding="utf-8")


def test_sd_replay_only_advances_broker_confirmed_qos1():
    publish = QUEUE.split("static esp_err_t offline_queue_publish_record(", 1)[1].split("esp_err_t offline_queue_init(", 1)[0]
    assert "int qos = 1;" in publish
    assert "rec->critical ? 1 : 0" not in publish
    assert "if (qos == 0)" not in publish
    assert "sd_log_store_ack_critical_and_advance_replay" in publish


def test_parked_heartbeat_runs_bounded_replay():
    check_ign = CORE.split("static app_state_t state_machine_handle_check_ign_state(", 1)[1].split("static app_state_t state_machine_handle_driving_state(", 1)[0]
    heartbeat = CORE.split("static app_state_t state_machine_handle_heartbeat_state(", 1)[1].split("static app_state_t state_machine_handle_sleep_state(", 1)[0]
    assert "state_machine_run_wake_prelude(true);" in check_ign
    assert "state_machine_run_wake_prelude(true);" in heartbeat
    assert "offline_queue_depth() > 0U" in heartbeat
    assert "TRACKER_HEARTBEAT_REPLAY_GRACE_MS" in heartbeat
