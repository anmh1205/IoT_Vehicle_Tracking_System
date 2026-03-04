'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
export const MileageForecaster = ({ rows }: { rows: any[] }) => {
  const chartData = rows
    .slice(0, 30)
    .map((item: any, idx: number) => ({
      index: idx + 1,
      mileage: Number(item.mileageThreshold ?? item.nextServiceMileage ?? 0),
    }));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dự báo số km</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="index" />
            <YAxis />
            <Tooltip />
            <Line dataKey="mileage" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
