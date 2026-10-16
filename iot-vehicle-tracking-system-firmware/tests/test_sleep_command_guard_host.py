"""Run the production sleep admission function against volatile-command faults.

This verifies control flow, not merely that source text mentions queue flags.
Hardware deep-sleep retention and power measurements remain separate gates.
"""
from pathlib import Path
import os
import shutil
import subprocess

import pytest

SOURCE = (
    Path(__file__).resolve().parents[1]
    / "components/app-core/src/state_sleep_controller.c"
)


def extract(source: str, signature: str) -> str:
    begin = source.index(signature)
    depth = 0
    for index in range(source.index("{", begin), len(source)):
        if source[index] == "{":
            depth += 1
        elif source[index] == "}":
            depth -= 1
            if depth == 0:
                return source[begin:index + 1]
    raise ValueError("Unbalanced state_machine_can_enter_sleep")


def test_deep_sleep_fails_closed_when_cloud_work_is_volatile(tmp_path: Path):
    gcc = shutil.which("gcc")
    if not gcc:
        pytest.skip("Host GCC unavailable; ESP-IDF and hardware tests still required")
    c_source = SOURCE.read_text(encoding="utf-8")
    production = extract(c_source, "bool state_machine_can_enter_sleep(const char **out_reason) {")
    harness = r"""
#include <assert.h>
#include <stdbool.h>
#include <stddef.h>
#include <string.h>
#define CONFIG_TRACKER_FIELD_VALIDATION_MODE 0
#define CONFIG_TRACKER_FIELD_VALIDATION_KEEP_AWAKE 0
#define APP_STATE_SLEEP 4
#define TRACKER_SLEEP_MODE_DEEP 1
#define TRACKER_SLEEP_MODE_LIGHT 2
static struct { bool sleep_enabled; } s_config = { .sleep_enabled = true };
static struct { bool ignition; } s_telemetry;
static struct { bool ota_pending_confirm; } g_rtc_context;
static bool s_ota_in_progress, s_ble_connect_inflight;
static bool g_stable_ignition_present, g_stable_ignition;
static bool g_pending_ack, g_pending_action, g_pending_restart, g_pending_alarm;
static int g_sleep_mode = TRACKER_SLEEP_MODE_DEEP;
static int g_ack_checks, g_action_checks, g_restart_checks, g_alarm_checks;
static bool session_mgr_has_stable_ignition(void) { return g_stable_ignition_present; }
static bool session_mgr_stable_ignition(void) { return g_stable_ignition; }
static int state_machine_resolve_sleep_mode(int state) {
    assert(state == APP_STATE_SLEEP);
    return g_sleep_mode;
}
static bool state_machine_has_pending_command_acks(void) {
    ++g_ack_checks; return g_pending_ack;
}
static bool command_handler_has_pending_actions(void) {
    ++g_action_checks; return g_pending_action;
}
static bool state_machine_has_pending_restart_after_ack(void) {
    ++g_restart_checks; return g_pending_restart;
}
static bool state_machine_has_pending_motion_alarm(void) {
    ++g_alarm_checks; return g_pending_alarm;
}
""" + "\n" + production + r"""
static void assert_blocked(const char *reason) {
    const char *out = NULL;
    assert(!state_machine_can_enter_sleep(&out));
    assert(out != NULL && strcmp(out, reason) == 0);
}
int main(void) {
    const char *reason = NULL;
    assert(state_machine_can_enter_sleep(&reason));
    assert(strcmp(reason, "ok") == 0);

    // All four volatile queue types individually prohibit deep sleep.
    bool *flags[] = {&g_pending_ack, &g_pending_action, &g_pending_restart, &g_pending_alarm};
    for (size_t i = 0; i < sizeof(flags) / sizeof(flags[0]); ++i) {
        *flags[i] = true;
        assert_blocked("volatile_cloud_command_pending");
        assert(*flags[i]); // admission check never consumes the queued work
        *flags[i] = false;
    }
    assert(g_ack_checks > 0 && g_action_checks > 0 &&
           g_restart_checks > 0 && g_alarm_checks > 0);

    // Light sleep retains RAM. The gate must distinguish it from deep sleep.
    g_sleep_mode = TRACKER_SLEEP_MODE_LIGHT;
    g_pending_ack = g_pending_action = g_pending_restart = g_pending_alarm = true;
    assert(state_machine_can_enter_sleep(NULL));
    g_pending_ack = g_pending_action = g_pending_restart = g_pending_alarm = false;
    g_sleep_mode = TRACKER_SLEEP_MODE_DEEP;

    s_ota_in_progress = true;
    assert_blocked("ota_in_progress");
    s_ota_in_progress = false;
    g_rtc_context.ota_pending_confirm = true;
    assert_blocked("ota_pending_confirm");
    g_rtc_context.ota_pending_confirm = false;
    s_telemetry.ignition = true;
    assert_blocked("ignition_on");
    s_telemetry.ignition = false;
    g_stable_ignition_present = g_stable_ignition = true;
    assert_blocked("ignition_stable_on");
    g_stable_ignition_present = g_stable_ignition = false;
    s_ble_connect_inflight = true;
    assert_blocked("ble_connect_inflight");
    s_ble_connect_inflight = false;
    s_config.sleep_enabled = false;
    assert_blocked("sleep_policy_disabled");
    s_config.sleep_enabled = true;
    assert(state_machine_can_enter_sleep(&reason));
    assert(strcmp(reason, "ok") == 0);
    return 0;
}
""";
    cfile = tmp_path / "sleep_queue_guard.c"
    binary = tmp_path / ("sleep_queue_guard.exe" if os.name == "nt" else "sleep_queue_guard")
    cfile.write_text(harness, encoding="utf-8")
    built = subprocess.run(
        [gcc, "-std=c11", "-Wall", "-Wextra", "-Werror", str(cfile), "-o", str(binary)],
        capture_output=True, text=True,
    )
    assert built.returncode == 0, built.stderr
    subprocess.run([str(binary)], check=True, capture_output=True, text=True)
