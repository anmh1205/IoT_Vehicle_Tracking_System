'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { FuelTrend } from '@/features/fuel-analytics/types';

interface FuelTrendsChartProps {
  data: FuelTrend[];
  isLoading: boolean;
}

const formatDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
};

export const FuelTrendsChart = ({ data, isLoading }: FuelTrendsChartProps) => {
  const chartData = useMemo(
    () =>
      data.map((t) => ({
        label: formatDateLabel(t.date),
        fuelUsed: t.fuelUsed,
        consumption: t.consumption,
      })),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fuel Consumption Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No trend data available for selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis yAxisId="left" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" fontSize={12} />
              <Tooltip />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="fuelUsed"
                name="Fuel Used (L)"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.15}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="consumption"
                name="L/100km"
                stroke="#f59e0b"
                fill="#f59e0b"
                fillOpacity={0.1}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
