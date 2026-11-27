from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CORE = (ROOT / "components" / "app-core" / "src" / "state_machine_core.c").read_text(
    encoding="utf-8"
)
PIPELINE = (
    ROOT / "components" / "app-core" / "src" / "state_publish_pipeline.c"
).read_text(encoding="utf-8")
HEADER = (
    ROOT / "components" / "app-core" / "include" / "state_publish_pipeline.h"
).read_text(encoding="utf-8")


def _function_slice(source: str, name: str, next_marker: str) -> str:
    start = source.index(name)
    end = source.index(next_marker, start)
    return source[start:end]


def test_status_publish_exposes_durable_acceptance():
    assert "bool state_machine_publish_status(" in PIPELINE
    assert "return state_publish_via_pipeline(" in _function_slice(
        PIPELINE,
        "bool state_machine_publish_status(",
        "/**\n * @brief Publish an event payload",
    )
    assert "bool state_machine_publish_status(" in HEADER


def test_restored_off_session_emits_end_before_identity_is_cleared():
    reconcile = _function_slice(
        CORE,
        "static bool state_machine_reconcile_stale_restored_session(",
        "/**\n * @brief Emit the final session boundary",
    )

    expose = reconcile.index("s_session_restore_pending = false;")
    publish = reconcile.index('state_machine_publish_status("stopped", "ended")')
    clear = reconcile.index("if (!state_machine_clear_persisted_session())")
    reset = reconcile.index("state_machine_reset_session_runtime();")

    assert expose < publish < clear < reset
    assert "if (!accepted)" in reconcile
    failed_branch = reconcile[
        reconcile.index("if (!accepted)") : reconcile.index("offline_queue_stop_session(true)")
    ]
    assert "s_session_restore_pending = true;" in failed_branch
    assert "state_machine_clear_persisted_session();" not in failed_branch


def test_heartbeat_reconciles_instead_of_silently_dropping_restored_session():
    assert "state_machine_reconcile_stale_restored_session();" in CORE
    assert "state_machine_drop_stale_restored_session();" not in CORE


def test_restored_session_keeps_identity_when_nvs_clear_fails():
    reconcile = _function_slice(
        CORE,
        "static bool state_machine_reconcile_stale_restored_session(",
        "/**\n * @brief Emit the final session boundary",
    )
    clear_guard = reconcile.index("if (!state_machine_clear_persisted_session())")
    stop = reconcile.index("offline_queue_stop_session(true)", clear_guard)
    failure = reconcile[clear_guard:stop]
    assert "s_session_restore_pending = true;" in failure
    assert "reason=persist_clear_failed" in failure
    assert "return false;" in failure
    assert "session_mgr_mark_stopped();" not in failure
    assert "state_machine_reset_session_runtime();" not in failure
