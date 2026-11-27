'use client';

import { Droplets, MapPin, Gauge, DollarSign } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import type { FuelSummary } from '@/features/fuel-analytics/types';
import { formatNumber } from '@/lib/utils/date/format';

interface FuelSummaryCardsProps {
  data: FuelSummary | undefined;
  isLoading: boolean;
}

const formatCost = (cost: number): string => {
  if (cost >= 1_000_000) {
    return `${formatNumber(cost / 1_000_000, { maximumFractionDigits: 1 })}M`;
  }
  if (cost >= 1_000) {
    return `${formatNumber(cost / 1_000, { maximumFractionDigits: 0 })}K`;
  }
  return formatNumber(cost);
};

export const FuelSummaryCards = ({ data, isLoading }: FuelSummaryCardsProps) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Tổng nhiên liệu tiêu thụ"
        value={data ? `${formatNumber(data.totalFuelUsed)} L` : '—'}
        subtitle={data ? `${formatNumber(data.tripCount)} chuyến` : undefined}
        icon={<Droplets className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Tổng quãng đường"
        value={data ? `${formatNumber(data.totalDistance)} km` : '—'}
        icon={<MapPin className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Tiêu thụ trung bình"
        value={data ? `${formatNumber(data.avgConsumption)} L/100 km` : '—'}
        icon={<Gauge className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Chi phí ước tính"
        value={data ? `${formatCost(data.totalCost)} VND` : '—'}
        subtitle={data ? 'Đơn giá ước tính 25.000 VND/L' : undefined}
        icon={<DollarSign className="h-4 w-4" />}
        isLoading={isLoading}
      />
    </div>
  );
};
