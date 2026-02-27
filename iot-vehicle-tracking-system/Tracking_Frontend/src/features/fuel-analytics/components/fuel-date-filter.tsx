'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FuelDateFilterProps {
  from: string;
  to: string;
  interval: 'day' | 'week' | 'month';
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onIntervalChange: (value: 'day' | 'week' | 'month') => void;
}

export const FuelDateFilter = ({
  from,
  to,
  interval,
  onFromChange,
  onToChange,
  onIntervalChange,
}: FuelDateFilterProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        className="rounded border px-3 py-2 text-sm"
        value={from}
        onChange={(e) => onFromChange(e.target.value)}
      />
      <input
        type="date"
        className="rounded border px-3 py-2 text-sm"
        value={to}
        onChange={(e) => onToChange(e.target.value)}
      />
      <Select value={interval} onValueChange={(v) => onIntervalChange(v as typeof interval)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue placeholder="Khoảng thời gian" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Theo ngày</SelectItem>
          <SelectItem value="week">Theo tuần</SelectItem>
          <SelectItem value="month">Theo tháng</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
