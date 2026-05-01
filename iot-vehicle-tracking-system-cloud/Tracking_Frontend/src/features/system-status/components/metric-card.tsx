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
  unavailableText,
}: {
  title: string;
  value?: number | null;
  icon: ReactNode;
  showProgress?: boolean;
  unit?: string;
  unavailableText?: string | null;
}) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return (
      <StatCard
        title={title}
        value="--"
        subtitle={unavailableText ?? 'Chưa có dữ liệu đo từ xa'}
        icon={icon}
      />
    );
  }

  return (
    <StatCard
      title={title}
      value={unit ? `${value}${unit}` : value}
      icon={icon}
      footer={showProgress ? <StatusProgress value={value} /> : undefined}
    />
  );
};
