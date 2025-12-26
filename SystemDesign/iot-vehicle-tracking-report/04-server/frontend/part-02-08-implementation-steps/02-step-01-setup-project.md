## PHẦN XIII.8.2: BƯỚC 1 - SETUP PROJECT MỚI

### XIII.8.2 Bước 1: Setup Project Mới

#### 1.1 Tạo Next.js Project

```bash
# Tạo project mới
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir=false

# Hoặc với src directory
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir

cd frontend
```

#### 1.2 Copy Dependencies từ Example

```bash
# Copy package.json từ Example/frontend_v2
# Hoặc cài đặt thủ công các dependencies quan trọng
```

**Cài đặt dependencies:**

```bash
# Core
npm install next@^16.0.7 react@^19.2.0 react-dom@^19.2.0

# UI Framework
npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast
npm install tailwindcss@^4.0.0 @tailwindcss/postcss
npm install class-variance-authority clsx tailwind-merge

# State Management
npm install zustand@^5.0.2
npm install @tanstack/react-query@^5.90.5 @tanstack/react-query-devtools@^5.90.2

# Forms
npm install react-hook-form@^7.54.1 @hookform/resolvers@^5.2.1 zod@^4.1.8

# Realtime
npm install socket.io-client@^4.8.1

# Maps
npm install leaflet@^1.9.4 react-leaflet@^5.0.0

# Charts
npm install recharts@^2.15.1 chart.js@^4.4.8 react-chartjs-2@^5.3.0

# Icons
npm install lucide-react@^0.476.0 @tabler/icons-react@^3.31.0

# Utils
npm install date-fns@^4.1.0 dayjs@^1.11.19 sonner@^1.7.1 next-themes@^0.4.6 nextjs-toploader@^3.7.15

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom @types/leaflet
npm install -D eslint eslint-config-next prettier prettier-plugin-tailwindcss
```

#### 1.3 Setup shadcn/ui

```bash
# Khởi tạo shadcn/ui
npx shadcn@latest init

# Chọn options:
# - Style: New York
# - Base color: Zinc
# - CSS variables: Yes
```

**Copy `components.json` từ example:**

```bash
cp Example/frontend_v2/components.json .
```

---

