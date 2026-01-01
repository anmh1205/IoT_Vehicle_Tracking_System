/**
 * App Sidebar - Main navigation sidebar
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItems } from '@/config/nav-config';
import { useUIStore } from '@/lib/store/ui-store';
import {
  LayoutDashboard,
  Car,
  Cpu,
  MapPin,
  Route,
  AlertTriangle,
  Map,
  Wrench,
  Terminal,
  Bell,
  Settings,
  Users,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  vehicles: Car,
  devices: Cpu,
  tracking: MapPin,
  trips: Route,
  alerts: AlertTriangle,
  geofences: Map,
  maintenance: Wrench,
  commands: Terminal,
  notifications: Bell,
  settings: Settings,
  customers: Users,
};

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed } = useUIStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-background transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Car className="h-6 w-6" />
          {!sidebarCollapsed && (
            <span className="font-semibold">Vehicle Tracking</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);

          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {!sidebarCollapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

