from pathlib import Path


SOURCE = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "app-core"
    / "src"
    / "state_machine_core.c"
).read_text(encoding="utf-8")

PIPELINE = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "app-core"
    / "src"
    / "state_publish_pipeline.c"
).read_text(encoding="utf-8")


def test_new_session_marks_authoritative_start_pending():
    start = SOURCE.split("static void state_machine_start_new_session", 1)[1].split(
        "static void state_machine_resume_active_session", 1
    )[0]
    assert "s_session_start_boundary_pending = true;" in start


def test_running_start_retries_until_publish_is_durable():
    function = SOURCE.split(
        "static void state_machine_publish_running_status_if_needed", 1
    )[1].split("static bool state_machine_publish_session_start_rawdata_if_needed", 1)[0]
    assert "if (s_session_start_boundary_pending)" in function
    assert 'state_machine_publish_status("running", "started")' in function
    assert "s_session_start_boundary_pending = false;" in function
    accepted = function.index('state_machine_publish_status("running", "started")')
    clear = function.index("s_session_start_boundary_pending = false;", accepted)
    state = function.index("s_publish_status = TRACKER_PUBLISH_STATUS_RUNNING;", clear)
    assert accepted < clear < state


def test_resumed_session_preserves_persisted_start_delivery_state():
    restore = SOURCE.split("static void state_machine_restore_session_context_from_nvs", 1)[1].split(
        "static void state_machine_start_new_session", 1
    )[0]
    resume = SOURCE.split("static void state_machine_resume_active_session", 1)[1].split(
        "static bool state_machine_reconcile_stale_restored_session", 1
    )[0]
    reset = SOURCE.split("static void state_machine_reset_session_runtime", 1)[1].split(
        "static void state_machine_persist_active_session", 1
    )[0]
    assert "s_session_start_boundary_pending = context.start_boundary_pending;" in restore
    assert "s_session_start_boundary_pending = false;" not in resume
    assert "s_session_start_boundary_pending = false;" in reset


def test_durable_start_completion_is_persisted():
    function = SOURCE.split(
        "static void state_machine_publish_running_status_if_needed", 1
    )[1].split("static bool state_machine_publish_session_start_rawdata_if_needed", 1)[0]
    clear = function.index("s_session_start_boundary_pending = false;")
    persist = function.index("state_machine_persist_active_session();", clear)
    running = function.index("s_publish_status = TRACKER_PUBLISH_STATUS_RUNNING;", persist)
    assert clear < persist < running


def test_start_boundary_waits_for_durable_local_identity():
    function = SOURCE.split(
        "static void state_machine_publish_running_status_if_needed", 1
    )[1].split("static bool state_machine_publish_session_start_rawdata_if_needed", 1)[0]
    guard = function.index(
        "if (!s_session_identity_persisted && !state_machine_persist_active_session())"
    )
    publish = function.index('state_machine_publish_status("running", "started")')
    assert guard < publish
    assert "reason=session_identity_not_durable" in function


def test_session_identity_durability_tracks_save_restore_and_reset():
    persist = SOURCE.split("static bool state_machine_persist_active_session", 1)[1].split(
        "static void state_machine_clear_persisted_session", 1
    )[0]
    restore = SOURCE.split("static void state_machine_restore_session_context_from_nvs", 1)[1].split(
        "static void state_machine_start_new_session", 1
    )[0]
    reset = SOURCE.split("static void state_machine_reset_session_runtime", 1)[1].split(
        "static bool state_machine_persist_active_session", 1
    )[0]
    assert "return false;" in persist
    assert "s_session_identity_persisted = true;" in persist
    assert "s_session_identity_persisted = true;" in restore
    assert "s_session_identity_persisted = false;" in reset


def test_outbound_session_identity_requires_durable_recovery_state():
    gate = PIPELINE.split(
        "static bool state_publish_should_emit_session_identity(void)", 1
    )[1].split("static uint32_t state_publish_effective_local_session_key", 1)[0]
    assert "!s_session_restore_pending" in gate
    assert "s_session_identity_persisted" in gate
    assert "s_session_id != 0U" in gate
