import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ThemeSelector } from '@/components/theme-selector';
import { ModeToggle } from '@/components/mode-toggle';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NotificationBell } from '@/components/layout/notification-bell';
import { ConnectionBanner } from '@/components/common/connection-banner';
export const metadata: Metadata = {
  title: 'Bảng điều khiển | Theo dõi phương tiện IoT',
  description: 'Bảng điều khiển hệ thống giám sát phương tiện',
};
const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';
  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <ConnectionBanner />
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-1.5 px-3 sm:gap-2 sm:px-4">
              <NotificationBell />
              <div className="hidden lg:block">
                <ThemeSelector />
              </div>
              <ModeToggle />
            </div>
          </header>
          <div id="main-content" className="flex-1">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
};
export default DashboardLayout;
