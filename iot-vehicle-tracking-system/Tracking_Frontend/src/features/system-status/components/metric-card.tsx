'use client';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusProgress } from './status-progress';
export const MetricCard = ({
  title,
  value,
  icon,
  showProgress = false,
  unit = '',
}: {
  title: string;
  value: number;
  icon: ReactNode;
  showProgress?: boolean;
  unit?: string;
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold">
          {value}
          {unit}
        </p>
        {showProgress ? <StatusProgress value={value} /> : null}
      </CardContent>
    </Card>
  );
};
