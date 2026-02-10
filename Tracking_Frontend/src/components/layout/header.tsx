'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/devices': 'Devices',
  '/vehicles': 'Vehicles',
  '/customers': 'Customers',
  '/trips': 'Trips',
  '/alerts': 'Alerts',
  '/geofences': 'Geofences',
  '/maintenance': 'Maintenance',
  '/firmware': 'Firmware',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const segment = pathname.split('/').filter(Boolean)[0];
  if (segment) {
    return ROUTE_TITLES[`/${segment}`] || segment.charAt(0).toUpperCase() + segment.slice(1);
  }
  return 'Dashboard';
}

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const title = getPageTitle(pathname);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    window.location.href = '/login';
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>

      {/* User menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            'hover:bg-accent text-muted-foreground hover:text-accent-foreground'
          )}
          aria-label="User menu"
          aria-expanded={menuOpen}
          aria-haspopup="true"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-4 w-4" />
          </div>
          <span className="hidden font-medium sm:inline">
            {user?.fullName || user?.username || 'User'}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-border bg-card py-1 shadow-lg">
            <div className="border-b border-border px-3 py-2">
              <p className="text-sm font-medium text-card-foreground truncate">
                {user?.fullName || user?.username}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
