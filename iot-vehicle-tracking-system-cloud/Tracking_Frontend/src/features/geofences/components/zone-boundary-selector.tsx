'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zoneServices, type ZoneBoundaryLevel, type ZoneBoundarySelection } from '@/lib/api/zones';
import { cn } from '@/lib/utils';
import { describeBoundarySelections, formatBoundarySelectionLabel } from '@/features/geofences/lib/allowed-zone-form';

const LEVEL_LABELS: Record<ZoneBoundaryLevel, string> = {
  province: 'Tỉnh / thành',
  district: 'Quận / huyện',
  ward: 'Xã / phường',
};

const getSelectionKey = (selection: Pick<ZoneBoundarySelection, 'provider' | 'unitCode'>) =>
  `${selection.provider}:${selection.unitCode}`;

export const ZoneBoundarySelector = ({
  value,
  disabled = false,
  onChange,
}: {
  value: ZoneBoundarySelection[];
  disabled?: boolean;
  onChange: (next: ZoneBoundarySelection[]) => void;
}) => {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<'all' | ZoneBoundaryLevel>('all');
  const deferredQuery = useDeferredValue(query.trim());

  const boundariesQuery = useQuery({
    queryKey: ['zone-boundaries', deferredQuery, level],
    enabled: deferredQuery.length > 0 || level !== 'all',
    queryFn: () =>
      zoneServices.listBoundaries({
        query: deferredQuery || undefined,
        level: level === 'all' ? undefined : level,
        limit: 24,
      }),
  });

  const selectedKeys = useMemo(
    () => new Set(value.map((item) => getSelectionKey(item))),
    [value],
  );

  const addSelection = (selection: ZoneBoundarySelection) => {
    const nextKey = getSelectionKey(selection);
    if (selectedKeys.has(nextKey)) {
      return;
    }

    onChange([...value, selection]);
  };

  const removeSelection = (selection: ZoneBoundarySelection) => {
    const removeKey = getSelectionKey(selection);
    onChange(value.filter((item) => getSelectionKey(item) !== removeKey));
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
      <div className="space-y-1">
        <Label>Địa lý hành chính</Label>
        <p className="text-xs text-muted-foreground">
          Tìm và chọn nhiều tỉnh, huyện, xã rồi hợp thành một vùng duy nhất cho xe.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div className="space-y-1.5">
          <Label htmlFor="zone-boundary-search">Tìm đơn vị</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="zone-boundary-search"
              value={query}
              disabled={disabled}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ví dụ: Hà Nội, Hưng Yên, Long Biên..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Cấp lọc</Label>
          <Select value={level} onValueChange={(next) => setLevel(next as 'all' | ZoneBoundaryLevel)}>
            <SelectTrigger disabled={disabled}>
              <SelectValue placeholder="Tất cả cấp" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả cấp</SelectItem>
              <SelectItem value="province">Tỉnh / thành</SelectItem>
              <SelectItem value="district">Quận / huyện</SelectItem>
              <SelectItem value="ward">Xã / phường</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={value.length > 0 ? 'secondary' : 'outline'}>
            {value.length > 0 ? `${value.length} đơn vị đã chọn` : 'Chưa chọn đơn vị'}
          </Badge>
          <span className="text-xs text-muted-foreground">{describeBoundarySelections(value)}</span>
        </div>

        {value.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {value.map((selection) => (
              <Badge
                key={getSelectionKey(selection)}
                variant="outline"
                className="gap-1.5 rounded-full px-3 py-1"
              >
                <span>{formatBoundarySelectionLabel(selection)}</span>
                {!disabled ? (
                  <button
                    type="button"
                    className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => removeSelection(selection)}
                    aria-label={`Bỏ ${formatBoundarySelectionLabel(selection)}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2 rounded-xl border bg-background p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Kết quả tìm kiếm</p>
          {boundariesQuery.isFetching ? (
            <span className="text-xs text-muted-foreground">Đang tải...</span>
          ) : null}
        </div>

        <ScrollArea className="h-56">
          <div className="space-y-2 pr-3">
            {boundariesQuery.data?.items?.map((item) => {
              const selected = selectedKeys.has(getSelectionKey(item));
              return (
                <button
                  key={getSelectionKey(item)}
                  type="button"
                  disabled={disabled || selected}
                  onClick={() => addSelection(item)}
                  className={cn(
                    'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                    selected ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/40',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{formatBoundarySelectionLabel(item)}</p>
                    <Badge variant="outline">{LEVEL_LABELS[item.level]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.fullName ?? item.unitName}
                  </p>
                </button>
              );
            })}

            {!boundariesQuery.isFetching && (boundariesQuery.data?.items?.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                {deferredQuery.length === 0 && level === 'all'
                  ? 'Nhập tên tỉnh, huyện hoặc xã để bắt đầu tìm.'
                  : 'Không tìm thấy đơn vị phù hợp trong cache địa giới.'}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
