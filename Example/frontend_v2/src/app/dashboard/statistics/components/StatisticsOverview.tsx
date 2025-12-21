'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Clock, TrendingUp, BarChart3, Calendar } from 'lucide-react';

interface StatisticsOverviewProps {
  loading: boolean;
  stats: {
    total: number;
    avg: number;
    max: number;
    min: number;
    count: number;
  };
  range: '7d' | '30d' | '90d' | 'custom';
  formatHours: (h: number) => string;
}

export function StatisticsOverview({ loading, stats, range, formatHours }: StatisticsOverviewProps) {
  const rangeLabel = range === '7d' ? '7 ngày' : range === '30d' ? '30 ngày' : range === '90d' ? '90 ngày' : 'Tùy chỉnh';

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
      <Card className='bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-primary/10 dark:bg-primary/20 rounded-xl'>
              <Clock className='w-6 h-6 text-primary' />
            </div>
            <div className='text-right'>
              <p className='text-sm font-medium text-muted-foreground'>Tổng thời gian</p>
              <p className='text-2xl font-bold text-foreground'>{loading ? '—' : formatHours(stats.total * 3600)}</p>
            </div>
          </div>
          <div className='flex items-center text-sm text-primary'>
            <TrendingUp className='w-4 h-4 mr-2' />
            Trong {rangeLabel}
          </div>
        </CardContent>
      </Card>

      <Card className='bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/30'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl'>
              <BarChart3 className='w-6 h-6 text-emerald-600 dark:text-emerald-400' />
            </div>
            <div className='text-right'>
              <p className='text-sm font-medium text-muted-foreground'>Trung bình</p>
              <p className='text-2xl font-bold text-foreground'>{loading ? '—' : formatHours(stats.avg * 3600)}</p>
            </div>
          </div>
          <div className='flex items-center text-sm text-emerald-600 dark:text-emerald-400'>
            <TrendingUp className='w-4 h-4 mr-2' />
            Mỗi phiên
          </div>
        </CardContent>
      </Card>

      <Card className='bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 dark:border-amber-500/30'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl'>
              <TrendingUp className='w-6 h-6 text-amber-600 dark:text-amber-400' />
            </div>
            <div className='text-right'>
              <p className='text-sm font-medium text-muted-foreground'>Tối đa</p>
              <p className='text-2xl font-bold text-foreground'>{loading ? '—' : formatHours(stats.max * 3600)}</p>
            </div>
          </div>
          <div className='flex items-center text-sm text-amber-600 dark:text-amber-400'>
            <TrendingUp className='w-4 h-4 mr-2' />
            Phiên dài nhất
          </div>
        </CardContent>
      </Card>

      <Card className='bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/30 dark:border-indigo-500/40'>
        <CardContent className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-3 bg-indigo-500/15 dark:bg-indigo-500/25 rounded-xl'>
              <Calendar className='w-6 h-6 text-indigo-600 dark:text-indigo-400' />
            </div>
            <div className='text-right'>
              <p className='text-sm font-medium text-muted-foreground'>Số phiên</p>
              <p className='text-2xl font-bold text-foreground'>{loading ? '—' : stats.count}</p>
            </div>
          </div>
          <div className='flex items-center text-sm text-indigo-600 dark:text-indigo-400'>
            <Calendar className='w-4 h-4 mr-2' />
            Tổng cộng
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

