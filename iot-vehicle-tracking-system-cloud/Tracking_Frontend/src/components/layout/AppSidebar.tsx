'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { navConfig } from '@/config/nav-config';
import { isSameOrDescendantPath } from '@/config/dashboard-route-registry';
import { useFilteredNavItems } from '@/hooks/use-nav';
import { ChevronRight, Car } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLockup } from '@/components/common/brand-mark';
import { NavUser } from '@/components/nav-user';

const isItemActive = (pathname: string, url: string) => isSameOrDescendantPath(pathname, url);

const AppSidebar = () => {
  const pathname = usePathname();
  const mainItems = useFilteredNavItems(navConfig.main);
  const secondaryItems = useFilteredNavItems(navConfig.secondary);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="IVTS">
              <Link href="/dashboard/command">
                <BrandLockup
                  size={34}
                  supportingText="V1"
                  textContainerClassName="group-data-[collapsible=icon]:hidden"
                  nameClassName="text-sm tracking-[0.28em] text-sidebar-foreground"
                  supportingTextClassName="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden"
                  className="gap-2.5"
                  markClassName="shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>Hệ thống</SidebarGroupLabel>
          <SidebarMenu>
            {mainItems.map((item) => {
              const Icon = item.icon || Car;
              const hasActiveChild = item.items?.some((sub) => isItemActive(pathname, sub.url)) ?? false;

              return item.items && item.items.length > 0 ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={hasActiveChild}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title} isActive={hasActiveChild}>
                        {item.icon && <Icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={isItemActive(pathname, subItem.url)}>
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
                  <SidebarMenuButton asChild tooltip={item.title} isActive={isItemActive(pathname, item.url)}>
                    <Link href={item.url}>
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
        {secondaryItems.length > 0 ? (
          <SidebarGroup>
            <SidebarGroupLabel>Quản trị</SidebarGroupLabel>
            <SidebarMenu>
              {secondaryItems.map((item) => {
                const Icon = item.icon || Car;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={isItemActive(pathname, item.url)}>
                      <Link href={item.url}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

export default AppSidebar;
