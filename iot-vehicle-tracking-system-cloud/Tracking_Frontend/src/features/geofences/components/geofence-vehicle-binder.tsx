'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const GeofenceVehicleBinder = ({
  vehicles,
  selected,
  onChange,
}: {
  vehicles: any[];
  selected: string[];
  onChange: (next: string[]) => void;
}) => {
  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Đã chọn {selected.length} phương tiện</span>
        <span>{vehicles.length} phương tiện khả dụng</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {vehicles.map((vehicle: any) => {
          const id = String(vehicle.vehicleId ?? vehicle.id);
          const checked = selected.includes(id);
          const label = vehicle.plateNumber ?? vehicle.vehicleId ?? id;

          return (
            <label key={id} className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
              <Checkbox
                checked={checked}
                onCheckedChange={(value) =>
                  onChange(value ? [...selected, id] : selected.filter((item) => item !== id))
                }
              />
              <div className="space-y-1">
                <Label className="cursor-pointer text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">
                  {vehicle.brand ?? 'Chưa có hãng'} {vehicle.model ?? ''}
                </p>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
};
