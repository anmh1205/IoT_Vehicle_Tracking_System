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
import {
  describeBoundarySelections,
  formatBoundarySelectionDetail,
  formatBoundarySelectionLabel,
  getBoundaryProviderLabel,
} from '@/features/geofences/lib/allowed-zone-form';

const LEVEL_LABELS: Record<ZoneBoundaryLevel, string> = {
  province: 'Tỉnh / thành',
  district: 'Quận / huyện',
  ward: 'Xã / phường',
};

const PROVIDER_BADGE_CLASS_NAMES: Record<string, string> = {
  'gis.vn': 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  'gis.vn-legacy': 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  osm: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300',
};

const getSelectionKey = (selection: Pick<ZoneBoundarySelection, 'provider' | 'unitCode'>) =>
  `${selection.provider}:${selection.unitCode}`;

const getProviderBadgeClassName = (provider: string) =>
  PROVIDER_BADGE_CLASS_NAMES[provider] ?? 'border-muted-foreground/25 text-muted-foreground';

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
    <div className="space-y-3 rounded-lg border bg-muted/10 p-4">
      <div className="space-y-1">
        <Label>Địa lý hành chính</Label>
        <p className="text-xs text-muted-foreground">
          Tìm theo tên có dấu hoặc không dấu. Kết quả ưu tiên ranh giới hiện hành, vẫn giữ bộ trước 01/07/2025 để tra cứu tên cũ.
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
              placeholder="Ví dụ: Hà Nội, Phú Thọ, Vĩnh Phúc, Đà Nẵng..."
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

      <div className="space-y-2 rounded-lg border bg-background p-3">
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
                className="min-h-8 gap-1.5 rounded-full px-3 py-1"
              >
                <span>{formatBoundarySelectionLabel(selection)}</span>
                <span className="text-muted-foreground">-</span>
                <span className="text-muted-foreground">{getBoundaryProviderLabel(selection.provider)}</span>
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

      <div className="space-y-2 rounded-lg border bg-background p-3">
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
              const providerLabel = getBoundaryProviderLabel(item.provider);
              const detail = formatBoundarySelectionDetail(item);
              return (
                <button
                  key={getSelectionKey(item)}
                  type="button"
                  disabled={disabled || selected}
                  onClick={() => addSelection(item)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-3 text-left transition-colors',
                    selected
                      ? 'cursor-not-allowed border-primary/40 bg-primary/5'
                      : 'cursor-pointer hover:bg-muted/40',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 text-sm font-medium">{formatBoundarySelectionLabel(item)}</p>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Badge variant="outline">{LEVEL_LABELS[item.level]}</Badge>
                      {providerLabel ? (
                        <Badge
                          variant="outline"
                          className={cn('border px-2 font-medium', getProviderBadgeClassName(item.provider))}
                        >
                          {providerLabel}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Mã {item.provider}:{item.unitCode}
                  </p>
                </button>
              );
            })}

            {!boundariesQuery.isFetching && (boundariesQuery.data?.items?.length ?? 0) === 0 ? (
              <div className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
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
