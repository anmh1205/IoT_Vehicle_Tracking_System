'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="fuel-from-date" className="text-xs text-muted-foreground">
          Từ ngày
        </Label>
        <Input
          id="fuel-from-date"
          type="date"
          className="w-[170px]"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fuel-to-date" className="text-xs text-muted-foreground">
          Đến ngày
        </Label>
        <Input
          id="fuel-to-date"
          type="date"
          className="w-[170px]"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Khoảng thời gian</Label>
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
    </div>
  );
};
