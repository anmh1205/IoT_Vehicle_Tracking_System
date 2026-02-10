import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'orange' | 'gray';
  subtitle?: string;
}

const COLOR_MAP = {
  blue: 'border-l-blue-500',
  green: 'border-l-emerald-500',
  red: 'border-l-red-500',
  orange: 'border-l-amber-500',
  gray: 'border-l-zinc-400',
} as const;

const ICON_COLOR_MAP = {
  blue: 'text-blue-500',
  green: 'text-emerald-500',
  red: 'text-red-500',
  orange: 'text-amber-500',
  gray: 'text-zinc-400',
} as const;

export function StatCard({ title, value, icon, color = 'blue', subtitle }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-5 border-l-4 transition-shadow hover:shadow-md',
        COLOR_MAP[color]
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn('shrink-0', ICON_COLOR_MAP[color])}>{icon}</div>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-card-foreground">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
