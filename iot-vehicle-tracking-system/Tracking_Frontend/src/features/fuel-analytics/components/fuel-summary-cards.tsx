'use client';

import { Droplets, MapPin, Gauge, DollarSign } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import type { FuelSummary } from '@/features/fuel-analytics/types';

interface FuelSummaryCardsProps {
  data: FuelSummary | undefined;
  isLoading: boolean;
}

const formatCost = (cost: number): string => {
  if (cost >= 1_000_000) {
    return `${(cost / 1_000_000).toFixed(1)}M`;
  }
  if (cost >= 1_000) {
    return `${(cost / 1_000).toFixed(0)}K`;
  }
  return cost.toLocaleString('vi-VN');
};

export const FuelSummaryCards = ({ data, isLoading }: FuelSummaryCardsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Tổng nhiên liệu tiêu thụ"
        value={`${data?.totalFuelUsed?.toLocaleString('vi-VN') ?? 0} L`}
        subtitle={`${data?.tripCount ?? 0} chuyến`}
        icon={<Droplets className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Tổng quãng đường"
        value={`${data?.totalDistance?.toLocaleString('vi-VN') ?? 0} km`}
        icon={<MapPin className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Tiêu thụ trung bình"
        value={`${data?.avgConsumption ?? 0} L/100km`}
        icon={<Gauge className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Chi phí ước tính"
        value={`${formatCost(data?.totalCost ?? 0)} VND`}
        subtitle="@25.000 VND/L"
        icon={<DollarSign className="h-4 w-4" />}
        isLoading={isLoading}
      />
    </div>
  );
};
