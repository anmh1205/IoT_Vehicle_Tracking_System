'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
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
  deviceId: z.string().min(1, 'Bắt buộc'),
  deviceName: z.string().min(1, 'Bắt buộc'),
  imei: z.string().optional(),
  requestInterval: z.number().min(10).max(3600),
  vibrationThreshold: z.number().min(0).max(1000),
});
type FormValues = z.infer<typeof schema>;
export const DeviceForm = ({
  open,
  onOpenChange,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: any;
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
      vibrationThreshold: 5,
    },
  });
  useEffect(() => {
    if (!defaultValues) {
      form.reset({
        deviceId: '',
        deviceName: '',
        imei: '',
        requestInterval: 60,
        vibrationThreshold: 5,
      });
      return;
    }
    form.reset({
      deviceId: defaultValues.deviceId ?? '',
      deviceName: defaultValues.deviceName ?? '',
      imei: defaultValues.imei ?? '',
      requestInterval: Number(defaultValues.requestInterval ?? 60),
      vibrationThreshold: Number(defaultValues.vibrationThreshold ?? 5),
    });
  }, [defaultValues, form]);
  const onSubmit = (values: FormValues) => {
    if (defaultValues?.id) {
      updateMutation.mutate(
        { id: defaultValues.id, ...values },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }
    createMutation.mutate(values, { onSuccess: () => onOpenChange(false) });
  };
  const pending = createMutation.isPending || updateMutation.isPending;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? 'Cập nhật thiết bị' : 'Tạo thiết bị'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="deviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device ID</FormLabel>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                name="vibrationThreshold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngưỡng rung</FormLabel>
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
            </div>
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
