from pathlib import Path

SOURCE = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "adapter-mqtt-sim7600-at"
    / "src"
    / "mqtt_session.c"
).read_text(encoding="utf-8")

PUBLISH_SOURCE = (
    Path(__file__).resolve().parents[1]
    / "components"
    / "adapter-mqtt-sim7600-at"
    / "src"
    / "mqtt_publish.c"
).read_text(encoding="utf-8")


def test_device_mqtt_connect_uses_persistent_session():
    assert '"AT+CMQTTCONNECT=%d,\\\"%s\\\",%u,0\\r"' in SOURCE
    assert '"AT+CMQTTCONNECT=%d,\\\"%s\\\",%u,0,\\\"%s\\\",\\\"%s\\\"\\r"' in SOURCE
    assert '"AT+CMQTTCONNECT=%d,\\\"%s\\\",%u,1' not in SOURCE


def test_command_subscription_remains_qos1_and_reassertable():
    assert '"AT+CMQTTSUB=%d,%u,1\\r"' in PUBLISH_SOURCE
    assert "if (s_commands_subscribed)" in PUBLISH_SOURCE
