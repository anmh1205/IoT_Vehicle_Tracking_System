'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { IconSun, IconMoon, IconBell } from '@tabler/icons-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
    const { theme, setTheme } = useTheme();

    return (
        <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator orientation='vertical' className='mr-2 h-4' />
            <div className='flex-1' />
            <div className='flex items-center gap-2'>
                <Button variant='ghost' size='icon' className='relative'>
                    <IconBell className='size-5' />
                    <span className='absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground flex items-center justify-center'>
                        3
                    </span>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant='ghost' size='icon'>
                            {theme === 'dark' ? <IconSun className='size-5' /> : <IconMoon className='size-5' />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end'>
                        <DropdownMenuItem onClick={() => setTheme('light')}>Sáng</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('dark')}>Tối</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme('system')}>Hệ thống</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
