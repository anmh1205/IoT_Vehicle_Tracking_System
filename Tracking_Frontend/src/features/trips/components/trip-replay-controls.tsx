'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TripReplayControls({ playing, cursor, max, speed, onToggle, onReset, onCursorChange, onSpeedChange }: { playing: boolean; cursor: number; max: number; speed: '1x' | '2x' | '4x'; onToggle: () => void; onReset: () => void; onCursorChange: (value: number) => void; onSpeedChange: (value: '1x' | '2x' | '4x') => void }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><Button onClick={onToggle}>{playing ? 'Tạm dừng' : 'Phát'}</Button><Button variant="outline" onClick={onReset}>Đặt lại</Button><Select value={speed} onValueChange={(v) => onSpeedChange(v as '1x' | '2x' | '4x')}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1x">1x</SelectItem><SelectItem value="2x">2x</SelectItem><SelectItem value="4x">4x</SelectItem></SelectContent></Select></div>
      <Slider value={[cursor]} min={0} max={max} step={1} onValueChange={(value) => onCursorChange(value[0] ?? 0)} />
    </div>
  );
}
