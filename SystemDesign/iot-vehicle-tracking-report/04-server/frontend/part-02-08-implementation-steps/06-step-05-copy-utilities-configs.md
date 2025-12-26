## PHẦN XIII.8.6: BƯỚC 5 - COPY UTILITIES & CONFIGS

### XIII.8.6 Bước 5: Copy Utilities & Configs

#### 5.1 Copy Utils

```bash
# Copy utils
cp Example/frontend_v2/src/lib/utils.ts src/lib/utils.ts
cp Example/frontend_v2/src/lib/utils/cn.ts src/lib/utils/cn.ts
```

#### 5.2 Copy HTTP Client

```bash
# Copy HTTP client
mkdir -p src/lib/api
cp Example/frontend_v2/src/lib/api/http.ts src/lib/api/http.ts
```

**Customize HTTP Client:**

- Update API base URL
- Update error handling cho Vehicle Tracking System
- Giữ nguyên retry logic và timeout handling

#### 5.3 Copy Auth Store

```bash
# Copy auth store
mkdir -p src/lib/store
cp Example/frontend_v2/src/lib/store/authStore.ts src/lib/store/authStore.ts
```

**Customize Auth Store:**

- Update login/logout logic
- Update user type
- Giữ nguyên token management

#### 5.4 Copy Notification Utils

```bash
# Copy notification utils
cp Example/frontend_v2/src/lib/notification.ts src/lib/notification.ts
```

---

