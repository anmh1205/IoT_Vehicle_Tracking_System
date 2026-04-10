# Test Matrix — MQTT Simulator + VPS Fix Loop

## Scope
- Topics: rawdata, status, events, firmware
- Fault classes: none, jitter, duplicate, out-of-order, spike, reconnect, invalid_payload
- Environments: local stack, VPS UAT
- Gate policy: single hard-fail gate

## Smoke Matrix (<= 15 min)

| Case ID | Topic | Fault | Env | Expected Behavior |
|---|---|---|---|---|
| SMK-01 | rawdata | none | local | ingest pass, low latency |
| SMK-02 | status | none | local | QoS1 ack path OK, non-retain default |
| SMK-03 | events | duplicate | local | duplicates tolerated, no crash |
| SMK-04 | rawdata | jitter | VPS | delayed ingest within threshold |
| SMK-05 | events | reconnect | VPS | recover after bounded backoff |
| SMK-06 | firmware | invalid_payload | VPS | strict mode drop or fail gate |

## Stress Matrix (<= 60 min)

| Case ID | Topic Mix | Fault Profile | Env | Expected Behavior |
|---|---|---|---|---|
| STR-01 | 60/20/15/5 | mixed-core | local | stable pipeline, bounded error rate |
| STR-02 | 60/20/15/5 | mixed-core | VPS | fix-loop converges or hard-stop |

## Pass/Fail Metrics (UAT)
- Delivery ratio >= 0.99
- Ingest ratio >= 0.97
- Latency p95 <= 2500 ms
- Error rate <= 0.03
- Replay hash match >= 0.999

## Gate Decision
- PASS: all thresholds pass.
- RETEST: transient classifier + iteration budget available.
- FAIL_STOP: same classifier >=3 or run duration exceeded.
- ESCALATE: hard-stop override required (Platform lead only).
