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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { GeofenceMapEditor } from './geofence-map-editor';

const EMPTY_FORM = {
  name: '',
  geofenceType: 'circle',
  centerLatitude: '10.762622',
  centerLongitude: '106.660172',
  radiusMeters: '500',
  triggerOn: 'both',
  description: '',
};

export const GeofenceForm = ({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: any;
  onSubmit: (values: any) => void;
  isPending?: boolean;
}) => {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;

    if (!defaultValues) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      name: defaultValues.name ?? '',
      geofenceType: defaultValues.geofenceType ?? 'circle',
      centerLatitude: String(defaultValues.centerLatitude ?? 10.762622),
      centerLongitude: String(defaultValues.centerLongitude ?? 106.660172),
      radiusMeters: String(defaultValues.radiusMeters ?? 500),
      triggerOn: defaultValues.triggerOn ?? 'both',
      description: defaultValues.description ?? '',
    });
  }, [defaultValues, open]);

  const lat = Number(form.centerLatitude || 10.762622);
  const lon = Number(form.centerLongitude || 106.660172);
  const radius = Number(form.radiusMeters || 500);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {defaultValues?.id ? 'Cập nhật vùng giám sát' : 'Thêm vùng giám sát'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="geofence-name">Tên vùng giám sát</Label>
              <Input
                id="geofence-name"
                placeholder="Ví dụ: Kho Bình Tân"
                value={form.name}
                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="geofence-type">Loại vùng</Label>
              <Select
                value={form.geofenceType}
                onValueChange={(value) => setForm((state) => ({ ...state, geofenceType: value }))}
              >
                <SelectTrigger id="geofence-type">
                  <SelectValue placeholder="Chọn loại vùng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">Hình tròn</SelectItem>
                  <SelectItem value="polygon">Đa giác</SelectItem>
                  <SelectItem value="rectangle">Hình chữ nhật</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="geofence-lat">Vĩ độ tâm</Label>
                <Input
                  id="geofence-lat"
                  type="number"
                  inputMode="decimal"
                  value={form.centerLatitude}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, centerLatitude: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geofence-lon">Kinh độ tâm</Label>
                <Input
                  id="geofence-lon"
                  type="number"
                  inputMode="decimal"
                  value={form.centerLongitude}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, centerLongitude: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="geofence-radius">Bán kính (m)</Label>
                <Input
                  id="geofence-radius"
                  type="number"
                  inputMode="numeric"
                  value={form.radiusMeters}
                  onChange={(event) =>
                    setForm((state) => ({ ...state, radiusMeters: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geofence-trigger">Kích hoạt cảnh báo</Label>
                <Select
                  value={form.triggerOn}
                  onValueChange={(value) => setForm((state) => ({ ...state, triggerOn: value }))}
                >
                  <SelectTrigger id="geofence-trigger">
                    <SelectValue placeholder="Chọn kiểu kích hoạt" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enter">Khi đi vào</SelectItem>
                    <SelectItem value="exit">Khi đi ra</SelectItem>
                    <SelectItem value="both">Cả hai chiều</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="geofence-description">Mô tả</Label>
              <Textarea
                id="geofence-description"
                placeholder="Mô tả mục đích vùng giám sát, phạm vi và nhóm vận hành liên quan"
                value={form.description}
                onChange={(event) =>
                  setForm((state) => ({ ...state, description: event.target.value }))
                }
              />
            </div>
          </div>

          <GeofenceMapEditor
            lat={lat}
            lon={lon}
            radius={radius}
            onCenterChange={(latitude, longitude) =>
              setForm((state) => ({
                ...state,
                centerLatitude: latitude.toFixed(6),
                centerLongitude: longitude.toFixed(6),
              }))
            }
          />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={isPending} onClick={() => onSubmit(form)}>
            Lưu vùng giám sát
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
