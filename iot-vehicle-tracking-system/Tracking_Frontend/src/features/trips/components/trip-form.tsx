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
export const TripForm = ({
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
    tripCode: '',
    vehicleId: '',
    deviceId: '',
    startLocation: '',
    endLocation: '',
  });
  useEffect(() => {
    if (!defaultValues) {
      setForm({ tripCode: '', vehicleId: '', deviceId: '', startLocation: '', endLocation: '' });
      return;
    }
    setForm({
      tripCode: defaultValues.tripCode ?? '',
      vehicleId: defaultValues.vehicleId ?? '',
      deviceId: defaultValues.deviceId ?? '',
      startLocation: defaultValues.startLocation ?? '',
      endLocation: defaultValues.endLocation ?? '',
    });
  }, [defaultValues]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? 'Cập nhật chuyến đi' : 'Thêm chuyến đi'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Mã chuyến đi"
            value={form.tripCode}
            onChange={(e) => setForm((s) => ({ ...s, tripCode: e.target.value }))}
          />
          <Input
            placeholder="Mã phương tiện"
            value={form.vehicleId}
            onChange={(e) => setForm((s) => ({ ...s, vehicleId: e.target.value }))}
          />
          <Input
            placeholder="Mã thiết bị"
            value={form.deviceId}
            onChange={(e) => setForm((s) => ({ ...s, deviceId: e.target.value }))}
          />
          <Input
            placeholder="Điểm bắt đầu"
            value={form.startLocation}
            onChange={(e) => setForm((s) => ({ ...s, startLocation: e.target.value }))}
          />
          <Input
            placeholder="Điểm kết thúc"
            value={form.endLocation}
            onChange={(e) => setForm((s) => ({ ...s, endLocation: e.target.value }))}
          />
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
