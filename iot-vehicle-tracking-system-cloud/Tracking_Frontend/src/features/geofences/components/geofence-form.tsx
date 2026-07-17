'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { GeofenceMapEditor } from './geofence-map-editor';

const DEFAULT_LATITUDE = '10.762622';
const DEFAULT_LONGITUDE = '106.660172';

const EMPTY_FORM = {
  name: '',
  geofenceType: 'circle',
  centerLatitude: DEFAULT_LATITUDE,
  centerLongitude: DEFAULT_LONGITUDE,
  radiusKm: '1',
  triggerOn: 'both',
  description: '',
};

const clampRadiusKm = (value: number) => {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  return value;
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
      centerLatitude: String(defaultValues.centerLatitude ?? DEFAULT_LATITUDE),
      centerLongitude: String(defaultValues.centerLongitude ?? DEFAULT_LONGITUDE),
      radiusKm: String(
        Math.max(Number(defaultValues.radiusMeters ?? 1000) / 1000, 1).toFixed(
          Number(defaultValues.radiusMeters ?? 1000) % 1000 === 0 ? 0 : 1,
        ),
      ),
      triggerOn: defaultValues.triggerOn ?? 'both',
      description: defaultValues.description ?? '',
    });
  }, [defaultValues, open]);

  const lat = Number(form.centerLatitude || DEFAULT_LATITUDE);
  const lon = Number(form.centerLongitude || DEFAULT_LONGITUDE);
  const radiusKm = clampRadiusKm(Number(form.radiusKm || 1));
  const radiusMeters = Math.round(radiusKm * 1000);
  const sliderRadiusKm = Math.min(Math.max(radiusKm, 1), 500);
  const isBeyondSlider = radiusKm > 500;
  const radiusLabel =
    radiusKm >= 10 ? `${radiusKm.toLocaleString('vi-VN')} km` : `${radiusKm} km`;

  const helperText = useMemo(() => {
    if (form.geofenceType === 'circle') {
      return 'Chạm trực tiếp lên bản đồ để đặt tâm. Thanh kéo tối ưu cho bán kính 1-500 km, còn ô nhập tay vẫn nhận giá trị lớn hơn.';
    }
    return 'Loại vùng hiện tại vẫn dùng tâm bản đồ để định hướng vị trí. Nếu cần bán kính lớn hơn 500 km, hãy nhập trực tiếp ở ô số.';
  }, [form.geofenceType]);

  const isQuickEditSupported = form.geofenceType === 'circle';
  const typeLabel = form.geofenceType === 'circle' ? 'Hình tròn bán kính' : 'Hình học nâng cao';

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
            <div className="rounded-2xl border bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
              {helperText}
            </div>

            <div className="space-y-2">
              <Label htmlFor="geofence-name">Tên vùng giám sát</Label>
              <Input
                id="geofence-name"
                placeholder="Ví dụ: Kho Bình Tân"
                value={form.name}
                onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
              />
            </div>

            {!isQuickEditSupported ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Vùng đa giác hoặc hình chữ nhật hiện chưa có trình chỉnh sửa an toàn trong hộp thoại
                này. Hãy dùng trang vùng để xem thông tin, tránh làm sai hình học đang lưu.
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Loại vùng</Label>
                <div className="rounded-xl border bg-muted/10 px-3 py-3">
                  <p className="text-sm font-medium">{typeLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Luồng tạo và chỉnh nhanh ở đây chỉ hỗ trợ vùng hình tròn để đồng bộ đúng với
                    bản đồ và logic bán kính theo km.
                  </p>
                </div>
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

            <div className="space-y-3 rounded-2xl border bg-muted/10 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label htmlFor="geofence-radius">Bán kính ưu tiên (km)</Label>
                  <p className="text-xs text-muted-foreground">
                    Ưu tiên nhập km để đồng bộ với thông tin vận hành.
                  </p>
                </div>
                <p className="text-sm font-medium">{radiusLabel}</p>
              </div>

              <Input
                id="geofence-radius"
                type="number"
                inputMode="decimal"
                min={1}
                value={form.radiusKm}
                onChange={(event) => setForm((state) => ({ ...state, radiusKm: event.target.value }))}
              />

              <div className="space-y-2">
                <Slider
                  value={[sliderRadiusKm]}
                  min={1}
                  max={500}
                  step={1}
                  onValueChange={(value) =>
                    setForm((state) => ({ ...state, radiusKm: String(value[0] ?? 1) }))
                  }
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>1 km</span>
                  <span>{isBeyondSlider ? '500 km+' : `${sliderRadiusKm} km`}</span>
                  <span>500 km</span>
                </div>
              </div>

              {isBeyondSlider ? (
                <p className="text-xs text-muted-foreground">
                  Giá trị hiện tại vượt vùng kéo tối ưu. Hệ thống vẫn lưu bán kính {radiusLabel}.
                </p>
              ) : null}
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
            radius={radiusMeters}
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
          <Button
            disabled={isPending || !isQuickEditSupported}
            onClick={() =>
              onSubmit({
                ...form,
                radiusMeters: String(radiusMeters),
              })
            }
          >
            {isQuickEditSupported ? 'Lưu vùng giám sát' : 'Chỉ hỗ trợ vùng hình tròn'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
