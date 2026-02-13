'use client';
import { Pause, Play, Square, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
const INTERVAL_OPTIONS = [1, 5, 10, 30, 60];
const DURATION_OPTIONS = [1, 5, 15, 30, 60];
export const SimulationControls = ({
  intervalSec,
  durationMin,
  running,
  paused,
  statusLabel,
  onIntervalChange,
  onDurationChange,
  onStart,
  onPause,
  onResume,
  onStop,
}: {
  intervalSec: number;
  durationMin: number;
  running: boolean;
  paused: boolean;
  statusLabel: string;
  onIntervalChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) => {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Interval</p>
          <Select
            value={String(intervalSec)}
            onValueChange={(value) => onIntervalChange(Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Duration</p>
          <Select
            value={String(durationMin)}
            onValueChange={(value) => onDurationChange(Number(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onStart} disabled={running}>
          <Play className="mr-2 h-4 w-4" />
          Start
        </Button>
        {running && !paused ? (
          <Button variant="outline" onClick={onPause}>
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        ) : null}
        {running && paused ? (
          <Button variant="outline" onClick={onResume}>
            <TimerReset className="mr-2 h-4 w-4" />
            Resume
          </Button>
        ) : null}
        <Button variant="destructive" onClick={onStop} disabled={!running}>
          <Square className="mr-2 h-4 w-4" />
          Stop
        </Button>
        <span className="text-xs text-muted-foreground">Status: {statusLabel}</span>
      </div>
    </div>
  );
};
