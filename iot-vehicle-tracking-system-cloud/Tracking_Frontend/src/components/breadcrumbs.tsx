'use client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useBreadcrumbs } from '@/hooks/use-breadcrumbs';
import { Slash } from 'lucide-react';
import Link from 'next/link';
import { Fragment } from 'react';
export const Breadcrumbs = () => {
  const items = useBreadcrumbs();
  if (items.length === 0) return null;
  return (
    <Breadcrumb aria-label="Đường dẫn hiện tại" className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {items.map((item, index) => (
          <Fragment key={item.link}>
            {index !== items.length - 1 && (
              <BreadcrumbItem className="hidden shrink-0 lg:block">
                <BreadcrumbLink asChild><Link href={item.link}>{item.title}</Link></BreadcrumbLink>
              </BreadcrumbItem>
            )}
            {index < items.length - 1 && (
              <BreadcrumbSeparator className="hidden shrink-0 lg:block">
                <Slash />
              </BreadcrumbSeparator>
            )}
            {index === items.length - 1 && (
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate" title={item.title}>{item.title}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
