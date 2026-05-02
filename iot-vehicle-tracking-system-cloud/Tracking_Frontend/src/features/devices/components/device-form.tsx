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
  deviceId: z.string().min(1, 'Báº¯t buá»™c'),
  deviceName: z.string().min(1, 'Báº¯t buá»™c'),
  imei: z.string().optional(),
  requestInterval: z.number().min(10).max(3600),
  imuAccelDeltaThresholdMps2: z.number().min(0).max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

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
    const payload = {
      ...values,
      imuAccelDeltaThresholdMps2: Number(
        defaultValues?.imuAccelDeltaThresholdMps2 ??
          defaultValues?.vibrationThreshold ??
          values.imuAccelDeltaThresholdMps2 ??
          5,
      ),
    };

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
          <DialogTitle>{defaultValues?.id ? 'Cáº­p nháº­t thiáº¿t bá»‹' : 'Táº¡o thiáº¿t bá»‹'}</DialogTitle>
          <DialogDescription>
            Nháº­p thÃ´ng tin thiáº¿t bá»‹ vÃ  chu ká»³ gá»­i Ä‘á»ƒ cáº¥u hÃ¬nh báº£n ghi cÆ¡ báº£n.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="deviceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>MÃ£ thiáº¿t bá»‹</FormLabel>
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
                  <FormLabel>TÃªn thiáº¿t bá»‹</FormLabel>
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
                  <FormLabel>Chu ká»³ gá»­i (giÃ¢y)</FormLabel>
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
                Há»§y
              </Button>
              <Button type="submit" disabled={pending}>
                {defaultValues?.id ? 'LÆ°u' : 'Táº¡o'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
