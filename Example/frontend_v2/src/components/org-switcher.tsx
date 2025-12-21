'use client';

// NOTE:
// This component previously integrated Clerk Organizations to switch between
// workspaces/teams. Clerk has been disabled in this deployment, and
// multi-tenant organizations are not used. We keep a lightweight placeholder
// component so the layout can render without any Clerk dependencies.

import { GalleryVerticalEnd } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';

export function OrgSwitcher() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size='lg' disabled>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg'>
            <GalleryVerticalEnd className='size-4' />
          </div>
          <div className='grid flex-1 text-left text-sm leading-tight'>
            <span className='truncate font-medium'>IVM26</span>
            <span className='text-muted-foreground truncate text-xs'>
              Workspaces disabled
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
