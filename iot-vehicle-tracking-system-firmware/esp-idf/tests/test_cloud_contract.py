import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import uuid
from host_build import CORE, FIRMWARE, build_fixture


class CloudContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with tempfile.TemporaryDirectory() as directory:
            executable = Path(directory) / "cloud-fixture"
            build_fixture(
                executable,
                [FIRMWARE / "tests" / "cloud_fixture.c", *sorted(CORE.joinpath("src").rglob("*.c"))],
            )
            output = subprocess.check_output([executable], text=True)
        cls.payloads = [json.loads(line) for line in output.splitlines()]

    def test_live_replay_and_legacy_samples(self):
        live, replay, legacy = self.payloads[:3]
        for payload in (live, replay, legacy):
            self.assertEqual(uuid.UUID(payload["metadata"]["message_id"]).version, 8)
            self.assertTrue(payload["timestamp_trusted"])
        self.assertEqual(live["timestamp"], 1795430404000)
        self.assertEqual(live["metadata"], replay["metadata"])
        self.assertEqual(live["timestamp"], replay["timestamp"])
        self.assertEqual(live["data"], replay["data"])
        self.assertEqual(live["data"]["latitude"], 0)
        self.assertEqual(live["data"]["speed"], 36)
        self.assertEqual(live["data"]["vehicle_battery"], 13.52)
        self.assertEqual(live["diagnostics"]["signals"]["rpm"], 0)
        self.assertEqual(live["diagnostics"]["readiness"]["misfire"], "incomplete")
        self.assertEqual(live["diagnostics"]["dtc"]["stored"][0], "P0171")
        self.assertEqual(live["state"]["vehicle_state"], "MOVING_ON")
        self.assertEqual(live["boot_id"], "00000001")
        self.assertEqual(live["metadata"]["boot_id"], "00000002")
        self.assertEqual(live["canonical_session_id"], "9876")
        self.assertEqual(legacy["metadata"]["boot_id"], "00000007")
        self.assertNotIn("local_session_key", legacy)

    def test_status_alarm_and_ota(self):
        started, heartbeat, event, firmware = self.payloads[3:]
        self.assertEqual((started["status"], started["boundary_event"]), ("running", "started"))
        self.assertEqual(started["local_session_key"], 8)
        self.assertEqual(heartbeat["status"], "heartbeat")
        self.assertFalse(heartbeat["timestamp_trusted"])
        self.assertGreater(heartbeat["timestamp"], 0)
        self.assertEqual((event["event_type"], event["code"], event["message"]), ("warning", 1001, "motion_detected"))
        self.assertEqual(firmware["jobId"], "deploy-7")
        self.assertEqual((firmware["currentVersion"], firmware["targetVersion"]), ("2.1.0", "2.1.0"))
        self.assertTrue(firmware["auth_token"])

    @unittest.skipUnless(os.environ.get("IVTS_BRIDGE_VALIDATOR"), "requires the MQTT Bridge validator and Zod")
    def test_reference_bridge_accepts_payloads_and_metadata(self):
        script = """
            import { readFileSync } from 'node:fs';
            import { pathToFileURL } from 'node:url';
            const schemas = await import(pathToFileURL(process.env.IVTS_BRIDGE_VALIDATOR).href);
            const payloads = JSON.parse(readFileSync(0, 'utf8'));
            const names = ['rawDataSchema', 'rawDataSchema', 'rawDataSchema',
                           'statusSchema', 'statusSchema', 'eventSchema', 'firmwareStatusSchema'];
            payloads.forEach((payload, index) => {
                const parsed = schemas[names[index]].parse(payload);
                if (parsed.metadata?.message_id !== payload.metadata.message_id) {
                    throw new Error('The bridge discarded metadata for ' + names[index]);
                }
            });
        """
        subprocess.run(
            ["node", "--input-type=module", "-e", script],
            input=json.dumps(self.payloads), text=True, check=True,
        )


if __name__ == "__main__":
    unittest.main()
