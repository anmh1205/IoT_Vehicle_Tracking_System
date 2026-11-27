import subprocess

from host_build import CORE, FIRMWARE, build_fixture


def test_periodic_status_lines(tmp_path):
    executable = tmp_path / "status-line-fixture"
    build_fixture(
        executable,
        [FIRMWARE / "tests/status_line_fixture.c", *sorted(CORE.joinpath("src").rglob("*.c"))],
    )
    subprocess.run([executable], check=True, timeout=5)
