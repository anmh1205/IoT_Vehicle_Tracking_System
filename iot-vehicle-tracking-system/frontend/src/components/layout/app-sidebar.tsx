'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { navItems } from '@/config/nav-config';
import { Icons, getIcon } from '@/components/icons';
import { useAuthStore } from '@/lib/store/auth-store';
import { IconChevronRight, IconChevronsUpDown, IconLogout, IconUserCircle } from '@tabler/icons-react';

export default function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    return (
        <Sidebar collapsible='icon'>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip='IoT Vehicle Tracking'>
                            <Link href='/dashboard'>
                                <Icons.logo className='size-5 text-primary' />
                                <span className='font-bold'>IoT Tracking</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className='overflow-x-hidden'>
                <SidebarGroup>
                    <SidebarGroupLabel>Quản lý</SidebarGroupLabel>
                    <SidebarMenu>
                        {navItems.map((item) => {
                            const Icon = getIcon(item.icon || 'logo');
                            const isActive = pathname === item.url || pathname.startsWith(item.url + '/');

                            return item.items && item.items.length > 0 ? (
                                <Collapsible key={item.title} asChild defaultOpen={isActive} className='group/collapsible'>
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                                                <Icon className='size-4' />
                                                <span>{item.title}</span>
                                                <IconChevronRight className='ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                                            </SidebarMenuButton>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {item.items.map((subItem) => (
                                                    <SidebarMenuSubItem key={subItem.title}>
                                                        <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                                                            <Link href={subItem.url}>
                                                                <span>{subItem.title}</span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </SidebarMenuItem>
                                </Collapsible>
                            ) : (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                                        <Link href={item.url}>
                                            <Icon className='size-4' />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size='lg'
                                    className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
                                >
                                    <Avatar className='h-8 w-8 rounded-lg'>
                                        <AvatarFallback className='rounded-lg bg-primary text-primary-foreground'>
                                            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className='grid flex-1 text-left text-sm leading-tight'>
                                        <span className='truncate font-semibold'>{user?.fullName || user?.username}</span>
                                        <span className='truncate text-xs text-muted-foreground'>{user?.email}</span>
                                    </div>
                                    <IconChevronsUpDown className='ml-auto size-4' />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg' side='bottom' align='end' sideOffset={4}>
                                <DropdownMenuLabel className='p-0 font-normal'>
                                    <div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
                                        <Avatar className='h-8 w-8 rounded-lg'>
                                            <AvatarFallback className='rounded-lg bg-primary text-primary-foreground'>
                                                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className='grid flex-1 text-left text-sm leading-tight'>
                                            <span className='truncate font-semibold'>{user?.fullName || user?.username}</span>
                                            <span className='truncate text-xs text-muted-foreground'>{user?.email}</span>
                                        </div>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem onClick={() => router.push('/dashboard/settings/profile')}>
                                        <IconUserCircle className='mr-2 h-4 w-4' />
                                        Hồ sơ
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout}>
                                    <IconLogout className='mr-2 h-4 w-4' />
                                    Đăng xuất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
