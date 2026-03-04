'use client';

import type { ReactNode } from 'react';
import { StatCard } from '@/components/common/stat-card';
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
    <StatCard
      title={title}
      value={unit ? `${value}${unit}` : value}
      icon={icon}
      footer={showProgress ? <StatusProgress value={value} /> : undefined}
    />
  );
};
