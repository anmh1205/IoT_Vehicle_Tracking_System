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
import { Clock } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const LineChart = dynamic(() => import('react-chartjs-2').then((mod) => mod.Line), { ssr: false });

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

export function DeviceRuntimeChart({
  loading,
  series,
  labels: propLabels,
  range,
  onChangeRange,
  formatHours
}: {
  loading: boolean;
  series: number[];
  labels?: string[];
  range: 7 | 30 | 90;
  onChangeRange: (r: 7 | 30 | 90) => void;
  formatHours: (seconds?: number) => string;
}) {
  const labels = useMemo(() => {
    if (propLabels && propLabels.length > 0) return propLabels;
    const today = new Date();
    const dataLength = series.length > 0 ? series.length : range;
    const generated: string[] = [];
    for (let i = dataLength - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      generated.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return generated;
  }, [propLabels, series, range]);

  const theme = useMemo(() => {
    // Use chart palette instead of --primary (which is grayscale in this theme)
    const primary = resolveCssVarColor('--chart-1', 'rgb(59, 130, 246)');
    const popover = resolveCssVarColor('--popover', 'rgb(255, 255, 255)');
    const popoverFg = resolveCssVarColor('--popover-foreground', 'rgb(17, 24, 39)');
    const border = resolveCssVarColor('--border', 'rgb(229, 231, 235)');
    const foreground = resolveCssVarColor('--foreground', 'rgb(0, 0, 0)');
    return {
      primary,
      primaryFill: withAlpha(primary, 0.14, 'rgba(59, 130, 246, 0.14)'),
      popover,
      popoverFg,
      border,
      borderGrid: withAlpha(border, 0.35, 'rgba(0, 0, 0, 0.06)'),
      foreground
    };
  }, []);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Thời gian hoạt động',
          data: labels.map((_, idx) => series[idx] ?? 0),
          borderColor: theme.primary,
          backgroundColor: theme.primaryFill,
          borderWidth: 4,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    }),
    [labels, series, theme.primary, theme.primaryFill]
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.popover,
          titleColor: theme.popoverFg,
          bodyColor: theme.popoverFg,
          borderColor: theme.border,
          borderWidth: 1,
          callbacks: {
            label: (context: any) => formatHours(context.parsed.y),
            title: (context: any) => `Ngày: ${context[0].label}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: theme.foreground, font: { size: 11 } },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: theme.foreground,
            padding: 10,
            callback: (value: any) => formatHours(value)
          },
          grid: { color: theme.borderGrid, drawBorder: false },
          beginAtZero: true
        }
      }
    }),
    [formatHours, theme.border, theme.borderGrid, theme.foreground, theme.popover, theme.popoverFg]
  );

  return (
    <Card className={`flex h-full flex-1 flex-col border border-primary/20 bg-primary/5 ${DEVICE_SHADOWS.card} ${DEVICE_ANIMATIONS.transition.normal} ${DEVICE_HOVER.card}`}>
      <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <CardTitle className='flex items-center gap-2 text-lg font-bold uppercase'>
          <Clock className='h-5 w-5 text-primary' />
          Biểu đồ thời gian hoạt động
        </CardTitle>
        <div className='flex flex-wrap gap-2'>
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size='sm'
              variant={range === d ? 'default' : 'outline'}
              onClick={() => onChangeRange(d as 7 | 30 | 90)}
              className={DEVICE_ANIMATIONS.transition.normal}
            >
              {d} ngày
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

