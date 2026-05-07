'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateDevice } from '../hooks/use-create-device';
import { useUpdateDevice } from '../hooks/use-update-device';

const schema = z.object({
  deviceId: z
    .string()
    .trim()
    .min(3, 'Device ID must be at least 3 characters')
    .max(50, 'Device ID must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Device ID can only contain letters, numbers, dashes, and underscores'),
  deviceName: z.string().trim().min(3, 'Device name must be at least 3 characters').max(100),
  imei: z.string().trim().max(20).optional(),
  requestInterval: z.number().int().min(1).max(3600),
  imuAccelDeltaThresholdMps2: z.number().min(0).max(100).optional(),
});

type FormValues = z.infer<typeof schema>;

export const buildDeviceFormPayload = (values: FormValues, isUpdate = false) => {
  const imei = values.imei?.trim();

  return {
    deviceId: values.deviceId.trim(),
    deviceName: values.deviceName.trim(),
    imei: imei ? imei : isUpdate ? null : undefined,
    requestInterval: values.requestInterval,
    imuAccelDeltaThresholdMps2: Number(values.imuAccelDeltaThresholdMps2 ?? 5),
  };
};

export const DeviceForm = ({
  open,
  onOpenChange,
  defaultValues,
  onCreateSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: any;
  onCreateSuccess?: () => void;
}) => {
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      deviceId: '',
      deviceName: '',
      imei: '',
      requestInterval: 60,
      imuAccelDeltaThresholdMps2: 5,
    },
  });

  useEffect(() => {
    if (!defaultValues) {
      form.reset({
        deviceId: '',
        deviceName: '',
        imei: '',
        requestInterval: 60,
        imuAccelDeltaThresholdMps2: 5,
      });
      return;
    }

    form.reset({
      deviceId: defaultValues.deviceId ?? '',
      deviceName: defaultValues.deviceName ?? '',
      imei: defaultValues.imei ?? '',
      requestInterval: Number(defaultValues.requestInterval ?? 60),
      imuAccelDeltaThresholdMps2: Number(
        defaultValues.imuAccelDeltaThresholdMps2 ?? defaultValues.vibrationThreshold ?? 5,
      ),
    });
  }, [defaultValues, form]);

  const onSubmit = (values: FormValues) => {
    const payload = buildDeviceFormPayload(values, Boolean(defaultValues?.id));

    if (defaultValues?.id) {
      updateMutation.mutate(
        { id: defaultValues.id, ...payload },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        onCreateSuccess?.();
        onOpenChange(false);
      },
    });
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? 'Cập nhật thiết bị' : 'Tạo thiết bị'}</DialogTitle>
          <DialogDescription>
            Nhập thông tin thiết bị và chu kỳ gửi để cấu hình bản ghi cơ bản.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="deviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mã thiết bị</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!!defaultValues?.id} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên thiết bị</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="requestInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chu kỳ gửi (giây)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imuAccelDeltaThresholdMps2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngưỡng IMU (m/s²)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={field.value ?? ''}
                      onChange={(event) =>
                        field.onChange(
                          event.target.value === '' ? undefined : Number(event.target.value),
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imei"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IMEI</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={pending}>
                {defaultValues?.id ? 'Lưu' : 'Tạo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
