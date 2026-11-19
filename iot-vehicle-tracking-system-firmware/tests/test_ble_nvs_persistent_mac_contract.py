"""BLE OBD adapter MAC must survive power loss without NVS flash write every boot."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = (ROOT / "components/app-core/src/state_obd_runtime.c").read_text(encoding="utf-8")
CMAKE = (ROOT / "components/app-core/CMakeLists.txt").read_text(encoding="utf-8")


def test_preferred_mac_nvs_hint():
    assert 'nvs_get_blob(nvs, OBD_MAC_NVS_KEY' in SRC
    assert 'nvs_set_blob(nvs, OBD_MAC_NVS_KEY' in SRC
    assert 'nvs_erase_key(nvs, OBD_MAC_NVS_KEY)' in SRC
    assert 'state_machine_load_ble_mac_from_nvs()' in SRC
    assert 'memcmp(existing, parsed_addr.val, sizeof(existing)) != 0' in SRC
    assert 'nvs_flash' in CMAKE
