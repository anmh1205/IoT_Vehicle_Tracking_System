import os
from pathlib import Path
import subprocess


FIRMWARE = Path(__file__).resolve().parents[1]
CORE = FIRMWARE / "components" / "ivts-core"
PLATFORM = FIRMWARE / "components" / "platform"


def build_fixture(executable, sources, extra_flags=(), *, linker_flags=()):
    flags = ["-std=c11", "-Wall", "-Wextra", "-Werror", "-Wconversion", "-Wshadow", "-pedantic"]
    if os.environ.get("IVTS_HOST_SANITIZE") == "1":
        flags += ["-fsanitize=address,undefined", "-fno-sanitize-recover=all", "-no-pie"]
    subprocess.run(
        [os.environ.get("CC", "cc"), *flags, "-I", CORE / "include", "-I", CORE / "src", *extra_flags, *sources, "-o", executable, *linker_flags],
        check=True,
    )
