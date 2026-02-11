'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { PieStatusPoint } from '@/features/dashboard/hooks/use-dashboard-stats';
export const PieGraph = ({ data, isLoading }: { data: PieStatusPoint[]; isLoading?: boolean }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Device status distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-[320px]">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={92}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
