'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatNumber } from '@/lib/utils/date/format';

export const MileageForecaster = ({ rows }: { rows: any[] }) => {
  const chartData = useMemo(
    () =>
      rows
        .filter((item: any) => Number(item.nextServiceMileage ?? item.mileageAtService ?? 0) > 0)
        .sort(
          (a: any, b: any) =>
            Number(a.nextServiceMileage ?? a.mileageAtService ?? 0) -
            Number(b.nextServiceMileage ?? b.mileageAtService ?? 0),
        )
        .slice(0, 12)
        .map((item: any) => ({
          label: item.vehicleId,
          mileage: Number(item.nextServiceMileage ?? item.mileageAtService ?? 0),
          nextDate: item.nextServiceDate ?? item.scheduledDate ?? item.createdAt,
        })),
    [rows],
  );

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dự báo số km</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Chưa có dữ liệu mốc km để dựng dự báo.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dự báo số km</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Các phương tiện sắp chạm mốc bảo trì được sắp theo ngưỡng km gần nhất.
        </p>
        <ResponsiveContainer width="100%" height={320} minWidth={0}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip
              formatter={(value) => [`${formatNumber(Number(value ?? 0))} km`, 'Mốc bảo trì']}
              labelFormatter={(label, payload) => {
                const nextDate = payload?.[0]?.payload?.nextDate;
                return `${label} · ${formatDateTime(nextDate, 'dd/MM/yyyy')}`;
              }}
            />
            <Bar dataKey="mileage" fill="#0f766e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
