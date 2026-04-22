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

export const ALLOWED_ZONE_MIN_RADIUS_METERS = 1_000;
export const ALLOWED_ZONE_MAX_RADIUS_METERS = 2_000_000;

const allowedZoneCenterSourceValues = ['vehicle_position', 'map_pick'] as const satisfies readonly VehicleAllowedZoneCenterSource[];
const allowedZoneAlertModeValues = [
  'transition_only',
  'transition_and_recovery',
  'periodic_while_outside',
  'silent',
] as const satisfies readonly VehicleAllowedZoneAlertMode[];

export const clampAllowedZoneRadiusMeters = (value: number) => {
  if (!Number.isFinite(value)) {
    return ALLOWED_ZONE_MIN_RADIUS_METERS;
  }

  return Math.min(
    Math.max(Math.round(value), ALLOWED_ZONE_MIN_RADIUS_METERS),
    ALLOWED_ZONE_MAX_RADIUS_METERS,
  );
};

export const formatAllowedZoneRadius = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString('vi-VN', {
      maximumFractionDigits: value % 1_000 === 0 ? 0 : 1,
    })} km`;
  }

  return `${Math.round(value).toLocaleString('vi-VN')} m`;
};

export const allowedZoneFormSchema = z
  .object({
    centerSource: z.enum(allowedZoneCenterSourceValues),
    centerLatitude: z.number().min(-90).max(90).nullable(),
    centerLongitude: z.number().min(-180).max(180).nullable(),
    radiusMeters: z
      .number()
      .int()
      .min(ALLOWED_ZONE_MIN_RADIUS_METERS)
      .max(ALLOWED_ZONE_MAX_RADIUS_METERS),
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
  radiusMeters: clampAllowedZoneRadiusMeters(zone?.radiusMeters ?? ALLOWED_ZONE_MIN_RADIUS_METERS),
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
  radiusMeters: clampAllowedZoneRadiusMeters(values.radiusMeters),
  alertMode: values.alertMode,
  cooldownSec: Math.round(values.cooldownSec),
});
