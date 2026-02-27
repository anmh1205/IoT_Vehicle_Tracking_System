'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { VehicleFuelData } from '@/features/fuel-analytics/types';

interface FuelByVehicleChartProps {
  data: VehicleFuelData[];
  isLoading: boolean;
}

export const FuelByVehicleChart = ({ data, isLoading }: FuelByVehicleChartProps) => {
  const chartData = useMemo(
    () =>
      data.map((v) => ({
        name: v.plateNumber || v.vehicleId,
        fuel: v.totalFuel,
        distance: v.totalDistance,
      })),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nhiên liệu theo phương tiện</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
Không có dữ liệu nhiên liệu cho khoảng thời gian đã chọn
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis yAxisId="left" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="fuel" name="Nhiên liệu (L)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="distance" name="Quãng đường (km)" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
