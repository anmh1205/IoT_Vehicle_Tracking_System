import subprocess

from host_build import CORE, FIRMWARE, build_fixture


def test_typed_json_object_fields(tmp_path):
    executable = tmp_path / "json-fields-fixture"
    build_fixture(
        executable,
        [FIRMWARE / "tests/json_fields_fixture.c", *sorted(CORE.glob("src/**/*.c"))],
    )
    subprocess.run([executable], check=True, timeout=5)
