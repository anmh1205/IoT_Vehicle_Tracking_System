'use client';
import { Progress } from '@/components/ui/progress';
import { formatNumber } from '@/lib/utils/date/format';
export const StatusProgress = ({ value }: { value: number }) => {
  const normalized = Math.max(0, Math.min(100, Number(value ?? 0)));
  return (
    <div className="space-y-1">
      <Progress value={normalized} />
      <p className="text-xs text-muted-foreground">{formatNumber(normalized)}%</p>
    </div>
  );
};
