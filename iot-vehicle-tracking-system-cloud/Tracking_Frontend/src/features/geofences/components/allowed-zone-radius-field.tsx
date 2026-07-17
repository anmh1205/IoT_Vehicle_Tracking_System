'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  ALLOWED_ZONE_MAX_RADIUS_METERS,
  ALLOWED_ZONE_MIN_RADIUS_METERS,
  clampAllowedZoneRadiusMeters,
} from '@/features/geofences/lib/allowed-zone-form';
const MIN_RADIUS_KM = ALLOWED_ZONE_MIN_RADIUS_METERS / 1000;
const MAX_RADIUS_KM = ALLOWED_ZONE_MAX_RADIUS_METERS / 1000;

const toRadiusKm = (value: number) => clampAllowedZoneRadiusMeters(value) / 1000;

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
  const sliderRadiusKm = Math.min(Math.max(radiusKm, MIN_RADIUS_KM), MAX_RADIUS_KM);

  return (
    <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="allowed-zone-radius">Bán kính vùng</Label>
          <p className="text-xs text-muted-foreground">
            Thiết lập trong khoảng 1 km đến 2.000 km.
          </p>
        </div>
        <p className="text-sm font-medium">
          {radiusKm.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km
        </p>
      </div>

      <Input
        id="allowed-zone-radius"
        type="number"
        inputMode="decimal"
        min={MIN_RADIUS_KM}
        max={MAX_RADIUS_KM}
        step={0.1}
        value={Number.isInteger(radiusKm) ? String(radiusKm) : radiusKm.toFixed(1)}
        disabled={disabled}
        onChange={(event) =>
          onChange(clampAllowedZoneRadiusMeters(Number(event.target.value || MIN_RADIUS_KM) * 1000))
        }
      />

      <div className="space-y-2">
        <Slider
          min={MIN_RADIUS_KM}
          max={MAX_RADIUS_KM}
          step={1}
          value={[sliderRadiusKm]}
          disabled={disabled}
          onValueChange={(next) =>
            onChange(clampAllowedZoneRadiusMeters((next[0] ?? MIN_RADIUS_KM) * 1000))
          }
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>1 km</span>
          <span>{sliderRadiusKm.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km</span>
          <span>2.000 km</span>
        </div>
      </div>
    </div>
  );
};
