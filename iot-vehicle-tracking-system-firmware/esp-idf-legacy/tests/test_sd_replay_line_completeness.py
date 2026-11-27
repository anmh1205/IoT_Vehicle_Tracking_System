"""Run the production SD replay terminator check under a host compiler.

An interrupted append can leave a short final line with a valid-looking
header and an incomplete JSON body. A missing LF means it was not committed.
"""
from pathlib import Path
import shutil
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "components/adapter-storage-sdmmc-fatfs/src/sd_log_store.c"


def extract_line_check(source: str) -> str:
    signature = "static bool sd_log_store_line_complete(const char *line) {"
    start = source.index(signature)
    depth = 0
    for i in range(source.index("{", start), len(source)):
        if source[i] == "{":
            depth += 1
        elif source[i] == "}":
            depth -= 1
            if depth == 0:
                return source[start : i + 1]
    raise ValueError("Unterminated production SD replay helper")


def test_truncated_tail_is_never_accepted_as_replay_record(tmp_path: Path):
    gcc = shutil.which("gcc")
    if gcc is None:
        pytest.skip("GCC unavailable; the ESP-IDF CI build remains required")
    production_check = extract_line_check(SOURCE.read_text(encoding="utf-8"))
    harness = (
        "#include <assert.h>\n"
        "#include <stdbool.h>\n"
        "#include <string.h>\n"
        + production_check
        + r"""
int main(void) {
    assert(sd_log_store_line_complete("12|1|3|4|0|1|0|1|{\"ok\":true}\n"));
    assert(!sd_log_store_line_complete("12|1|3|4|0|1|0|1|{\"ok\":true}"));
    assert(!sd_log_store_line_complete("12|1|3|4|0|1|0|1|{\"half\":"));
    assert(!sd_log_store_line_complete(""));
    assert(!sd_log_store_line_complete(NULL));
    return 0;
}
"""
    )
    target = tmp_path / "sd_replay_check.c"
    binary = tmp_path / "sd_replay_check"
    target.write_text(harness, encoding="utf-8")
    result = subprocess.run(
        [gcc, "-std=c11", "-Wall", "-Wextra", "-Werror",
         str(target), "-o", str(binary)],
        text=True, capture_output=True,
    )
    assert result.returncode == 0, result.stderr
    subprocess.run([str(binary)], check=True, capture_output=True, text=True)
