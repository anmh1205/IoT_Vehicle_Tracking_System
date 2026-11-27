from pathlib import Path


SOURCE = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "app-core"
    / "src"
    / "state_machine_core.c"
).read_text(encoding="utf-8")


def test_canonical_assignment_rolls_back_ram_when_nvs_persist_fails():
    function = SOURCE.split("esp_err_t state_machine_apply_session_assignment", 1)[1].split(
        "static void state_machine_resume_restored_session_if_needed", 1
    )[0]
    previous = function.index("previous_canonical_session_id")
    assign = function.index("s_canonical_session_id = canonical_session_id;", previous)
    persist = function.index("if (!state_machine_persist_active_session())", assign)
    rollback = function.index(
        "s_canonical_session_id = previous_canonical_session_id;", persist
    )
    failure = function.index("return ESP_FAIL;", rollback)
    assert previous < assign < persist < rollback < failure
    assert "reason=persist_failed" in function
    assert "durable=1" in function
