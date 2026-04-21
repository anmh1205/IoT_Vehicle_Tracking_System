import { z } from 'zod';
import type {
  UpsertVehicleAllowedZonePayload,
  VehicleAllowedZone,
  VehicleAllowedZoneAlertMode,
  VehicleAllowedZoneCenterSource,
  VehicleAllowedZonePreviewCenter,
} from '@/lib/api/geofences';

export const allowedZoneAlertModeOptions: Array<{
  value: VehicleAllowedZoneAlertMode;
  label: string;
  description: string;
}> = [
  {
    value: 'transition_only',
    label: 'Chỉ cảnh báo khi vượt ra',
    description: 'Giảm nhiễu, phù hợp cho hầu hết phương tiện vận hành bình thường.',
  },
  {
    value: 'transition_and_recovery',
    label: 'Cảnh báo khi ra và quay lại',
    description: 'Hữu ích khi cần biết cả lúc vượt vùng và lúc phương tiện đã trở về.',
  },
  {
    value: 'periodic_while_outside',
    label: 'Lặp lại khi còn ở ngoài vùng',
    description: 'Dành cho các xe cần theo dõi chặt, chấp nhận nhiều thông báo hơn.',
  },
  {
    value: 'silent',
    label: 'Im lặng',
    description: 'Vẫn đánh giá trạng thái nhưng không phát cảnh báo realtime.',
  },
];

const allowedZoneCenterSourceValues = ['vehicle_position', 'map_pick'] as const satisfies readonly VehicleAllowedZoneCenterSource[];
const allowedZoneAlertModeValues = [
  'transition_only',
  'transition_and_recovery',
  'periodic_while_outside',
  'silent',
] as const satisfies readonly VehicleAllowedZoneAlertMode[];

export const allowedZoneFormSchema = z
  .object({
    centerSource: z.enum(allowedZoneCenterSourceValues),
    centerLatitude: z.number().min(-90).max(90).nullable(),
    centerLongitude: z.number().min(-180).max(180).nullable(),
    radiusMeters: z.number().int().min(100).max(1_000_000),
    alertMode: z.enum(allowedZoneAlertModeValues),
    cooldownSec: z.number().int().min(0).max(86_400),
  })
  .superRefine((value, ctx) => {
    if (value.centerSource === 'map_pick' && value.centerLatitude === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['centerLatitude'],
        message: 'Hãy chọn tâm vùng trên bản đồ hoặc nhập vĩ độ.',
      });
    }

    if (value.centerSource === 'map_pick' && value.centerLongitude === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['centerLongitude'],
        message: 'Hãy chọn tâm vùng trên bản đồ hoặc nhập kinh độ.',
      });
    }
  });

export type AllowedZoneFormValues = z.infer<typeof allowedZoneFormSchema>;

export const createAllowedZoneFormDefaults = (
  zone: VehicleAllowedZone | null | undefined,
  preview: VehicleAllowedZonePreviewCenter | null | undefined,
): AllowedZoneFormValues => ({
  centerSource: zone?.centerSource ?? 'vehicle_position',
  centerLatitude:
    zone?.centerSource === 'map_pick'
      ? zone.centerLatitude
      : preview?.centerLatitude ?? zone?.centerLatitude ?? null,
  centerLongitude:
    zone?.centerSource === 'map_pick'
      ? zone.centerLongitude
      : preview?.centerLongitude ?? zone?.centerLongitude ?? null,
  radiusMeters: Math.round(zone?.radiusMeters ?? 500),
  alertMode: zone?.alertMode ?? 'transition_only',
  cooldownSec: zone?.cooldownSec ?? 600,
});

export const toAllowedZonePayload = (
  values: AllowedZoneFormValues,
): UpsertVehicleAllowedZonePayload => ({
  centerSource: values.centerSource,
  centerLatitude: values.centerSource === 'map_pick' ? values.centerLatitude ?? undefined : undefined,
  centerLongitude:
    values.centerSource === 'map_pick' ? values.centerLongitude ?? undefined : undefined,
  radiusMeters: Math.round(values.radiusMeters),
  alertMode: values.alertMode,
  cooldownSec: Math.round(values.cooldownSec),
});
