import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from com_detector import PortInfo, detect_ports


def test_detect_ports_returns_list():
    ports = detect_ports()
    assert isinstance(ports, list)


def test_portinfo_dataclass_fields():
    item = PortInfo(device="COM6", description="USB Serial", hwid="VID:PID", vid=0x10C4, pid=0xEA60)
    assert item.device == "COM6"
    assert item.vid == 0x10C4
    assert item.pid == 0xEA60
