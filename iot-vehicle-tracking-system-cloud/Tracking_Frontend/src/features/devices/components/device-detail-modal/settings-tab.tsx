'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useDeviceDetailModal } from './modal-context';

const schema = z.object({
  deviceName: z.string().min(1),
  requestInterval: z.number().min(10).max(3600),
  vibrationThreshold: z.number().min(0).max(1000),
});

type SettingsFormValues = z.infer<typeof schema>;

export const SettingsTab = () => {
  const { device, onUpdateNameId, onUpdateSettings, onDeleteDevice } = useDeviceDetailModal();
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      deviceName: device?.deviceName ?? '',
      requestInterval: device?.requestInterval ?? 60,
      vibrationThreshold: device?.vibrationThreshold ?? 0,
    },
  });

  useEffect(() => {
    form.reset({
      deviceName: device?.deviceName ?? '',
      requestInterval: device?.requestInterval ?? 60,
      vibrationThreshold: device?.vibrationThreshold ?? 0,
    });
  }, [device, form]);

  const onSubmit = async (values: SettingsFormValues) => {
    await onUpdateNameId({ deviceName: values.deviceName });
    await onUpdateSettings({
      requestInterval: values.requestInterval,
      vibrationThreshold: values.vibrationThreshold,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cài đặt thiết bị</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="deviceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên thiết bị</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" spellCheck={false} />
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
                      <FormLabel>Chu kỳ gửi dữ liệu (giây)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
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
                          inputMode="numeric"
                          value={field.value}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-base text-rose-700">Vùng nguy hiểm</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Xóa thiết bị sẽ loại nó khỏi bảng điều khiển và dừng các luồng thao tác trong giao diện.
          </p>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={async () => {
              setIsDeleting(true);
              try {
                await onDeleteDevice();
              } finally {
                setIsDeleting(false);
              }
            }}
          >
            {isDeleting ? 'Đang xóa...' : 'Xóa thiết bị'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
