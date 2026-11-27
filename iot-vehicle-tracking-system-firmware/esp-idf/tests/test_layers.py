import re
import unittest

from host_build import FIRMWARE


COMPONENTS = FIRMWARE / "components"
COMMENT = re.compile(r"/\*[\s\S]*?\*/|//[^\n]*")
INCLUDE = re.compile(r'^\s*#\s*include\s*["<]([^">]+)[">]', re.M)
SDK_HEADER = re.compile(r"^(?:esp_|freertos/|driver/|hal/|soc/|sdkconfig\.h$)")


def sources(root):
    for path in sorted(root.rglob("*")):
        if path.suffix in {".h", ".c"}:
            yield path, COMMENT.sub("", path.read_text(encoding="utf-8"))


class Layers(unittest.TestCase):
    def assert_symbols_local(self, symbols, *allowed):
        violations = [
            path.relative_to(COMPONENTS).as_posix()
            for path, source in sources(COMPONENTS)
            if symbols.search(source) and not any(path.is_relative_to(folder) for folder in allowed)
        ]
        self.assertEqual(violations, [])

    def test_core_does_not_include_sdk(self):
        violations = [
            f"{path.relative_to(COMPONENTS)}: {header}"
            for path, source in sources(COMPONENTS / "ivts-core")
            for header in INCLUDE.findall(source)
            if SDK_HEADER.match(header)
        ]
        self.assertEqual(violations, [])

    def test_public_interfaces_do_not_expose_sdk_types(self):
        violations = []
        for folder in sorted(COMPONENTS.iterdir()):
            if folder.name == "platform":
                continue
            for path, source in sources(folder / "include"):
                violations.extend(
                    f"{path.relative_to(COMPONENTS)}: {header}"
                    for header in INCLUDE.findall(source)
                    if SDK_HEADER.match(header)
                )
                if re.search(r"\b(?:esp_err_t|QueueHandle_t|SemaphoreHandle_t)\b", source):
                    violations.append(f"{path.relative_to(COMPONENTS)}: ESP-IDF type")
        self.assertEqual(violations, [])

    def test_sleep_sdk_calls_stay_in_board(self):
        self.assert_symbols_local(re.compile(r"\besp_(?:sleep_\w+|light_sleep_start|deep_sleep_start)\b"),
                                  COMPONENTS / "board")

    @unittest.expectedFailure  # P1 centralizes the clock and reset glue.
    def test_clock_and_restart_sdk_calls_stay_in_platform(self):
        self.assert_symbols_local(re.compile(r"\b(?:esp_timer_get_time|esp_restart)\b"),
                                  COMPONENTS / "platform")

    @unittest.expectedFailure  # P2 puts the PCB pin map behind board and composition.
    def test_board_pins_stay_in_board_and_app_boot(self):
        self.assert_symbols_local(re.compile(r"\bBOARD_PIN_\w+\b"),
                                  COMPONENTS / "board", COMPONENTS / "app/src/boot")

    @unittest.expectedFailure  # P6 gives each app module ownership of its data.
    def test_app_module_dependencies(self):
        root = COMPONENTS / "app/src"
        levels = {
            "boot": 0, "runtime": 0, "diag": 0,
            "fw_update": 1, "command": 1, "publish": 1, "session": 1,
            "alarm": 1, "telemetry": 1, "power": 1,
            "device": 2, "link": 2, "persist": 2,
        }
        paths = dict(sources(root))
        headers = {path.relative_to(root).as_posix(): path for path in paths if path.suffix == ".h"}
        dependencies = {folder: set() for folder in levels}
        violations = []
        for path, source in paths.items():
            relative = path.relative_to(root)
            if re.search(r"\bg_app\b", source) or path.name == "app_priv.h":
                violations.append(f"{relative}: shared app state")
            origin = relative.parts[0]
            if origin not in levels:
                continue
            for header in INCLUDE.findall(source):
                target = headers.get(header, (path.parent / header).resolve())
                if target not in paths:
                    continue
                destination = target.relative_to(root).parts[0]
                if destination not in levels or destination == origin:
                    continue
                dependencies[origin].add(destination)
                if levels[destination] < levels[origin]:
                    violations.append(f"{relative}: includes {target.relative_to(root)}")

        def reachable(folder, seen):
            for dependency in dependencies[folder] - seen:
                yield dependency
                yield from reachable(dependency, seen | {dependency})

        for folder in dependencies:
            if folder in reachable(folder, set()):
                violations.append(f"{folder}: circular module dependency")
        self.assertEqual(violations, [])

    @unittest.expectedFailure  # P7–P9 move modem, storage, OBD and OTA state to its owners.
    def test_components_do_not_export_mutable_variables(self):
        variables = re.compile(r"^\s*extern\s+(?!const\b)[^;\n()]+;", re.M)
        self.assert_symbols_local(variables)
