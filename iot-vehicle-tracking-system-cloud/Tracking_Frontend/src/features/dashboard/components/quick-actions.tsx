'use client';

import Link from 'next/link';
import { Bell, Download, Map, Settings, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ACTIONS = [
  { href: '/dashboard/map', label: 'Mở bản đồ', icon: Map },
  { href: '/dashboard/devices', label: 'Quản lý thiết bị', icon: Truck },
  { href: '/dashboard/alerts', label: 'Xem cảnh báo', icon: Bell },
  { href: '/dashboard/exports', label: 'Xuất dữ liệu', icon: Download },
  { href: '/dashboard/settings', label: 'Cài đặt hệ thống', icon: Settings },
];

export const QuickActions = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Thao tác nhanh</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Button key={action.href} asChild variant="outline" className="justify-start">
              <Link href={action.href}>
                <Icon className="mr-2 h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
};
