'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { getDashboardBreadcrumbs } from '@/config/dashboard-route-registry';

export const useBreadcrumbs = () => {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => getDashboardBreadcrumbs(pathname), [pathname]);

  return breadcrumbs;
};
