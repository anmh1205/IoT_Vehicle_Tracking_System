'use client';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
export const DeviceSearch = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search device..."
        className="pl-8"
      />
    </div>
  );
};
