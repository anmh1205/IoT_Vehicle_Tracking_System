'use client';

import { useMemo } from 'react';
import type { NavItem } from '@/types';
import { useRoleAccess } from '@/hooks/use-role-access';

const GROUP_URL = '#';

type AccessKey = keyof ReturnType<typeof useRoleAccess>;

const isRouteAllowed = (item: NavItem, access: ReturnType<typeof useRoleAccess>): boolean => {
  if (!item.url || item.url === GROUP_URL) {
    return true;
  }

  const accessKey = item.permissionKey as AccessKey | undefined;

  if (!accessKey) {
    return true;
  }

  return Boolean(access[accessKey]);
};

const filterNavItems = (items: NavItem[], access: ReturnType<typeof useRoleAccess>): NavItem[] =>
  items
    .map<NavItem | null>((item) => {
      if (!isRouteAllowed(item, access)) {
        return null;
      }
      if (!item.items?.length) {
        return item;
      }
      const children = filterNavItems(item.items, access);
      if (item.url === GROUP_URL && children.length === 0) {
        return null;
      }
      return {
        ...item,
        items: children,
      };
    })
    .filter((item): item is NavItem => item !== null);

export const useFilteredNavItems = (items: NavItem[]) => {
  const access = useRoleAccess();
  return useMemo(() => filterNavItems(items, access), [items, access]);
};
