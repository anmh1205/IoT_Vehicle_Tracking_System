import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export const metadata: Metadata = {
    title: 'IoT Vehicle Tracking - Dashboard',
    description: 'Hệ thống quản lý và theo dõi phương tiện IoT',
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true';

    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset>
                <Header />
                <main className='flex-1 overflow-auto p-6'>{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
