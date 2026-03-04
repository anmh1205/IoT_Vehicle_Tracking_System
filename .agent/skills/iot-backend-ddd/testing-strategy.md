# Testing Strategy

> Test behavior, not implementation. Test what breaks, not what works.

## Test Runner

```
Vitest (chosen over Jest):
├── Native TypeScript (no ts-jest config)
├── ESM-first (matches project module system)
├── Fast (Vite-powered, parallel by default)
├── Compatible Jest API (easy migration)
└── Built-in coverage (v8 or istanbul)
```

## Test Pyramid for IoT Backend

```
                    /\
                   /  \
                  / E2E \          Few: Critical user flows
                 /--------\        (login -> view device -> see telemetry)
                /          \
               / Integration \     Medium: API routes with real HTTP
              /--------------\     (supertest, database in-memory or test DB)
             /                \
            /    Unit Tests     \  Many: Service logic, business rules
           /--------------------\  (mock repository, pure functions)
```

## What to Test

| Layer | Test Type | What to Verify |
|-------|-----------|----------------|
| **Service** | Unit | Business logic, validation rules, error conditions |
| **Service** | Unit | Edge cases (empty input, boundary values, null handling) |
| **Controller** | Integration | HTTP status codes, response format, auth enforcement |
| **Middleware** | Unit | Auth check, error formatting, request-ID assignment |
| **Repository** | Integration | Query correctness (optional, with test database) |

## What NOT to Test

```
Skip these (low value, high maintenance):
├── Express framework internals
├── Zod library validation (it works)
├── Simple getters/setters with no logic
├── Database driver behavior
├── Third-party library wrappers (unless you added logic)
└── TypeScript type checking (compiler does this)
```

## Test Structure

```
describe("{ServiceName}")
│
├── describe("{methodName}")
│   │
│   ├── it("should {expected behavior} when {condition}")
│   │   ├── Arrange: Set up data, mocks
│   │   ├── Act: Call the method
│   │   └── Assert: Verify result
│   │
│   ├── it("should throw {ErrorType} when {invalid condition}")
│   │
│   └── it("should return empty array when no results found")
│
└── Edge cases grouped at the end
```

## Unit Test Decision

```
Should I unit test this?
│
├── Does it contain business logic (if/else, calculations)?
│   └── YES → Unit test the logic
│
├── Does it transform data?
│   └── YES → Unit test input/output mapping
│
├── Does it have error paths?
│   └── YES → Unit test each error condition
│
├── Is it a thin wrapper (just calls another function)?
│   └── NO → Skip, test the function it wraps instead
│
└── Is it framework glue (route definition, middleware wiring)?
    └── NO → Integration test covers this
```

## Integration Test Decision

```
Should I integration test this?
│
├── Does the endpoint enforce authentication?
│   └── YES → Test with and without valid session
│
├── Does it validate request body/params?
│   └── YES → Test with invalid input
│
├── Does the response format matter to clients?
│   └── YES → Verify envelope shape
│
├── Is it a simple proxy to a tested service?
│   └── NO → Skip, unit tests on service are enough
│
└── Does it combine multiple services?
    └── YES → Integration test the orchestration
```

## Mocking Strategy

```
What to mock:
├── Repositories (in service unit tests)
├── External APIs (HTTP clients, MQTT)
├── Database (in unit tests, real in integration)
├── Time-dependent functions (Date.now, timers)
└── Environment variables (per-test config)

What NOT to mock:
├── The thing you are testing
├── Simple data transformations
├── Type assertions
└── Too many layers (if you mock 5 things, the test is brittle)
```

## Commands

| Command | Purpose | When |
|---------|---------|------|
| `npm run test` | Run all tests once | CI, before commit |
| `npm run test:watch` | Watch mode, re-run on change | During development |
| `npm run test:cov` | Coverage report | Before PR, periodic check |
| `npm run verify` | Lint + typecheck + test | Pre-merge validation |

## Coverage Philosophy

```
Coverage targets:
├── Domain services: 80%+ (critical business logic)
├── Controllers: 60%+ (via integration tests)
├── Middleware: 70%+ (auth, error handling)
├── Repositories: 40%+ (optional, SQL is hard to unit test)
├── Infrastructure: 20%+ (mostly integration)
└── Config/types: 0% (no logic to test)

Rule: Measure coverage on domain/ folder, not overall.
High coverage on infrastructure is waste.
```

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Testing implementation details | Breaks on refactor | Test behavior and outputs |
| Snapshot tests for API responses | Brittle, false positives | Assert specific fields |
| No test for error paths | Bugs hide in error handling | Test every throw/reject path |
| Mocking everything | Test proves nothing | Mock only external boundaries |
| Tests depending on execution order | Flaky, hard to debug | Each test sets up its own state |
| Testing framework behavior | Wasted effort | Trust Express/Vitest to work |
| 100% coverage goal | Diminishing returns | Focus on critical paths |
