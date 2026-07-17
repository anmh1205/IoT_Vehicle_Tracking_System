import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils/date/format';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  isLoading?: boolean;
  valueClassName?: string;
  className?: string;
  footer?: React.ReactNode;
}

const STAT_CARD_CLASS = 'h-full min-h-[148px]';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  isLoading,
  valueClassName,
  className,
  footer,
}: StatCardProps) => {
  const hasSplitMeta = Boolean(trend && subtitle);

  const normalizedValue = typeof value === 'number' ? formatNumber(value) : value;
  const isLongValue = typeof normalizedValue === 'string' && normalizedValue.length > 24;

  if (isLoading) {
    return (
      <Card className={cn(STAT_CARD_CLASS, className)}>
        <CardHeader className="flex min-h-[44px] flex-row items-start justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(STAT_CARD_CLASS, className)}>
      <CardHeader className="flex min-h-[44px] flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="min-w-0 break-words text-sm font-medium leading-5 text-muted-foreground">
          {title}
        </CardTitle>
        {icon ? <div className="shrink-0 text-muted-foreground">{icon}</div> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2">
        <div
          className={cn(
            'break-words text-2xl font-bold leading-7 tracking-tight tabular-nums',
            isLongValue && 'text-lg font-semibold leading-6',
            valueClassName,
          )}
        >
          {normalizedValue}
        </div>
        {(subtitle || trend) && (
          <div
            className={cn(
              'grid min-h-[36px] gap-2 text-xs text-muted-foreground',
              hasSplitMeta && '2xl:grid-cols-[auto_minmax(10rem,1fr)] 2xl:items-start',
            )}
          >
            {trend ? (
              <span
                className={cn(
                  'inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-4',
                  trend.positive
                    ? 'bg-emerald-500/10 text-emerald-700'
                    : 'bg-rose-500/10 text-rose-700',
                )}
              >
                {trend.value}
              </span>
            ) : null}
            {subtitle ? (
              <p className="break-words leading-5 text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        )}
        {footer ? <div className="break-words text-xs text-muted-foreground">{footer}</div> : null}
      </CardContent>
    </Card>
  );
};
