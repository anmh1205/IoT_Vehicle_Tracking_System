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
import { LineChartView } from './chart-views/line-chart-view';
import { TableView } from './chart-views/table-view';
type ViewMode = 'chart' | 'table';
const TIME_OPTIONS = [
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
];
export const MetricsExplorer = () => {
  const [draftQuery, setDraftQuery] = useState('up');
  const [draftTime, setDraftTime] = useState('1h');
  const [submittedQuery, setSubmittedQuery] = useState('up');
  const [submittedTime, setSubmittedTime] = useState('1h');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const metricsQuery = useSystemMetrics({
    query: submittedQuery,
    time: submittedTime,
    enabled: submittedQuery.trim().length > 0,
  });
  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle>Metrics explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder="Enter PromQL query"
            className="min-h-[90px]"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Select value={draftTime} onValueChange={setDraftTime}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Time range" />
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
                setSubmittedQuery(draftQuery);
                setSubmittedTime(draftTime);
              }}
              disabled={!draftQuery.trim()}
            >
              <Play className="mr-2 h-4 w-4" />
              Execute
            </Button>

            <div className="ml-auto flex gap-2">
              <Button
                variant={viewMode === 'chart' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('chart')}
              >
                Chart
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                Table
              </Button>
            </div>
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
