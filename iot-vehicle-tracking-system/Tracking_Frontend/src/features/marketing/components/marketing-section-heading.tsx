import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MarketingSectionHeadingProps {
  kicker: string;
  title: string;
  description: string;
  className?: string;
}

export const MarketingSectionHeading = ({
  kicker,
  title,
  description,
  className,
}: MarketingSectionHeadingProps) => {
  return (
    <div className={cn('max-w-2xl space-y-4', className)}>
      <Badge
        variant="outline"
        className="border-teal-400/30 bg-teal-400/10 px-3 py-1 text-[0.7rem] uppercase tracking-[0.28em] text-teal-100"
      >
        {kicker}
      </Badge>
      <div className="space-y-3">
        <h2 className="font-[family:var(--font-display)] text-3xl leading-tight text-white sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
      </div>
    </div>
  );
};
