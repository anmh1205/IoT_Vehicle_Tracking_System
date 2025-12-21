'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DEVICE_ANIMATIONS, DEVICE_SHADOWS, DEVICE_HOVER } from './device-design-constants';
import { Activity } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const LineChart = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), { ssr: false });

type VibrationPeriod = 'sample' | 'minute' | 'hour' | 'day';

function resolveCssVarColor(varName: string, fallback: string) {
  // NOTE: Canvas (Chart.js) can't use CSS variables directly; resolve to computed rgb() string.
  if (typeof window === 'undefined' || typeof document === 'undefined') return fallback;
  if (!document.body) return fallback;

  const el = document.createElement('span');
  el.style.color = `var(${varName})`;
  el.style.position = 'absolute';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  el.style.top = '-9999px';
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  el.remove();

  return computed || fallback;
}

function withAlpha(color: string, alpha: number, fallback: string) {
  // Converts rgb()/rgba() to rgba(r,g,b,a). If parsing fails, returns fallback.
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (!m) return fallback;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

export function DeviceVibrationChart({
  loading,
  series,
  labels: propLabels,
  period,
  onChangePeriod,
  threshold
}: {
  loading: boolean;
  series: number[];
  labels?: string[];
  period: VibrationPeriod;
  onChangePeriod: (p: VibrationPeriod) => void;
  threshold?: number | null;
}) {
  const labels = useMemo(() => {
    if (propLabels && propLabels.length > 0) {
      if (period === 'sample') return propLabels.map((_, i) => `Mẫu ${i + 1}`);
      return propLabels;
    }
    const defaults: Record<VibrationPeriod, number> = { sample: 50, minute: 60, hour: 24, day: 30 };
    const len = series.length > 0 ? series.length : defaults[period];
    return Array.from({ length: len }, (_, i) => {
      if (period === 'minute') return `${i + 1} phút`;
      if (period === 'hour') return `${i + 1} giờ`;
      if (period === 'day') return `Ngày ${i + 1}`;
      return `Mẫu ${i + 1}`;
    });
  }, [propLabels, series, period]);

  const theme = useMemo(() => {
    const destructive = resolveCssVarColor('--destructive', 'rgb(239, 68, 68)');
    const thresholdLine = resolveCssVarColor('--chart-2', 'rgb(34, 197, 94)');
    const popover = resolveCssVarColor('--popover', 'rgb(255, 255, 255)');
    const popoverFg = resolveCssVarColor('--popover-foreground', 'rgb(17, 24, 39)');
    const border = resolveCssVarColor('--border', 'rgb(229, 231, 235)');
    const foreground = resolveCssVarColor('--foreground', 'rgb(0, 0, 0)');
    return {
      destructive,
      destructiveFill: withAlpha(destructive, 0.12, 'rgba(239, 68, 68, 0.12)'),
      thresholdLine,
      popover,
      popoverFg,
      border,
      borderGrid: withAlpha(border, 0.35, 'rgba(0, 0, 0, 0.06)'),
      foreground
    };
  }, []);

  const chartData = useMemo(() => {
    const vibrationDataset = {
      label: 'Mức rung',
      data: labels.map((_, idx) => series[idx] ?? 0),
      borderColor: theme.destructive,
      backgroundColor: theme.destructiveFill,
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5
    };
    const thresholdDataset =
      threshold != null
        ? [
            {
              label: 'Ngưỡng rung',
              data: Array(labels.length).fill(threshold),
              borderColor: theme.thresholdLine,
              backgroundColor: withAlpha(theme.thresholdLine, 0, 'rgba(34, 197, 94, 0)'),
              borderWidth: 2,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 0
            }
          ]
        : [];
    return {
      labels,
      datasets: [vibrationDataset, ...thresholdDataset]
    };
  }, [labels, series, theme.destructive, theme.destructiveFill, theme.thresholdLine, threshold]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top' as const,
          labels: { color: theme.foreground }
        },
        tooltip: {
          backgroundColor: theme.popover,
          titleColor: theme.popoverFg,
          bodyColor: theme.popoverFg,
          borderColor: theme.border,
          borderWidth: 1,
          callbacks: {
            label: (context: any) => `${context.dataset.label}: ${context.parsed.y?.toFixed(2)} mm/s`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: theme.foreground, font: { size: 11 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: theme.foreground, padding: 10 },
          grid: { color: theme.borderGrid, drawBorder: false },
          beginAtZero: true
        }
      }
    }),
    [theme.border, theme.borderGrid, theme.foreground, theme.popover, theme.popoverFg]
  );

  const periodLabel: Record<VibrationPeriod, string> = {
    sample: 'Mẫu',
    minute: 'Phút',
    hour: 'Giờ',
    day: 'Ngày'
  };

  return (
    <Card className={`flex h-full flex-1 flex-col border border-border bg-card ${DEVICE_SHADOWS.card} ${DEVICE_ANIMATIONS.transition.normal} ${DEVICE_HOVER.card}`}>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <CardTitle className='flex items-center gap-2 text-lg font-bold uppercase'>
          <Activity className='h-5 w-5 text-destructive' />
          Biểu đồ rung
        </CardTitle>
        <div className='flex flex-wrap gap-2'>
          {(['sample', 'minute', 'hour', 'day'] as const).map((p) => (
            <Button
              key={p}
              size='sm'
              variant={period === p ? 'default' : 'outline'}
              onClick={() => onChangePeriod(p)}
              className={DEVICE_ANIMATIONS.transition.normal}
            >
              {periodLabel[p]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className='flex-1 min-h-0'>
        <div className='h-full'>
          {loading ? (
            <div className='flex h-full items-center justify-center text-foreground'>Đang tải biểu đồ...</div>
          ) : (
            <LineChart data={chartData} options={chartOptions} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

