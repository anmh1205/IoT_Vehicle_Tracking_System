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
export const VehicleForm = ({
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
    vehicleId: '',
    plateNumber: '',
    brand: '',
    model: '',
    year: '',
  });
  useEffect(() => {
    if (!defaultValues) {
      setForm({ vehicleId: '', plateNumber: '', brand: '', model: '', year: '' });
      return;
    }
    setForm({
      vehicleId: defaultValues.vehicleId ?? '',
      plateNumber: defaultValues.plateNumber ?? '',
      brand: defaultValues.brand ?? defaultValues.make ?? '',
      model: defaultValues.model ?? '',
      year: defaultValues.year ? String(defaultValues.year) : '',
    });
  }, [defaultValues]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {defaultValues?.id ? 'Cập nhật phương tiện' : 'Thêm phương tiện'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Mã xe"
            value={form.vehicleId}
            onChange={(e) => setForm((s) => ({ ...s, vehicleId: e.target.value }))}
            disabled={!!defaultValues?.id}
          />
          <Input
            placeholder="Biển số"
            value={form.plateNumber}
            onChange={(e) => setForm((s) => ({ ...s, plateNumber: e.target.value }))}
          />
          <Input
            placeholder="Hãng xe"
            value={form.brand}
            onChange={(e) => setForm((s) => ({ ...s, brand: e.target.value }))}
          />
          <Input
            placeholder="Dòng xe"
            value={form.model}
            onChange={(e) => setForm((s) => ({ ...s, model: e.target.value }))}
          />
          <Input
            placeholder="Năm sản xuất"
            value={form.year}
            onChange={(e) => setForm((s) => ({ ...s, year: e.target.value }))}
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
