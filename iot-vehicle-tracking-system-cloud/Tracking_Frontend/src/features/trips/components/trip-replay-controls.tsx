'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const TripReplayControls = ({
  playing,
  cursor,
  max,
  speed,
  onToggle,
  onReset,
  onCursorChange,
  onSpeedChange,
}: {
  playing: boolean;
  cursor: number;
  max: number;
  speed: '1x' | '2x' | '4x';
  onToggle: () => void;
  onReset: () => void;
  onCursorChange: (value: number) => void;
  onSpeedChange: (value: '1x' | '2x' | '4x') => void;
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button onClick={onToggle}>{playing ? 'Tạm dừng' : 'Phát lại'}</Button>
        <Button variant="outline" onClick={onReset}>
          Về đầu hành trình
        </Button>
        <div className="flex items-center gap-2 sm:ml-auto">
          <Label htmlFor="trip-replay-speed" className="text-xs text-muted-foreground">
            Tốc độ
          </Label>
          <Select value={speed} onValueChange={(value) => onSpeedChange(value as '1x' | '2x' | '4x')}>
            <SelectTrigger id="trip-replay-speed" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1x">1x</SelectItem>
              <SelectItem value="2x">2x</SelectItem>
              <SelectItem value="4x">4x</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Điểm {Math.min(cursor + 1, max + 1)}</span>
          <span>Tổng {max + 1} điểm</span>
        </div>
        <Slider
          value={[cursor]}
          min={0}
          max={max}
          step={1}
          onValueChange={(value) => onCursorChange(value[0] ?? 0)}
        />
      </div>
    </div>
  );
};
