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
  dateRangeValid: boolean;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onIntervalChange: (value: 'day' | 'week' | 'month') => void;
}

export const FuelDateFilter = ({
  from,
  to,
  interval,
  dateRangeValid,
  onFromChange,
  onToChange,
  onIntervalChange,
}: FuelDateFilterProps) => {
  return (
    <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:flex sm:flex-wrap sm:items-end">
      <div className="space-y-1">
        <Label htmlFor="fuel-from-date" className="text-xs text-muted-foreground">
          Từ ngày
        </Label>
        <Input
          id="fuel-from-date"
          type="date"
          className="w-full sm:w-[170px]"
          value={from}
          max={to || undefined}
          aria-invalid={!dateRangeValid}
          aria-describedby={!dateRangeValid ? 'fuel-date-error' : undefined}
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
          className="w-full sm:w-[170px]"
          value={to}
          min={from || undefined}
          aria-invalid={!dateRangeValid}
          aria-describedby={!dateRangeValid ? 'fuel-date-error' : undefined}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="fuel-interval" className="text-xs text-muted-foreground">Nhóm dữ liệu</Label>
        <Select value={interval} onValueChange={(v) => onIntervalChange(v as typeof interval)}>
          <SelectTrigger id="fuel-interval" className="w-full sm:w-[170px]">
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
