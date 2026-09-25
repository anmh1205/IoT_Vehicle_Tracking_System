'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const FleetUtilizationChart = ({
  data,
  isLoading,
}: {
  data: Array<{
    label: string;
    active: number;
    inactive: number;
  }>;
  isLoading?: boolean;
}) => {
  const totalSignals = data.reduce((sum, item) => sum + item.active + item.inactive, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mức độ sẵn sàng kết nối đội xe</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalSignals > 0
            ? 'Ưu tiên hiển thị thiết bị còn tín hiệu so với nhóm đã mất kết nối trong khoảng thời gian đang chọn'
            : 'Chưa có đủ dữ liệu để vẽ mức độ sẵn sàng kết nối đội xe'}
        </p>
      </CardHeader>
      <CardContent className="h-[320px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              title="Chưa có dữ liệu"
              description="Không có dữ liệu sẵn sàng kết nối đội xe cho khoảng thời gian đã chọn"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} />
              <Bar dataKey="active" stackId="a" fill="#22c55e" />
              <Bar dataKey="inactive" stackId="a" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
