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
  if (isLoading) {
    return (
      <Card className={cn('min-h-[132px]', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  const normalizedValue = typeof value === 'number' ? formatNumber(value) : value;

  return (
    <Card className={cn('min-h-[132px]', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold tracking-tight tabular-nums', valueClassName)}>
          {normalizedValue}
        </div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {trend && (
              <span className={cn(trend.positive ? 'text-emerald-600' : 'text-rose-600')}>
                {trend.value}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
        {footer ? <div className="mt-2 text-xs text-muted-foreground">{footer}</div> : null}
      </CardContent>
    </Card>
  );
};
