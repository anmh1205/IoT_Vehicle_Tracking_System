## PHẦN XIII.8.3: BƯỚC 2 - COPY THEME & STYLING

### XIII.8.3 Bước 2: Copy Theme & Styling

#### 2.1 Copy CSS Files

```bash
# Copy globals.css
cp Example/frontend_v2/src/app/globals.css src/app/globals.css

# Copy theme.css
cp Example/frontend_v2/src/app/theme.css src/app/theme.css
```

#### 2.2 Copy Theme Constants

```bash
# Copy theme constants
cp Example/frontend_v2/src/lib/constants/theme.ts src/lib/constants/theme.ts
```

#### 2.3 Setup Tailwind Config

**Tạo `tailwind.config.ts`:**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

**Hoặc copy từ example:**

```bash
# Nếu example có tailwind.config.ts
cp Example/frontend_v2/tailwind.config.ts .
```

#### 2.4 Setup PostCSS

**Tạo `postcss.config.js`:**

```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

**Hoặc copy từ example:**

```bash
cp Example/frontend_v2/postcss.config.js .
```

---

