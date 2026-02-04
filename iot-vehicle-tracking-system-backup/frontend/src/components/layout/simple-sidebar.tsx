'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { navItems } from '@/config/nav-config';
import { getIcon, Icons } from '@/components/icons';
import { useAuthStore } from '@/lib/store/auth-store';
import { IconLogout, IconMenu2, IconSettings, IconX } from '@tabler/icons-react';

interface SidebarContextType {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
}

const SidebarContext = React.createContext<SidebarContextType | null>(null);

export function useSidebarContext() {
    const ctx = React.useContext(SidebarContext);
    if (!ctx) throw new Error('useSidebarContext must be used within SidebarProvider');
    return ctx;
}

export function SimpleSidebarProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(true);
    const toggle = () => setOpen(!open);

    return (
        <SidebarContext.Provider value={{ open, setOpen, toggle }}>
            <div className='flex h-screen w-full overflow-hidden'>{children}</div>
        </SidebarContext.Provider>
    );
}

export function SimpleSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();
    const { open } = useSidebarContext();

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    const isActive = (url: string) => {
        if (url === '/dashboard') return pathname === '/dashboard';
        return pathname === url || pathname.startsWith(url + '/');
    };

    return (
        <aside
            className={cn(
                'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
                open ? 'w-64' : 'w-16'
            )}
        >
            {/* Header */}
            <div className='flex items-center h-16 px-4 border-b border-sidebar-border'>
                <Link href='/dashboard' className='flex items-center gap-2'>
                    <Icons.logo className='size-6 text-primary shrink-0' />
                    {open && <span className='font-bold text-sidebar-foreground'>IoT Tracking</span>}
                </Link>
            </div>

            {/* Navigation */}
            <ScrollArea className='flex-1 py-4'>
                <nav className='px-2 space-y-1'>
                    {navItems.map((item) => {
                        const Icon = getIcon(item.icon || 'logo');
                        const active = isActive(item.url);

                        return (
                            <Link
                                key={item.title}
                                href={item.url}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                    active
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                )}
                            >
                                <Icon className='size-5 shrink-0' />
                                {open && <span>{item.title}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* Footer - User Menu */}
            <div className='border-t border-sidebar-border p-2'>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                'flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors',
                                open ? '' : 'justify-center'
                            )}
                        >
                            <Avatar className='h-8 w-8 shrink-0'>
                                <AvatarFallback className='bg-primary text-primary-foreground text-sm'>
                                    {(user?.fullName || user?.username || 'U').charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            {open && (
                                <div className='flex-1 text-left min-w-0'>
                                    <div className='text-sm font-medium text-sidebar-foreground truncate'>
                                        {user?.fullName || user?.username || 'Admin'}
                                    </div>
                                    <div className='text-xs text-sidebar-foreground/60 truncate'>
                                        {user?.email || 'admin@example.com'}
                                    </div>
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side='top' align='start' className='w-56'>
                        <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                            <IconSettings className='mr-2 h-4 w-4' />
                            Cài đặt
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <IconLogout className='mr-2 h-4 w-4' />
                            Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}

export function SimpleSidebarTrigger({ className }: { className?: string }) {
    const { toggle } = useSidebarContext();
    return (
        <Button variant='ghost' size='icon' onClick={toggle} className={cn('size-8', className)}>
            <IconMenu2 className='size-5' />
        </Button>
    );
}

export function SimpleSidebarContent({ children }: { children: React.ReactNode }) {
    return <main className='flex-1 flex flex-col overflow-hidden'>{children}</main>;
}
