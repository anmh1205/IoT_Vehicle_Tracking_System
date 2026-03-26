'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

const EMPTY_FORM = {
  tripCode: '',
  vehicleId: '',
  deviceId: '',
  driverName: '',
  driverPhone: '',
  startLocation: '',
  endLocation: '',
  plannedStart: '',
  plannedEnd: '',
  notes: '',
};

export const TripForm = ({
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
      tripCode: defaultValues.tripCode ?? '',
      vehicleId: defaultValues.vehicleId ?? '',
      deviceId: defaultValues.deviceId ?? '',
      driverName: defaultValues.driverName ?? '',
      driverPhone: defaultValues.driverPhone ?? '',
      startLocation: defaultValues.startLocation ?? '',
      endLocation: defaultValues.endLocation ?? '',
      plannedStart: defaultValues.plannedStart ? defaultValues.plannedStart.slice(0, 16) : '',
      plannedEnd: defaultValues.plannedEnd ? defaultValues.plannedEnd.slice(0, 16) : '',
      notes: defaultValues.notes ?? '',
    });
  }, [defaultValues, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? 'Cập nhật chuyến đi' : 'Thêm chuyến đi'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="trip-code">Mã chuyến đi</Label>
            <Input
              id="trip-code"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Ví dụ: TRIP-HCM-001"
              value={form.tripCode}
              disabled={Boolean(defaultValues?.id)}
              onChange={(event) => setForm((state) => ({ ...state, tripCode: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-vehicle">Mã phương tiện</Label>
            <Input
              id="trip-vehicle"
              placeholder="Nhập mã xe"
              value={form.vehicleId}
              onChange={(event) => setForm((state) => ({ ...state, vehicleId: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-device">Mã thiết bị</Label>
            <Input
              id="trip-device"
              placeholder="Nhập mã thiết bị"
              value={form.deviceId}
              onChange={(event) => setForm((state) => ({ ...state, deviceId: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-driver-name">Tài xế</Label>
            <Input
              id="trip-driver-name"
              autoComplete="name"
              placeholder="Ví dụ: Nguyễn Văn A"
              value={form.driverName}
              onChange={(event) =>
                setForm((state) => ({ ...state, driverName: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-driver-phone">Số điện thoại tài xế</Label>
            <Input
              id="trip-driver-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0901234567"
              value={form.driverPhone}
              onChange={(event) =>
                setForm((state) => ({ ...state, driverPhone: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-planned-start">Giờ bắt đầu dự kiến</Label>
            <Input
              id="trip-planned-start"
              type="datetime-local"
              value={form.plannedStart}
              onChange={(event) =>
                setForm((state) => ({ ...state, plannedStart: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-planned-end">Giờ kết thúc dự kiến</Label>
            <Input
              id="trip-planned-end"
              type="datetime-local"
              value={form.plannedEnd}
              onChange={(event) =>
                setForm((state) => ({ ...state, plannedEnd: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="trip-start-location">Điểm khởi hành</Label>
            <Input
              id="trip-start-location"
              placeholder="Ví dụ: Kho Bình Tân"
              value={form.startLocation}
              onChange={(event) =>
                setForm((state) => ({ ...state, startLocation: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="trip-end-location">Điểm đến</Label>
            <Input
              id="trip-end-location"
              placeholder="Ví dụ: Cảng Cát Lái"
              value={form.endLocation}
              onChange={(event) =>
                setForm((state) => ({ ...state, endLocation: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="trip-notes">Ghi chú điều phối</Label>
            <Textarea
              id="trip-notes"
              placeholder="Lưu ý tuyến đường, cửa giao hàng hoặc ghi chú điều phối"
              value={form.notes}
              onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button disabled={isPending} onClick={() => onSubmit(form)}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu chuyến đi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
