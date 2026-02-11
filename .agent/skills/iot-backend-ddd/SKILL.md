---
name: iot-backend-ddd
description: IoT backend architecture with Express + TypeScript + DDD. Domain structure, layered patterns, API design, real-time layer. Used when building or modifying backend services.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# IoT Backend DDD

> Express + TypeScript + Domain-Driven Design for IoT systems.
> **Principles over patterns. Structure over convention frameworks.**

## Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

---

## Content Map

| File | Description | When to Read |
|------|-------------|--------------|
| `domain-structure.md` | src/ layout, domain folders, feature placement | Adding new feature or domain |
| `layered-pattern.md` | Controller -> Service -> Repository flow | Implementing any endpoint |
| `api-design.md` | URL conventions, validation, response format | Designing REST endpoints |
| `error-handling.md` | Custom errors, centralized middleware, request-ID | Error handling decisions |
| `realtime-layer.md` | Socket.IO integration, rooms, event naming | WebSocket or real-time features |
| `testing-strategy.md` | Vitest, unit vs integration, what to test | Writing or reviewing tests |

---

## Related Skills

| Need | Skill |
|------|-------|
| API design principles | `@[skills/api-patterns]` |
| Database schema decisions | `@[skills/database-design]` |
| Node.js runtime decisions | `@[skills/nodejs-best-practices]` |
| Clean code standards | `@[skills/clean-code]` |

---

## Decision Checklist

Before modifying backend code:

- [ ] **Identified which domain this belongs to?**
- [ ] **Followed the layer rule?** (Controller -> Service -> Repository)
- [ ] **Input validated at API boundary?** (Zod schema in validators/)
- [ ] **Error handling consistent?** (Custom error classes, not raw throws)
- [ ] **Response format matches envelope?** ({ success, data, error, meta })
- [ ] **Auth/authz checked on protected routes?**
- [ ] **Tests cover the critical path?**

---

## Anti-Patterns

**DON'T:**
- Put business logic in controllers (controllers are HTTP glue only)
- Create god services that handle multiple domains
- Skip the service layer for "simple" CRUD (it always grows)
- Import from one domain into another domain directly
- Use raw SQL string concatenation
- Expose internal error details to the client

**DO:**
- One domain folder per bounded context
- Services orchestrate, repositories query
- Validate at the API boundary with Zod
- Use path alias `@/*` for clean imports
- Throw custom errors, catch in middleware
- Correlate every request with a request-ID
