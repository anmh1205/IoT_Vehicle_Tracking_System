'use client';

import { useMemo, useState } from 'react';
import {
  useFuelAnalyticsParams,
  useFuelSummary,
  useFuelByVehicle,
  useFuelTrends,
} from '@/features/fuel-analytics/hooks/use-fuel-analytics';
import { FuelDateFilter } from './fuel-date-filter';
import { FuelSummaryCards } from './fuel-summary-cards';
import { FuelByVehicleChart } from './fuel-by-vehicle-chart';
import { FuelTrendsChart } from './fuel-trends-chart';

export const FuelAnalyticsPage = () => {
  const defaultParams = useFuelAnalyticsParams();
  const [from, setFrom] = useState(defaultParams.from);
  const [to, setTo] = useState(defaultParams.to);
  const [interval, setInterval] = useState(defaultParams.interval);

  const params = useMemo(() => ({ from, to, interval }), [from, to, interval]);

  const summaryQuery = useFuelSummary(params);
  const byVehicleQuery = useFuelByVehicle(params);
  const trendsQuery = useFuelTrends(params);

  return (
    <div className="space-y-4">
      <FuelDateFilter
        from={from}
        to={to}
        interval={interval}
        onFromChange={setFrom}
        onToChange={setTo}
        onIntervalChange={setInterval}
      />

      <FuelSummaryCards data={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <FuelByVehicleChart data={byVehicleQuery.data ?? []} isLoading={byVehicleQuery.isLoading} />
        <FuelTrendsChart data={trendsQuery.data ?? []} isLoading={trendsQuery.isLoading} />
      </div>
    </div>
  );
};
