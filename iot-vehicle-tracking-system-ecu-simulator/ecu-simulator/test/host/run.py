from pathlib import Path
import os
import subprocess
import tempfile

test = Path(__file__).resolve().parent
source = test.parent.parent / "src"
with tempfile.TemporaryDirectory() as directory:
    executable = Path(directory) / "ecu-tests"
    if os.name == "nt":
        executable = executable.with_suffix(".exe")
    subprocess.run(
        [
            os.environ.get("CXX", "g++"), "-std=c++11", "-Wall", "-Wextra", "-Werror",
            "-I", str(test / "stubs"), "-I", str(source),
            str(test / "ecu-test.cpp"),
            *[str(path) for path in sorted(source.glob("*.cpp")) if path.name != "main.cpp"],
            "-o", str(executable),
        ],
        check=True,
    )
    subprocess.run([str(executable)], check=True)
