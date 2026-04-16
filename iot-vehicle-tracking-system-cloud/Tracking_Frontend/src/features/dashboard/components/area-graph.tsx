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
  const totalRuntime = data.reduce((sum, item) => sum + item.runtime, 0);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Xu hướng thời gian hoạt động đội xe trong 30 ngày</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalRuntime > 0
            ? `${totalRuntime.toFixed(1)} giờ hoạt động được ghi nhận trong 30 ngày gần nhất`
            : 'Lịch sử runtime đang được làm đầy từ tín hiệu vận hành mới'}
        </p>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="h-[320px] min-w-0">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Chưa có dữ liệu runtime trong giai đoạn này.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="runtimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip cursor={{ stroke: '#93c5fd', strokeDasharray: '4 4' }} />
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
        </div>
      </CardContent>
    </Card>
  );
};
