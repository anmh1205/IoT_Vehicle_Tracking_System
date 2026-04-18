'use client';

import { useEffect } from 'react';
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
  drivingIntervalSec: z.number().int().min(10).max(3600),
  parkingIntervalSec: z.number().int().min(30).max(21600),
  parkingHeartbeatSec: z.number().int().min(30).max(21600),
  overspeedKph: z.number().int().min(20).max(180),
  vibrationThreshold: z.number().min(0).max(100),
  offlineAfterSec: z.number().int().min(60).max(86400),
});

type SettingsFormValues = z.infer<typeof schema>;

type ConfigRecord = Record<string, unknown>;

const toRecord = (value: unknown): ConfigRecord | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as ConfigRecord;
};

const pickNumber = (sources: unknown[], fallback: number) => {
  for (const source of sources) {
    const parsed = Number(source);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const NumberInputField = ({
  control,
  name,
  label,
  description,
}: {
  control: ReturnType<typeof useForm<SettingsFormValues>>['control'];
  name: keyof SettingsFormValues;
  label: string;
  description: string;
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input
            type="number"
            inputMode="numeric"
            value={field.value}
            onChange={(event) => field.onChange(Number(event.target.value))}
          />
        </FormControl>
        <p className="text-xs text-muted-foreground">{description}</p>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const SettingsTab = () => {
  const { device, onUpdateNameId, onUpdateSettings, onDeleteDevice } = useDeviceDetailModal();
  const config = toRecord(device?.config);
  const drivingConfig = toRecord(config?.driving);
  const parkingConfig = toRecord(config?.parking);
  const alertConfig = toRecord(config?.alerts);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      deviceName: device?.deviceName ?? '',
      drivingIntervalSec: pickNumber(
        [
          drivingConfig?.trackingIntervalSec,
          drivingConfig?.tracking_interval_s,
          device?.requestInterval,
        ],
        60,
      ),
      parkingIntervalSec: pickNumber(
        [parkingConfig?.trackingIntervalSec, parkingConfig?.tracking_interval_s],
        300,
      ),
      parkingHeartbeatSec: pickNumber(
        [parkingConfig?.heartbeatIntervalSec, parkingConfig?.heartbeat_interval_s],
        900,
      ),
      overspeedKph: pickNumber([alertConfig?.overspeedKph, alertConfig?.overspeed_kph], 80),
      vibrationThreshold: pickNumber(
        [alertConfig?.vibrationThreshold, alertConfig?.vibration_threshold, device?.vibrationThreshold],
        2,
      ),
      offlineAfterSec: pickNumber([alertConfig?.offlineAfterSec, alertConfig?.offline_after_s], 600),
    },
  });

  useEffect(() => {
    form.reset({
      deviceName: device?.deviceName ?? '',
      drivingIntervalSec: pickNumber(
        [
          toRecord(device?.config)?.driving && toRecord(toRecord(device?.config)?.driving)?.trackingIntervalSec,
          toRecord(device?.config)?.driving && toRecord(toRecord(device?.config)?.driving)?.tracking_interval_s,
          device?.requestInterval,
        ],
        60,
      ),
      parkingIntervalSec: pickNumber(
        [
          toRecord(device?.config)?.parking && toRecord(toRecord(device?.config)?.parking)?.trackingIntervalSec,
          toRecord(device?.config)?.parking && toRecord(toRecord(device?.config)?.parking)?.tracking_interval_s,
        ],
        300,
      ),
      parkingHeartbeatSec: pickNumber(
        [
          toRecord(device?.config)?.parking && toRecord(toRecord(device?.config)?.parking)?.heartbeatIntervalSec,
          toRecord(device?.config)?.parking && toRecord(toRecord(device?.config)?.parking)?.heartbeat_interval_s,
        ],
        900,
      ),
      overspeedKph: pickNumber(
        [
          toRecord(device?.config)?.alerts && toRecord(toRecord(device?.config)?.alerts)?.overspeedKph,
          toRecord(device?.config)?.alerts && toRecord(toRecord(device?.config)?.alerts)?.overspeed_kph,
        ],
        80,
      ),
      vibrationThreshold: pickNumber(
        [
          toRecord(device?.config)?.alerts && toRecord(toRecord(device?.config)?.alerts)?.vibrationThreshold,
          toRecord(device?.config)?.alerts && toRecord(toRecord(device?.config)?.alerts)?.vibration_threshold,
          device?.vibrationThreshold,
        ],
        2,
      ),
      offlineAfterSec: pickNumber(
        [
          toRecord(device?.config)?.alerts && toRecord(toRecord(device?.config)?.alerts)?.offlineAfterSec,
          toRecord(device?.config)?.alerts && toRecord(toRecord(device?.config)?.alerts)?.offline_after_s,
        ],
        600,
      ),
    });
  }, [device, form]);

  const onSubmit = async (values: SettingsFormValues) => {
    const nextConfig = {
      ...(config ?? {}),
      driving: {
        ...(drivingConfig ?? {}),
        trackingIntervalSec: values.drivingIntervalSec,
        tracking_interval_s: values.drivingIntervalSec,
      },
      parking: {
        ...(parkingConfig ?? {}),
        trackingIntervalSec: values.parkingIntervalSec,
        tracking_interval_s: values.parkingIntervalSec,
        heartbeatIntervalSec: values.parkingHeartbeatSec,
        heartbeat_interval_s: values.parkingHeartbeatSec,
      },
      alerts: {
        ...(alertConfig ?? {}),
        overspeedKph: values.overspeedKph,
        overspeed_kph: values.overspeedKph,
        vibrationThreshold: values.vibrationThreshold,
        vibration_threshold: values.vibrationThreshold,
        offlineAfterSec: values.offlineAfterSec,
        offline_after_s: values.offlineAfterSec,
      },
    };

    await onUpdateNameId({ deviceName: values.deviceName });
    await onUpdateSettings({
      requestInterval: values.drivingIntervalSec,
      vibrationThreshold: values.vibrationThreshold,
      config: nextConfig,
    });
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Định danh thiết bị</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="deviceName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tên thiết bị</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" spellCheck={false} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Tên hiển thị ở dashboard, modal chi tiết và bản đồ vận hành.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Driving</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <NumberInputField
                control={form.control}
                name="drivingIntervalSec"
                label="Chu kỳ gửi khi đang chạy (giây)"
                description="Lưu vào server và đẩy xuống thiết bị qua command update_config.tracking_interval_s."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parking</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <NumberInputField
                control={form.control}
                name="parkingIntervalSec"
                label="Chu kỳ gửi khi đỗ (giây)"
                description="Lưu trong config parking để phân biệt nhịp chạy và nhịp đỗ."
              />
              <NumberInputField
                control={form.control}
                name="parkingHeartbeatSec"
                label="Heartbeat khi đỗ (giây)"
                description="Dùng để giữ phiên cloud còn sống dù xe đang đứng yên trong thời gian dài."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alert</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <NumberInputField
                control={form.control}
                name="overspeedKph"
                label="Ngưỡng quá tốc độ (km/h)"
                description="Giá trị dùng để cấu hình rule cảnh báo vận tốc phía thiết bị hoặc cloud."
              />
              <NumberInputField
                control={form.control}
                name="vibrationThreshold"
                label="Ngưỡng rung"
                description="Đồng bộ cả cột vibration threshold hiện có và config alerts để giữ logic nhất quán."
              />
              <NumberInputField
                control={form.control}
                name="offlineAfterSec"
                label="Cảnh báo mất tín hiệu sau (giây)"
                description="Mốc để phát hiện thiết bị im lặng quá lâu so với chu kỳ cấu hình."
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </form>
      </Form>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="text-base text-rose-700">Vùng nguy hiểm</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Xóa thiết bị sẽ loại khỏi bảng điều khiển và dừng toàn bộ thao tác quản trị liên quan.
          </p>
          <Button
            variant="destructive"
            disabled={form.formState.isSubmitting}
            onClick={async () => {
              await onDeleteDevice();
            }}
          >
            Xóa thiết bị
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
