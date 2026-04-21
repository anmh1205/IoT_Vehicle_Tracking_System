'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSystemMetrics } from '@/features/system-admin/hooks/use-system-admin';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { LineChartView } from './chart-views/line-chart-view';
import { TableView } from './chart-views/table-view';

type ViewMode = 'chart' | 'table';

const TIME_OPTIONS = [
  { value: '1h', label: '1 giờ gần nhất' },
  { value: '6h', label: '6 giờ gần nhất' },
  { value: '24h', label: '24 giờ gần nhất' },
  { value: '7d', label: '7 ngày gần nhất' },
];

const QUERY_PRESETS = [
  { label: 'Sẵn sàng', query: 'up' },
  { label: 'CPU', query: 'process_cpu_seconds_total' },
  { label: 'Bộ nhớ', query: 'process_resident_memory_bytes' },
];

export const MetricsExplorer = () => {
  const [draftQuery, setDraftQuery] = useState('up');
  const [draftTime, setDraftTime] = useState('1h');
  const [submittedQuery, setSubmittedQuery] = useState('up');
  const [submittedTime, setSubmittedTime] = useState('1h');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');

  const submitQuery = (query: string, time = draftTime) => {
    setDraftQuery(query);
    setSubmittedQuery(query);
    setSubmittedTime(time);
  };

  const metricsQuery = useSystemMetrics({
    query: submittedQuery,
    time: submittedTime,
    enabled: submittedQuery.trim().length > 0,
  });

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Khám phá chỉ số</CardTitle>
          <p className="text-sm text-muted-foreground">
            Chạy nhanh các truy vấn PromQL phổ biến hoặc nhập truy vấn riêng để kiểm tra vận hành.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUERY_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                variant={draftQuery === preset.query ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => submitQuery(preset.query)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Textarea
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Nhập truy vấn PromQL"
            className="min-h-[110px]"
          />

          <div className="grid gap-3 lg:grid-cols-[220px_auto_auto]">
            <Select value={draftTime} onValueChange={setDraftTime}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => {
                submitQuery(draftQuery, draftTime);
              }}
              disabled={!draftQuery.trim()}
            >
              <Play className="mr-2 h-4 w-4" />
              Chạy
            </Button>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'chart' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('chart')}
              >
                Biểu đồ
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Bảng
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {metricsQuery.isFetching
              ? 'Đang tải dữ liệu chỉ số...'
              : metricsQuery.isError
                ? getApiErrorMessage(metricsQuery.error, 'Truy vấn metrics thất bại.')
                : `Truy vấn hiện tại: ${submittedQuery} · ${submittedTime} · ${metricsQuery.series.length} series`}
          </div>
        </CardContent>
      </Card>

      {viewMode === 'chart' ? (
        <LineChartView series={metricsQuery.series} />
      ) : (
        <TableView series={metricsQuery.series} />
      )}
    </div>
  );
};
