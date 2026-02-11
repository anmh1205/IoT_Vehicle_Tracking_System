'use client';
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GeofenceMapEditor } from './geofence-map-editor';
export const GeofenceForm = ({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: any;
  onSubmit: (values: any) => void;
}) => {
  const [form, setForm] = useState({
    name: '',
    geofenceType: 'circle',
    centerLatitude: '10.762622',
    centerLongitude: '106.660172',
    radiusMeters: '500',
  });
  useEffect(() => {
    if (!defaultValues) return;
    setForm({
      name: defaultValues.name ?? '',
      geofenceType: defaultValues.geofenceType ?? 'circle',
      centerLatitude: String(defaultValues.centerLatitude ?? 10.762622),
      centerLongitude: String(defaultValues.centerLongitude ?? 106.660172),
      radiusMeters: String(defaultValues.radiusMeters ?? 500),
    });
  }, [defaultValues]);
  const lat = Number(form.centerLatitude || 10.762622);
  const lon = Number(form.centerLongitude || 106.660172);
  const radius = Number(form.radiusMeters || 500);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {defaultValues?.id ? 'Cập nhật vùng giám sát' : 'Thêm vùng giám sát'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Input
              placeholder="Tên vùng giám sát"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
            <Select
              value={form.geofenceType}
              onValueChange={(v) => setForm((s) => ({ ...s, geofenceType: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">Hình tròn</SelectItem>
                <SelectItem value="polygon">Đa giác</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Lat"
              value={form.centerLatitude}
              onChange={(e) => setForm((s) => ({ ...s, centerLatitude: e.target.value }))}
            />
            <Input
              placeholder="Lon"
              value={form.centerLongitude}
              onChange={(e) => setForm((s) => ({ ...s, centerLongitude: e.target.value }))}
            />
            <Input
              placeholder="Bán kính (m)"
              value={form.radiusMeters}
              onChange={(e) => setForm((s) => ({ ...s, radiusMeters: e.target.value }))}
            />
          </div>
          <GeofenceMapEditor lat={lat} lon={lon} radius={radius} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => onSubmit(form)}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
