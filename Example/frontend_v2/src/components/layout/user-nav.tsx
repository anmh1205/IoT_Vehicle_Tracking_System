'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { UserAvatarProfile } from '@/components/user-avatar-profile';
import { ProfileDialog } from '@/components/profile-dialog';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
export function UserNav() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  if (user) {
    return (
      <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <UserAvatarProfile
              user={{
                fullName: user.fullName ?? user.username,
                username: user.username,
                email: user.username ?? ''
              }}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-56'
          align='end'
          sideOffset={10}
          forceMount
        >
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm leading-none font-medium'>
                {user.fullName ?? user.username}
              </p>
              <p className='text-muted-foreground text-xs leading-none'>
                {user.username}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                Hồ sơ
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              logout();
              router.replace('/login');
            }}
          >
              Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
        <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
      </>
    );
  }

  return null;
}
