'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SimulatorState } from '@/features/simulator/hooks/use-simulator';
export const DataConfigurator = ({
  state,
  onChange,
}: {
  state: SimulatorState;
  onChange: <TKey extends keyof SimulatorState>(key: TKey, value: SimulatorState[TKey]) => void;
}) => {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Latitude</Label>
          <Input
            type="number"
            value={state.lat}
            onChange={(event) => onChange('lat', Number(event.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label>Longitude</Label>
          <Input
            type="number"
            value={state.lon}
            onChange={(event) => onChange('lon', Number(event.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Speed min (km/h)</Label>
          <Input
            type="number"
            value={state.speedMin}
            onChange={(event) => onChange('speedMin', Number(event.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label>Speed max (km/h)</Label>
          <Input
            type="number"
            value={state.speedMax}
            onChange={(event) => onChange('speedMax', Number(event.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Vibration min</Label>
          <Input
            type="number"
            value={state.vibrationMin}
            onChange={(event) => onChange('vibrationMin', Number(event.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label>Vibration max</Label>
          <Input
            type="number"
            value={state.vibrationMax}
            onChange={(event) => onChange('vibrationMax', Number(event.target.value))}
          />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Battery min (%)</Label>
          <Input
            type="number"
            value={state.batteryMin}
            onChange={(event) => onChange('batteryMin', Number(event.target.value))}
          />
        </div>
        <div className="space-y-1">
          <Label>Battery max (%)</Label>
          <Input
            type="number"
            value={state.batteryMax}
            onChange={(event) => onChange('batteryMax', Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
};
