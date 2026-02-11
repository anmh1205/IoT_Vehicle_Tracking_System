# Parser Strategy

> Different devices speak different languages. Normalize them all to one schema.

## Why Strategy Pattern?

```
Problem:
├── Device brand A sends JSON with "lat", "lon"
├── Device brand B sends binary with packed coordinates
├── Device brand C sends CSV with "latitude", "longitude"
└── All need to become the same NormalizedTelemetry

Solution: Strategy Pattern
├── Define IDeviceParser interface
├── Implement one parser per format/brand
├── Registry selects the right parser
└── Downstream code only sees NormalizedTelemetry
```

## Parser Interface

```
IDeviceParser:
├── canParse(topic, deviceType) -> boolean
│   └── Does this parser handle this message?
│
├── parse(topic, payload) -> NormalizedTelemetry
│   └── Convert raw payload to common schema
│
└── Properties:
    ├── name: string (e.g., "json-generic", "teltonika")
    └── supportedTypes: string[] (e.g., ["generic", "esp32"])
```

## NormalizedTelemetry Schema

```
Common schema (regardless of source device):
├── deviceId: string           # Unique device identifier
├── timestamp: Date            # When reading was taken
├── location:
│   ├── latitude: number
│   ├── longitude: number
│   ├── altitude?: number
│   ├── speed?: number
│   └── heading?: number
├── metrics:                   # Key-value sensor readings
│   ├── [metricName]: number   # e.g., "fuel_level": 72.5
│   └── ...
├── metadata:                  # Non-numeric context
│   ├── [key]: string          # e.g., "firmware": "1.2.3"
│   └── ...
└── raw?: object               # Original payload (for debugging)
```

## Parser Selection Decision

```
How to select the right parser?
│
├── By device type (from device registry / PostgreSQL)
│   ├── Look up device_id -> get device_type
│   ├── device_type -> parser mapping
│   ├── Pro: explicit, reliable
│   └── Con: requires device registry lookup per message
│
├── By topic prefix or structure
│   ├── v1/{device_id}/rawdata -> check topic metadata
│   ├── Pro: no database lookup needed
│   └── Con: less flexible
│
└── By payload inspection (auto-detect)
    ├── Try JSON parse -> if success, use JSON parser
    ├── Check magic bytes -> binary format detection
    ├── Pro: zero configuration
    └── Con: fragile, slower, ambiguous formats
```

## Common Parser Types

| Parser | Input Format | Use Case |
|--------|-------------|----------|
| **JSON Generic** | Standard JSON with known keys | ESP32, custom firmware, APIs |
| **Teltonika** | Teltonika Codec 8/8E binary | Teltonika GPS trackers |
| **Concox** | Concox protocol binary | Concox GPS trackers |
| **CSV/Text** | Comma or delimiter separated | Legacy devices, simple sensors |
| **Protobuf** | Protocol Buffers binary | High-performance, schema-enforced |

## Parser Registry

```
Registry pattern:
├── Map<deviceType, IDeviceParser>
├── register(parser) -> adds to map
├── getParser(deviceType) -> returns parser or default
├── Default parser: JSON Generic (fallback)
│
└── Adding a new device brand:
    ├── 1. Implement IDeviceParser interface
    ├── 2. Register in parser registry
    ├── 3. Map device_type in device registry
    └── 4. No other code changes needed (Open/Closed Principle)
```

## Single vs Multi-Parser Decision

```
Do you need multiple parsers?
│
├── All devices use same JSON format
│   ├── Single parser is fine
│   ├── Simpler codebase
│   └── No registry overhead
│
├── Multiple device brands / formats
│   ├── Strategy Pattern (multi-parser)
│   ├── Each brand gets its own parser
│   ├── New brands added without modifying existing code
│   └── Worth the complexity
│
└── Starting simple, might grow
    ├── Start with single JSON parser
    ├── Design interface from day one
    └── Refactor to registry when second brand arrives
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Giant if/else for device types | Grows endlessly, hard to test | Strategy Pattern with registry |
| No normalization | Downstream code handles every format | Always normalize to common schema |
| Parsing in subscriber | Mixes concerns, hard to unit test | Separate parser from subscription handler |
| No fallback parser | Unknown device crashes the bridge | Default parser that logs and passes through |
| Ignoring parse errors | Bad data silently enters storage | Dead letter topic, log and skip |
| Storing raw format | Each query must handle all formats | Normalize on ingestion, store normalized |
