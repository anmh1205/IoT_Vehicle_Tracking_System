"""Execute the actual modem-side publish correlation allocator under host GCC."""
from pathlib import Path
import shutil
import subprocess

import pytest

SOURCE = (
    Path(__file__).resolve().parents[1]
    / "components/adapter-mqtt-sim7600-at/src/mqtt_publish.c"
)


def test_publish_ids_are_positive_and_wrap_without_signed_overflow(tmp_path: Path):
    gcc = shutil.which("gcc")
    if not gcc:
        pytest.skip("GCC unavailable; ESP-IDF cross-compile remains required")
    src = SOURCE.read_text(encoding="utf-8")
    start = src.index("static int tracker_mqtt_next_local_publish_id(void) {")
    end = src.index("\n}\n", start) + 2
    helper = src[start:end]
    harness = (
        "#include <assert.h>\n"
        "#include <limits.h>\n"
        "static int s_next_msg_id = 1;\n"
        + helper + """
int main(void) {
    assert(tracker_mqtt_next_local_publish_id() == 1);
    assert(s_next_msg_id == 2);
    s_next_msg_id = INT_MAX - 1;
    assert(tracker_mqtt_next_local_publish_id() == INT_MAX - 1);
    assert(tracker_mqtt_next_local_publish_id() == INT_MAX);
    assert(s_next_msg_id == 1);
    assert(tracker_mqtt_next_local_publish_id() == 1);
    s_next_msg_id = -5;
    assert(tracker_mqtt_next_local_publish_id() == 1);
    s_next_msg_id = 0;
    assert(tracker_mqtt_next_local_publish_id() == 1);
    return 0;
}
"""
    )
    file = tmp_path / "mqtt_local_id.c"
    binary = tmp_path / "mqtt_local_id"
    file.write_text(harness, encoding="utf-8")
    compile_result = subprocess.run(
        [gcc, "-std=c11", "-Wall", "-Wextra", "-Werror",
         "-fsanitize=undefined", "-fno-sanitize-recover=undefined",
         str(file), "-o", str(binary)],
        text=True, capture_output=True,
    )
    # Some Windows GCC builds omit sanitizer runtime: still require strict C
    # compilation, while the CI toolchain executes the sanitized build.
    if compile_result.returncode != 0 and ("sanitizer" in compile_result.stderr.lower()
        or "ubsan" in compile_result.stderr.lower()):
        compile_result = subprocess.run(
            [gcc, "-std=c11", "-Wall", "-Wextra", "-Werror",
             str(file), "-o", str(binary)],
            text=True, capture_output=True,
        )
    assert compile_result.returncode == 0, compile_result.stderr
    subprocess.run([str(binary)], check=True, capture_output=True, text=True)
