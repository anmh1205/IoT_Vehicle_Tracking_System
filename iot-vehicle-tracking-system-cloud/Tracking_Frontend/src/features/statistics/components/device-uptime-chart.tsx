'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
export const DeviceUptimeChart = ({
  data,
  isLoading,
}: {
  data: Array<{
    label: string;
    uptimePercent: number;
  }>;
  isLoading?: boolean;
}) => {
  const averageUptime =
    data.length > 0
      ? data.reduce((sum, item) => sum + item.uptimePercent, 0) / data.length
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Xu hướng uptime thiết bị</CardTitle>
        <p className="text-sm text-muted-foreground">
          {data.length > 0
            ? `Uptime trung bình hiện tại: ${averageUptime.toFixed(1)}%`
            : 'Chưa có đủ dữ liệu uptime thiết bị'}
        </p>
      </CardHeader>
      <CardContent className="h-[320px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              title="Chưa có dữ liệu"
              description="Không có dữ liệu uptime thiết bị cho khoảng thời gian đã chọn"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip cursor={{ stroke: '#86efac', strokeDasharray: '4 4' }} />
              <Area
                type="monotone"
                dataKey="uptimePercent"
                stroke="#15803d"
                strokeWidth={2}
                fill="url(#uptimeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
