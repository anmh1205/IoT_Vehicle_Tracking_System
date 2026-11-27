'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { isDateInputRangeValid } from '@/lib/utils/date/range';
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
  const dateRangeValid = isDateInputRangeValid(params);
  const failedQueries = [summaryQuery, byVehicleQuery, trendsQuery].filter((query) => query.isError);

  return (
    <div className="space-y-4">
      <FuelDateFilter
        from={from}
        to={to}
        interval={interval}
        dateRangeValid={dateRangeValid}
        onFromChange={setFrom}
        onToChange={setTo}
        onIntervalChange={setInterval}
      />

      {!dateRangeValid ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription id="fuel-date-error">
            Chọn đủ hai ngày. Ngày bắt đầu phải trước hoặc trùng ngày kết thúc.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {failedQueries.length > 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Không thể tải đầy đủ dữ liệu nhiên liệu</AlertTitle>
              <AlertDescription>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={failedQueries.some((query) => query.isFetching)}
                  onClick={() => {
                    for (const query of failedQueries) void query.refetch();
                  }}
                >
                  Thử lại
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}
          <FuelSummaryCards data={summaryQuery.data} isLoading={summaryQuery.isLoading} />
          <div className="grid gap-4 lg:grid-cols-2">
            <FuelByVehicleChart data={byVehicleQuery.data ?? []} isLoading={byVehicleQuery.isLoading} />
            <FuelTrendsChart data={trendsQuery.data ?? []} isLoading={trendsQuery.isLoading} />
          </div>
        </>
      )}
    </div>
  );
};
