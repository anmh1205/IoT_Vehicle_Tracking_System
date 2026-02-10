'use client';

import { Checkbox } from '@/components/ui/checkbox';

export function GeofenceVehicleBinder({ vehicles, selected, onChange }: { vehicles: any[]; selected: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="space-y-2 rounded border p-3">
      {vehicles.map((vehicle: any) => {
        const id = String(vehicle.vehicleId ?? vehicle.id);
        const checked = selected.includes(id);
        return (
          <label key={id} className="flex items-center gap-2 text-sm">
            <Checkbox checked={checked} onCheckedChange={(v) => onChange(v ? [...selected, id] : selected.filter((item) => item !== id))} />
            <span>{vehicle.plateNumber ?? vehicle.vehicleId ?? id}</span>
          </label>
        );
      })}
    </div>
  );
}
