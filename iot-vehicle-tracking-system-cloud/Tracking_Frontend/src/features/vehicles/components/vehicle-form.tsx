'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

type VehicleFormValues = {
  vehicleId: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: string;
  customerId: string;
};

const EMPTY_FORM: VehicleFormValues = {
  vehicleId: '',
  plateNumber: '',
  brand: '',
  model: '',
  year: '',
  customerId: 'none',
};

export const VehicleForm = ({
  open,
  onOpenChange,
  defaultValues,
  customers,
  formError,
  fieldErrors,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  defaultValues?: any;
  customers?: Array<{ id: number; name?: string | null; customerCode?: string | null }>;
  formError?: string | null;
  fieldErrors?: Record<string, string>;
  onSubmit: (values: VehicleFormValues) => void;
}) => {
  const [form, setForm] = useState<VehicleFormValues>(EMPTY_FORM);

  useEffect(() => {
    if (!defaultValues) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      vehicleId: defaultValues.vehicleId ?? '',
      plateNumber: defaultValues.plateNumber ?? '',
      brand: defaultValues.brand ?? defaultValues.make ?? '',
      model: defaultValues.model ?? '',
      year: defaultValues.year ? String(defaultValues.year) : '',
      customerId: defaultValues.customerId ? String(defaultValues.customerId) : 'none',
    });
  }, [defaultValues]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? 'Cập nhật phương tiện' : 'Thêm phương tiện'}</DialogTitle>
          <DialogDescription>
            Nhập thông tin nhận diện cơ bản và gán đúng khách hàng sở hữu cho phương tiện.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="vehicle-id">Mã xe</Label>
            <Input
              id="vehicle-id"
              placeholder="Ví dụ: XE-102"
              value={form.vehicleId}
              autoCapitalize="characters"
              spellCheck={false}
              className={fieldErrors?.vehicleId ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, vehicleId: event.target.value }))}
              disabled={Boolean(defaultValues?.id)}
            />
            {fieldErrors?.vehicleId ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.vehicleId}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="plate-number">Biển số</Label>
            <Input
              id="plate-number"
              placeholder="Ví dụ: 51H-123.45"
              value={form.plateNumber}
              autoCapitalize="characters"
              spellCheck={false}
              className={fieldErrors?.plateNumber ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, plateNumber: event.target.value }))}
            />
            {fieldErrors?.plateNumber ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.plateNumber}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle-year">Năm sản xuất</Label>
            <Input
              id="vehicle-year"
              type="number"
              inputMode="numeric"
              placeholder="Ví dụ: 2024"
              value={form.year}
              className={fieldErrors?.year ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, year: event.target.value }))}
            />
            {fieldErrors?.year ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.year}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle-brand">Hãng xe</Label>
            <Input
              id="vehicle-brand"
              placeholder="Ví dụ: Hyundai"
              value={form.brand}
              autoComplete="organization"
              className={fieldErrors?.brand ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, brand: event.target.value }))}
            />
            {fieldErrors?.brand ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.brand}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle-model">Dòng xe</Label>
            <Input
              id="vehicle-model"
              placeholder="Ví dụ: Porter"
              value={form.model}
              className={fieldErrors?.model ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, model: event.target.value }))}
            />
            {fieldErrors?.model ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.model}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle-customer">Khách hàng sở hữu</Label>
            <Select
              value={form.customerId}
              onValueChange={(value) => setForm((state) => ({ ...state, customerId: value }))}
            >
              <SelectTrigger
                id="vehicle-customer"
                className={fieldErrors?.customerId ? 'border-destructive focus-visible:ring-destructive' : undefined}
              >
                <SelectValue placeholder="Chọn khách hàng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Chưa gán khách hàng</SelectItem>
                {(customers ?? []).map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {customer.name ?? customer.customerCode ?? `Khách hàng #${customer.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors?.customerId ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.customerId}
              </p>
            ) : null}
          </div>
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
