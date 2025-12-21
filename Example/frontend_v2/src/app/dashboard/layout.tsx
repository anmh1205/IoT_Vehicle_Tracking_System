import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import AuthGuard from '@/components/layout/auth-guard';

export const metadata: Metadata = {
  title: 'IVM26 Dashboard',
  description: 'Giám sát rung động IVM26 (Shadcn/Tailwind v4)'
};

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Persisting the sidebar state in the cookie.
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';
  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <AuthGuard>
            <Header />
            {/* page main content */}
            {children}
            {/* page main content ends */}
          </AuthGuard>
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}
