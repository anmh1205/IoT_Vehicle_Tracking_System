## PHẦN XIII.9.7: VẤN ĐỀ 6 - DUPLICATE UTILS FILES

### XIII.9.7 Vấn Đề 6: Duplicate Utils Files

#### Vấn Đề

**Files:**

- `src/lib/utils/device-status.ts`
- `src/lib/utils/device/status.ts` (có thể duplicate)

Cần kiểm tra xem có duplicate logic không.

#### Giải Pháp

**Consolidate utils:**

- Tổ chức utils theo domain (device, date, format, etc.)
- Tránh duplicate files
- Sử dụng barrel exports (`index.ts`)

```typescript
// src/lib/utils/device/index.ts
export * from "./status";
export * from "./runtime";
export * from "./aggregation";

// src/lib/utils/index.ts
export * from "./device";
export * from "./date";
export * from "./format";
```

**Cấu trúc đề xuất:**

```
src/lib/utils/
├── index.ts              # Barrel export
├── device/
│   ├── index.ts
│   ├── status.ts
│   ├── runtime.ts
│   └── aggregation.ts
├── date/
│   ├── index.ts
│   ├── formatter.ts
│   └── parser.ts
├── format/
│   ├── index.ts
│   ├── number.ts
│   └── string.ts
└── query-string.ts
```

---

