/**
 * Dashboard Layout - With sidebar and header
 */
'use client';

import { AppSidebar } from '@/components/layout/app-sidebar';
import { Header } from '@/components/layout/header';
import { AuthGuard } from '@/components/layout/auth-guard';
import { useUIStore } from '@/lib/store/ui-store';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <AuthGuard>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className={cn('flex-1 transition-all duration-300', sidebarCollapsed ? 'pl-16' : 'pl-64')}>
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}

