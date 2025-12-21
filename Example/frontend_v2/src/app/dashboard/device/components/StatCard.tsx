'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEVICE_ANIMATIONS, DEVICE_SHADOWS, DEVICE_HOVER } from './device-design-constants';

export function StatCard({
  title,
  value,
  icon,
  gradient
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  gradient?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}) {
  // Background classes based on type (dark mode compatible)
  const getBackgroundClass = () => {
    switch (gradient) {
      case 'primary':
        return 'bg-primary/5 dark:bg-primary/10 border-primary/20 dark:border-primary/30';
      case 'secondary':
        return 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/30 dark:border-indigo-500/40';
      case 'success':
        return 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 dark:border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 dark:border-amber-500/30';
      case 'danger':
        return 'bg-destructive/5 dark:bg-destructive/10 border-destructive/20 dark:border-destructive/30';
      default:
        return 'bg-muted/50 dark:bg-muted/40 border-border dark:border-border/80';
    }
  };

  return (
    <Card
      className={`${getBackgroundClass()} ${DEVICE_SHADOWS.stats} ${DEVICE_ANIMATIONS.transition.normal} ${DEVICE_HOVER.card} group`}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors'>
          {title}
        </CardTitle>
        <div className='opacity-70 group-hover:opacity-100 transition-opacity'>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold tabular-nums text-foreground'>{value}</div>
      </CardContent>
    </Card>
  );
}

