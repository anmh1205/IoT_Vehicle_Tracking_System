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
  const hasMeaningfulData = data.some((item) => item.active > 0 || item.inactive > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mức sử dụng đội xe</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 || !hasMeaningfulData ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              title="Chưa có dữ liệu"
              description="Không có dữ liệu mức sử dụng đội xe cho khoảng thời gian đã chọn"
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="active" stackId="a" fill="#22c55e" />
              <Bar dataKey="inactive" stackId="a" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
