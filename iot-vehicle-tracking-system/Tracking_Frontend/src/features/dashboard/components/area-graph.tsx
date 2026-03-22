'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { FleetRuntimePoint } from '@/features/dashboard/hooks/use-dashboard-stats';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const AreaGraph = ({
  data,
  isLoading,
}: {
  data: FleetRuntimePoint[];
  isLoading?: boolean;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Xu hướng thời gian hoạt động đội xe trong 30 ngày</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Chưa có dữ liệu runtime trong giai đoạn này.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="runtimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="runtime"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#runtimeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
