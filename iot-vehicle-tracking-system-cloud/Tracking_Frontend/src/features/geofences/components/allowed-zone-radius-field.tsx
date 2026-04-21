'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

const clampRadiusMeters = (value: number) => {
  if (!Number.isFinite(value) || value < 100) {
    return 100;
  }
  return Math.round(value);
};

const toRadiusKm = (value: number) => clampRadiusMeters(value) / 1000;

export const AllowedZoneRadiusField = ({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) => {
  const radiusKm = toRadiusKm(value);
  const sliderRadiusKm = Math.min(Math.max(radiusKm, 0.1), 5);
  const isBeyondSlider = radiusKm > 5;

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="allowed-zone-radius">Bán kính vùng cho phép</Label>
          <p className="text-xs text-muted-foreground">Thanh kéo tối ưu cho thiết lập nhanh 100 m đến 5 km.</p>
        </div>
        <p className="text-sm font-medium">{radiusKm.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km</p>
      </div>

      <Input
        id="allowed-zone-radius"
        type="number"
        inputMode="decimal"
        min={100}
        step={50}
        value={String(value)}
        disabled={disabled}
        onChange={(event) => onChange(clampRadiusMeters(Number(event.target.value || 100)))}
      />

      <div className="space-y-2">
        <Slider
          min={0.1}
          max={5}
          step={0.1}
          value={[sliderRadiusKm]}
          disabled={disabled}
          onValueChange={(next) => onChange(clampRadiusMeters((next[0] ?? 0.1) * 1000))}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>100 m</span>
          <span>{isBeyondSlider ? '5 km+' : `${sliderRadiusKm.toFixed(1)} km`}</span>
          <span>5 km</span>
        </div>
      </div>
    </div>
  );
};
