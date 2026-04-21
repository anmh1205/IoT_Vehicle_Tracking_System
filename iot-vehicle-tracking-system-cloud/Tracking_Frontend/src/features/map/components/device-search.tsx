'use client';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
export const DeviceSearch = ({
  value,
  onChange,
  className,
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
}) => {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm thiết bị..."
        className={cn('pl-8', inputClassName)}
      />
    </div>
  );
};
