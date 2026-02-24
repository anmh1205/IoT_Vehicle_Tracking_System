## XIII.3 Tech Stack Chi Tiết

### XIII.3.1 Core Dependencies

```json
{
  "dependencies": {
    "next": "^16.0.7",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "typescript": "^5.7.2",
    
    // UI Framework
    "@radix-ui/react-*": "^1.x.x",      // Radix UI primitives
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "tailwindcss-animate": "^1.0.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.2",
    
    // State Management
    "zustand": "^5.0.2",
    "@tanstack/react-query": "^5.90.5",
    "@tanstack/react-query-devtools": "^5.90.2",
    
    // Forms
    "react-hook-form": "^7.54.1",
    "@hookform/resolvers": "^5.2.1",
    "zod": "^4.1.8",
    
    // Realtime
    "socket.io-client": "^4.8.1",
    
    // Maps
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0",
    
    // Charts
    "recharts": "^2.15.1",
    "chart.js": "^4.4.8",
    "react-chartjs-2": "^5.3.0",
    
    // Icons
    "lucide-react": "^0.476.0",
    "@tabler/icons-react": "^3.31.0",
    
    // Utils
    "date-fns": "^4.1.0",
    "dayjs": "^1.11.19",
    "sonner": "^1.7.1",                // Toast notifications
    "next-themes": "^0.4.6",           // Theme switching
    "nextjs-toploader": "^3.7.15"      // Page transition loader
  }
}
```

### XIII.3.2 Dev Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.2",
    "@types/leaflet": "^1.9.21",
    "eslint": "^8.48.0",
    "eslint-config-next": "^16.0.7",
    "prettier": "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.11"
  }
}
```

