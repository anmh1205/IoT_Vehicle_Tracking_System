'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DeviceActivityPoint } from '@/features/dashboard/hooks/use-dashboard-stats';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export const BarGraph = ({
  data,
  isLoading,
}: {
  data: DeviceActivityPoint[];
  isLoading?: boolean;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hoạt động thiết bị trong 7 ngày</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Chưa có dữ liệu hoạt động để hiển thị.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="running" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="idle" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="offline" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
