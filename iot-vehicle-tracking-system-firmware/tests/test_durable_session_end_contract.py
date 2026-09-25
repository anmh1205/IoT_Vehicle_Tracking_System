from pathlib import Path


CORE = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "app-core"
    / "src"
    / "state_machine_core.c"
).read_text(encoding="utf-8")


def _slice(name: str, next_marker: str) -> str:
    start = CORE.index(name)
    end = CORE.index(next_marker, start)
    return CORE[start:end]


def test_normal_session_end_keeps_identity_until_boundary_is_durable():
    commit = _slice(
        "static bool state_machine_commit_session_end(",
        "/**\n * @brief Bind the active local session",
    )

    publish = commit.index('state_machine_publish_status("stopped", "ended")')
    failed_return = commit.index("return false;", publish)
    stop_queue = commit.index("offline_queue_stop_session(true);")
    clear_nvs = commit.index("state_machine_clear_persisted_session();")
    reset_runtime = commit.index("state_machine_reset_session_runtime();")

    assert publish < failed_return < stop_queue < clear_nvs < reset_runtime

    failure_path = commit[publish:stop_queue]
    assert "state_machine_clear_persisted_session();" not in failure_path
    assert "session_mgr_mark_stopped();" not in failure_path
    assert "offline_queue_set_session(0);" not in failure_path


def test_failed_end_boundary_retries_after_hold_instead_of_leaving_driving():
    boundary = _slice(
        "static bool state_machine_handle_driving_ignition_boundary(",
        "/**\n * @brief Run one CHECK_IGN state iteration",
    )

    assert "if (!state_machine_commit_session_end())" in boundary
    retry = boundary[
        boundary.index("if (!state_machine_commit_session_end())") :
        boundary.index("s_ignition_off_started_ms = 0U;", boundary.index("if (!state_machine_commit_session_end())"))
    ]
    assert "s_ignition_off_started_ms = now_ms;" in retry
    assert "return false;" in retry
