'use client';
import Link from 'next/link';
import { Bell, Download, Map, Plus, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
const ACTIONS = [
  { href: '/dashboard/map', label: 'Mở bản đồ', icon: Map },
  { href: '/dashboard/devices', label: 'Thêm thiết bị', icon: Plus },
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
      <CardContent className="flex flex-wrap gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Button key={action.href} asChild variant="outline" size="sm">
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
