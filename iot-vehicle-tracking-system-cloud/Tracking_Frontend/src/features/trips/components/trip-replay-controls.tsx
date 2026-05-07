'use client';

import { Clock3, Gauge, Pause, Play, RotateCcw, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { formatDateTime } from '@/lib/utils/date/format';

const ReplayMetric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) => (
  <div className="rounded-2xl border bg-background/80 px-3 py-3">
    <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </p>
    <p className="mt-2 text-sm font-semibold">{value}</p>
  </div>
);

export const TripReplayControls = ({
  playing,
  cursor,
  max,
  speed,
  interval,
  currentTimestamp,
  currentSpeed,
  onToggle,
  onReset,
  onCursorChange,
  onSpeedChange,
  onIntervalChange,
}: {
  playing: boolean;
  cursor: number;
  max: number;
  speed: '1x' | '2x' | '4x';
  interval?: '15s' | '1m' | '5m' | '10m';
  currentTimestamp?: string | null;
  currentSpeed?: number | null;
  onToggle: () => void;
  onReset: () => void;
  onCursorChange: (value: number) => void;
  onSpeedChange: (value: '1x' | '2x' | '4x') => void;
  onIntervalChange?: (value: '15s' | '1m' | '5m' | '10m') => void;
}) => {
  const totalPoints = max + 1;
  const currentPoint = Math.min(cursor + 1, totalPoints);
  const progressValue =
    max > 0 ? Math.round((Math.min(cursor, max) / max) * 100) : totalPoints > 0 ? 100 : 0;

  return (
    <div className="space-y-4 rounded-3xl border bg-muted/20 p-4 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-start">
        <div className="space-y-3">
          <Button size="lg" className="w-full min-w-[10rem] justify-start rounded-2xl px-4" onClick={onToggle}>
            {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {playing ? 'Tạm dừng phát lại' : 'Bắt đầu phát lại'}
          </Button>
          <Button variant="outline" className="w-full min-w-[10rem] justify-start rounded-2xl px-4" onClick={onReset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Về đầu hành trình
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {playing ? 'Đang phát lại hành trình' : 'Sẵn sàng phát lại hành trình'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Mốc {currentPoint}/{totalPoints} • {progressValue}% tiến độ
              </p>
            </div>
            <div className="rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              Tốc độ phát {speed}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Điểm đầu</span>
              <span>Điểm hiện tại {currentPoint}</span>
              <span>Điểm cuối</span>
            </div>
            <Slider
              value={[cursor]}
              min={0}
              max={max}
              step={1}
              onValueChange={(value) => onCursorChange(value[0] ?? 0)}
            />
            <Progress value={progressValue} className="h-2" />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ReplayMetric
              icon={Clock3}
              label="Mốc thời gian"
              value={currentTimestamp ? formatDateTime(currentTimestamp) : 'Chưa có dữ liệu'}
            />
            <ReplayMetric
              icon={Gauge}
              label="Tốc độ hiện tại"
              value={
                currentSpeed !== null && currentSpeed !== undefined ? `${Number(currentSpeed)} km/h` : 'Chưa có dữ liệu'
              }
            />
            <ReplayMetric
              icon={TimerReset}
              label="Độ phân giải"
              value={interval ? interval : 'Theo dữ liệu hiện có'}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="space-y-2">
            <Label htmlFor="trip-replay-speed" className="text-xs text-muted-foreground">
              Tốc độ phát
            </Label>
            <Select value={speed} onValueChange={(value) => onSpeedChange(value as '1x' | '2x' | '4x')}>
              <SelectTrigger id="trip-replay-speed" className="w-full min-w-[8rem] rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1x">1x</SelectItem>
                <SelectItem value="2x">2x</SelectItem>
                <SelectItem value="4x">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {onIntervalChange && interval ? (
            <div className="space-y-2">
              <Label htmlFor="trip-replay-interval" className="text-xs text-muted-foreground">
                Lấy mẫu dữ liệu
              </Label>
              <Select
                value={interval}
                onValueChange={(value) => onIntervalChange(value as '15s' | '1m' | '5m' | '10m')}
              >
                <SelectTrigger id="trip-replay-interval" className="w-full min-w-[8rem] rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15s">15 giây</SelectItem>
                  <SelectItem value="1m">1 phút</SelectItem>
                  <SelectItem value="5m">5 phút</SelectItem>
                  <SelectItem value="10m">10 phút</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
