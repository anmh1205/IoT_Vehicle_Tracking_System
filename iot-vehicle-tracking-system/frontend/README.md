# IoT Vehicle Tracking System - Frontend

Next.js Web Application cho hệ thống theo dõi xe tự lái.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env với các giá trị thực tế
```

### 3. Run Development Server

```bash
npm run dev
```

Frontend sẽ chạy tại: http://localhost:3001

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   ├── login/          # Login page
│   └── dashboard/      # Dashboard pages
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components
│   ├── providers/      # Context providers
│   └── forms/          # Form components
├── features/           # Feature modules
├── hooks/              # Custom hooks
│   ├── queries/        # Query hooks
│   └── mutations/      # Mutation hooks
├── lib/                # Utilities & configs
│   ├── api/            # API clients
│   ├── realtime/       # WebSocket client
│   ├── store/          # Zustand stores
│   └── utils/          # Utility functions
└── types/              # TypeScript types
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 📚 Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - UI components
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **React Hook Form + Zod** - Form handling & validation
- **Socket.io Client** - Real-time updates
- **Leaflet** - Map integration

## 🔐 Environment Variables

See `.env.example` for required environment variables.

