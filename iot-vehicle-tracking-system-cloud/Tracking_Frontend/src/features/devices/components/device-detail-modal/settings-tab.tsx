'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Info } from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';
import { getDeviceConfigSummary } from './device-detail-presenters';
import { useDeviceDetailModal } from './modal-context';
import {
  formatSecondsLabel,
  getFreshnessSeconds,
  getObservedCadenceSeconds,
  getTelemetryFreshnessState,
} from './telemetry-insights';

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
type DeviceState = ReturnType<typeof useDeviceDetailModal>['device'];

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

const resolveDefaultValues = (device: DeviceState): SettingsFormValues => {
  const config = toRecord(device?.config);
  const drivingConfig = toRecord(config?.driving);
  const parkingConfig = toRecord(config?.parking);
  const alertConfig = toRecord(config?.alerts);

  return {
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
  };
};

const FieldHintTooltip = ({ content }: { content: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Thông tin tham số"
      >
        <Info className="h-3 w-3" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" sideOffset={6} className="max-w-[260px] leading-relaxed">
      {content}
    </TooltipContent>
  </Tooltip>
);

const NumberInputField = ({
  control,
  name,
  label,
  hint,
}: {
  control: ReturnType<typeof useForm<SettingsFormValues>>['control'];
  name: keyof SettingsFormValues;
  label: string;
  hint: string;
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => (
      <FormItem className="grid grid-rows-[minmax(3rem,auto)_2.25rem_auto] content-start gap-2">
        <FormLabel className="flex min-h-12 items-start gap-1.5 text-sm leading-4">
          <span>{label}</span>
          <FieldHintTooltip content={hint} />
        </FormLabel>
        <FormControl>
          <Input
            type="number"
            inputMode="numeric"
            className="h-9"
            value={field.value}
            onChange={(event) => field.onChange(Number(event.target.value))}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

const ContextCell = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) => (
  <div className="rounded-2xl border bg-background px-4 py-3">
    <div className="flex items-center gap-1.5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <FieldHintTooltip content={hint} />
    </div>
    <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
  </div>
);

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export const SettingsTab = () => {
  const {
    device,
    latestTrackingRow,
    positionSnapshot,
    trackingRowsAscending,
    onUpdateNameId,
    onUpdateSettings,
    onDeleteDevice,
  } = useDeviceDetailModal();
  const config = toRecord(device?.config);
  const drivingConfig = toRecord(config?.driving);
  const parkingConfig = toRecord(config?.parking);
  const alertConfig = toRecord(config?.alerts);
  const configSummary = getDeviceConfigSummary(device);
  const observedCadence = getObservedCadenceSeconds(trackingRowsAscending);
  const latestTelemetryTimestamp =
    latestTrackingRow?.timestamp ?? positionSnapshot?.timestamp ?? device?.lastSeenAt ?? null;
  const telemetryState = getTelemetryFreshnessState(
    getFreshnessSeconds(latestTelemetryTimestamp),
    configSummary.activeIntervalSec,
  );
  const [payloadPreviewOpen, setPayloadPreviewOpen] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: resolveDefaultValues(device),
  });

  useEffect(() => {
    form.reset(resolveDefaultValues(device));
  }, [device, form]);

  const preview = form.watch();
  const cadenceHint =
    telemetryState === 'healthy'
      ? 'Thiết bị đang gửi gần đúng chu kỳ cấu hình.'
      : telemetryState === 'warning'
        ? 'Nhịp gửi chậm hơn mức mong đợi, cần kiểm tra sóng và nguồn.'
        : telemetryState === 'offline'
          ? 'Thiết bị vượt ngưỡng mất tín hiệu theo cấu hình hiện tại.'
          : 'Chưa có đủ dữ liệu để đánh giá nhịp gửi.';

  const telemetryBadge =
    telemetryState === 'healthy'
      ? { label: 'Đang khớp nhịp', variant: 'secondary' as const }
      : telemetryState === 'warning'
        ? { label: 'Đang lệch nhịp', variant: 'outline' as const }
        : telemetryState === 'offline'
          ? { label: 'Đang mất tín hiệu', variant: 'destructive' as const }
          : { label: 'Chưa đủ dữ liệu', variant: 'outline' as const };

  const commandPreview = JSON.stringify(
    {
      command: 'update_config',
      requestInterval: preview.drivingIntervalSec,
      config: {
        driving: {
          tracking_interval_s: preview.drivingIntervalSec,
        },
        parking: {
          tracking_interval_s: preview.parkingIntervalSec,
          heartbeat_interval_s: preview.parkingHeartbeatSec,
        },
        alerts: {
          overspeed_kph: preview.overspeedKph,
          vibration_threshold: preview.vibrationThreshold,
          offline_after_s: preview.offlineAfterSec,
        },
      },
    },
    null,
    2,
  );

  const isDirty = form.formState.isDirty;
  const isSubmitting = form.formState.isSubmitting;

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
    <Form {...form}>
      <TooltipProvider>
        <form
          className="pb-24 xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="space-y-4">
            <Card>
              <CardHeader className="px-4 pt-3 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">Trạng thái cấu hình</CardTitle>
                  <Badge variant={telemetryBadge.variant}>{telemetryBadge.label}</Badge>
                  <Badge variant="outline">{configSummary.activeProfileLabel}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 px-4 pb-4 md:grid-cols-2">
                <ContextCell
                  label="Firmware"
                  value={device?.firmwareVersion ?? '-'}
                  hint={
                    device?.targetFirmwareVersion
                      ? `Mục tiêu firmware: ${device.targetFirmwareVersion}`
                      : 'Chưa có phiên bản mục tiêu mới.'
                  }
                />
                <ContextCell
                  label="Profile cloud"
                  value={`${configSummary.activeProfileLabel} · ${formatSecondsLabel(configSummary.activeIntervalSec)} / lần`}
                  hint={configSummary.activeProfileHint}
                />
                <ContextCell
                  label="Nhịp gửi thực tế"
                  value={formatSecondsLabel(observedCadence)}
                  hint={cadenceHint}
                />
                <ContextCell
                  label="Bản tin gần nhất"
                  value={formatRelative(latestTelemetryTimestamp)}
                  hint={
                    latestTelemetryTimestamp
                      ? `Thời điểm: ${formatDateTime(latestTelemetryTimestamp)}`
                      : 'Chưa có mốc telemetry hợp lệ.'
                  }
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader className="px-4 pt-3 pb-2">
                  <CardTitle className="text-base">Nhịp gửi và nhận diện</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 px-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="deviceName"
                    render={({ field }) => (
                      <FormItem className="space-y-2 md:col-span-2 xl:col-span-3">
                        <FormLabel className="flex items-center gap-1.5">
                          <span>Tên thiết bị</span>
                          <FieldHintTooltip content="Tên hiển thị ở dashboard, modal thiết bị và bản đồ." />
                        </FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="off" spellCheck={false} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <NumberInputField
                    control={form.control}
                    name="drivingIntervalSec"
                    label="Chu kỳ gửi khi đang chạy (giây)"
                    hint="Đây là nhịp telemetry chính và là requestInterval cloud dùng để điều phối."
                  />
                  <NumberInputField
                    control={form.control}
                    name="parkingIntervalSec"
                    label="Chu kỳ gửi khi đỗ (giây)"
                    hint="Giảm lưu lượng khi đỗ nhưng vẫn đủ dữ liệu cho bản đồ và cảnh báo."
                  />
                  <NumberInputField
                    control={form.control}
                    name="parkingHeartbeatSec"
                    label="Heartbeat khi đỗ (giây)"
                    hint="Giữ thiết bị không bị đánh dấu offline quá sớm khi dừng lâu."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-4 pt-3 pb-2">
                  <CardTitle className="text-base">Ngưỡng cảnh báo</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 px-4 pb-4 md:grid-cols-2 xl:grid-cols-3">
                  <NumberInputField
                    control={form.control}
                    name="overspeedKph"
                    label="Ngưỡng quá tốc độ (km/h)"
                    hint="Giữ cùng một mốc giữa rule cloud, audit UI và dữ liệu firmware."
                  />
                  <NumberInputField
                    control={form.control}
                    name="vibrationThreshold"
                    label="Ngưỡng rung"
                    hint="Dùng chung cho rule cảnh báo và đối chiếu trạng thái chuyển động."
                  />
                  <NumberInputField
                    control={form.control}
                    name="offlineAfterSec"
                    label="Cảnh báo mất tín hiệu sau (giây)"
                    hint="Ngưỡng đánh giá thiết bị im lặng quá lâu so với chu kỳ mong đợi."
                  />
                </CardContent>
              </Card>
            </div>

            <Card className="border-rose-200">
              <CardHeader className="px-4 pt-3 pb-2">
                <CardTitle className="text-base text-rose-700">Vùng nguy hiểm</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Button
                  variant="destructive"
                  disabled={isSubmitting}
                  onClick={async () => {
                    await onDeleteDevice();
                  }}
                >
                  Xóa thiết bị
                </Button>
              </CardContent>
            </Card>
          </div>

          <aside className="hidden xl:block">
            <Card className="sticky top-3">
              <CardHeader className="px-4 pt-3 pb-2">
                <CardTitle className="text-base">Lưu cấu hình</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <SummaryRow label="Tên hiển thị" value={preview.deviceName || '-'} />
                <SummaryRow label="Nhịp chạy" value={`${preview.drivingIntervalSec}s / lần`} />
                <SummaryRow label="Nhịp đỗ" value={`${preview.parkingIntervalSec}s / lần`} />
                <SummaryRow label="Offline sau" value={`${preview.offlineAfterSec}s`} />

                <Collapsible open={payloadPreviewOpen} onOpenChange={setPayloadPreviewOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      Payload `update_config`
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${payloadPreviewOpen ? 'rotate-180' : ''}`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 overflow-hidden rounded-xl border bg-slate-950 text-slate-50">
                    <pre className="max-h-60 overflow-auto px-3 py-3 text-xs leading-6 text-slate-100">
                      <code>{commandPreview}</code>
                    </pre>
                  </CollapsibleContent>
                </Collapsible>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!isDirty || isSubmitting}
                    onClick={() => form.reset()}
                  >
                    Hoàn tác
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="sticky bottom-0 z-20 mt-4 rounded-xl border bg-background/95 px-3 py-2 shadow-lg backdrop-blur xl:hidden">
            <p className="text-xs text-muted-foreground">
              Nhịp chạy {preview.drivingIntervalSec}s · Nhịp đỗ {preview.parkingIntervalSec}s · Offline{' '}
              {preview.offlineAfterSec}s
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!isDirty || isSubmitting}
                onClick={() => form.reset()}
              >
                Hoàn tác
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu cấu hình'}
              </Button>
            </div>
          </div>
        </form>
      </TooltipProvider>
    </Form>
  );
};
