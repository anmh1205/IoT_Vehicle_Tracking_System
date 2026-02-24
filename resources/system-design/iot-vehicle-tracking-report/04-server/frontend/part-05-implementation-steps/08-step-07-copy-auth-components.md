## PHẦN XIII.8.8: BƯỚC 7 - COPY AUTH COMPONENTS

### XIII.8.8 Bước 7: Copy Auth Components

#### 7.1 Copy Auth Guard

```bash
# Copy auth guard
cp Example/frontend_v2/src/components/layout/auth-guard.tsx src/components/layout/auth-guard.tsx
```

#### 7.2 Copy Login Page

```bash
# Copy login page
mkdir -p src/app/login
cp Example/frontend_v2/src/app/login/page.tsx src/app/login/page.tsx

# Copy auth components
mkdir -p src/components/auth
cp -r Example/frontend_v2/src/components/auth/* src/components/auth/
```

**Customize Login:**

- Update API endpoint
- Update form fields
- Update validation

---

