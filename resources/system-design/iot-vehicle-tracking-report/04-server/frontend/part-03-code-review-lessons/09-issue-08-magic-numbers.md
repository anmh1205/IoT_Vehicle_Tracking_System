## PHẦN XIII.9.9: VẤN ĐỀ 8 - MAGIC NUMBERS VÀ HARDCODED VALUES

### XIII.9.9 Vấn Đề 8: Magic Numbers và Hardcoded Values

#### Vấn Đề

**File:** `src/lib/api/http.ts`

Magic numbers và hardcoded values:

```typescript
setTimeout(() => controller.abort(), 30000); // Magic number
setTimeout(() => controller.abort(), 60000); // Magic number (file uploads)
const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
```

#### Giải Pháp

**Tạo constants:**

```typescript
// src/lib/constants/api.ts
export const API_TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  FILE_UPLOAD: 60000, // 60 seconds
  EXPORT: 120000, // 2 minutes
} as const;

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
} as const;

// Usage
const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUTS.DEFAULT);
```

**Lợi ích:**

- ✅ Dễ maintain và thay đổi
- ✅ Self-documenting code
- ✅ Tránh magic numbers

---

