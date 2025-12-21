'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { EmptyState } from './EmptyState';

const LineChart = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), {
  ssr: false,
  loading: () => <div className='h-[320px] w-full rounded-lg bg-muted' />
});

let chartRegistered = false;

const chartJsRegisterOnce = async () => {
  if (chartRegistered) return;
  const {
    Chart: ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  } = await import('chart.js');

  try {
    ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);
  } catch {
    // already registered
  }
  chartRegistered = true;
};

export function RuntimeChart({
  range,
  onRangeChange,
  labels,
  series,
  loading,
  formatHours
}: {
  range: 7 | 30 | 90;
  onRangeChange: (value: 7 | 30 | 90) => void;
  labels: string[];
  series: number[];
  loading: boolean;
  formatHours: (seconds?: number) => string;
}) {
  const [chartReady, setChartReady] = useState(chartRegistered);

  useEffect(() => {
    let mounted = true;
    chartJsRegisterOnce().then(() => {
      if (mounted) setChartReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const renderChart = () => {
    if (!chartReady) {
      return (
        <div className='flex h-[320px] items-center justify-center text-muted-foreground'>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          Đang khởi tạo biểu đồ...
        </div>
      );
    }

    if (loading) {
      return (
        <div className='flex h-[320px] items-center justify-center text-muted-foreground'>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          Đang tải biểu đồ...
        </div>
      );
    }

    if (!series.length) {
      return <EmptyState message='Không có dữ liệu thời gian hoạt động' />;
    }

    const data = {
      labels,
      datasets: [
        {
          label: 'Runtime',
          data: series,
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.12)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: { parsed: { y: number | null } }) => formatHours(context.parsed.y ?? 0)
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: number | string) => formatHours(typeof value === 'number' ? value : parseFloat(value))
          }
        }
      }
    };

    return (
      <div className='h-[320px]'>
        <LineChart data={data} options={options} />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <CardTitle>Thời gian hoạt động</CardTitle>
          <CardDescription>Dữ liệu {range} ngày</CardDescription>
        </div>
        <div className='flex flex-wrap gap-2'>
          {[7, 30, 90].map((d) => (
            <Badge
              key={d}
              variant={range === d ? 'default' : 'outline'}
              className='cursor-pointer'
              onClick={() => onRangeChange(d as 7 | 30 | 90)}
            >
              {d} ngày
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}

