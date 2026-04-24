'use client';

import { ChevronDown, LogOut, UserCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { authServices } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { UserAvatar } from '@/components/common/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export const NavUser = () => {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const displayName = user?.fullName || user?.username || 'Người dùng';
  const email = user?.email || user?.username || '';

  const handleLogout = async () => {
    try {
      await authServices.logout();
    } catch {
      // Ignore and continue clearing client-side auth.
    } finally {
      clearAuth();
      router.replace('/login?reason=signed-out');
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserAvatar className="h-8 w-8 rounded-lg" src={user?.avatarUrl} name={displayName} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{email}</span>
              </div>
              <ChevronDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <UserAvatar className="h-8 w-8 rounded-lg" src={user?.avatarUrl} name={displayName} />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserCircle className="mr-2 h-4 w-4" />
                Hồ sơ
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
