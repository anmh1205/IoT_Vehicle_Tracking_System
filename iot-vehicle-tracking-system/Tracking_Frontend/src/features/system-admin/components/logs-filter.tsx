'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LOG_LEVELS } from '@/features/system-admin/constants';
import type { LogsFilterState } from '@/features/system-admin/types';

export const LogsFilter = ({
  value,
  onChange,
}: {
  value: LogsFilterState;
  onChange: (next: LogsFilterState) => void;
}) => {
  return (
    <div className="grid gap-3 rounded-xl border border-border/60 bg-card/70 p-3 md:grid-cols-2 xl:grid-cols-[180px_minmax(0,1fr)_220px_220px]">
      <div className="space-y-1">
        <Label>Mức log</Label>
        <Select
          value={value.level}
          onValueChange={(level) =>
            onChange({ ...value, page: 1, level: level as LogsFilterState['level'] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Mức log" />
          </SelectTrigger>
          <SelectContent>
            {LOG_LEVELS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="system-log-search">Tìm kiếm</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="system-log-search"
            value={value.search}
            onChange={(event) => onChange({ ...value, page: 1, search: event.target.value })}
            placeholder="Tìm theo nguồn, lỗi hoặc từ khóa"
            className="pl-8"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="system-log-from">Từ thời điểm</Label>
        <Input
          id="system-log-from"
          type="datetime-local"
          value={value.from ?? ''}
          onChange={(event) => onChange({ ...value, page: 1, from: event.target.value || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="system-log-to">Đến thời điểm</Label>
        <Input
          id="system-log-to"
          type="datetime-local"
          value={value.to ?? ''}
          onChange={(event) => onChange({ ...value, page: 1, to: event.target.value || undefined })}
        />
      </div>
    </div>
  );
};
