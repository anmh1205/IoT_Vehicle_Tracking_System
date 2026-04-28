import { z } from 'zod';
import type {
  UpsertVehicleZonePayload,
  VehicleZone,
  VehicleZoneAlertMode,
  VehicleZoneCenterSource,
  VehicleZonePreviewCircleCenter,
  ZoneBoundarySelection,
  VehicleZoneType,
} from '@/lib/api/zones';

export const allowedZoneAlertModeOptions: Array<{
  value: VehicleZoneAlertMode;
  label: string;
  description: string;
}> = [
  {
    value: 'transition_only',
    label: 'Chỉ cảnh báo khi ra ngoài vùng',
    description: 'Giảm nhiễu, phù hợp cho phần lớn xe vận hành bình thường.',
  },
  {
    value: 'transition_and_recovery',
    label: 'Cảnh báo khi ra và khi quay lại',
    description: 'Hữu ích khi cần biết cả lúc vượt vùng và lúc xe đã trở về.',
  },
  {
    value: 'periodic_while_outside',
    label: 'Lặp lại khi còn ở ngoài vùng',
    description: 'Dành cho xe cần theo dõi chặt, chấp nhận nhiều thông báo hơn.',
  },
  {
    value: 'silent',
    label: 'Im lặng',
    description: 'Vẫn đánh giá trạng thái nhưng không phát cảnh báo realtime.',
  },
];

export const ALLOWED_ZONE_MIN_RADIUS_METERS = 1_000;
export const ALLOWED_ZONE_MAX_RADIUS_METERS = 2_000_000;

const allowedZoneTypeValues = ['circle', 'administrative_boundary'] as const satisfies readonly VehicleZoneType[];
const allowedZoneCenterSourceValues = ['vehicle_position', 'map_pick'] as const satisfies readonly VehicleZoneCenterSource[];
const allowedZoneAlertModeValues = [
  'transition_only',
  'transition_and_recovery',
  'periodic_while_outside',
  'silent',
] as const satisfies readonly VehicleZoneAlertMode[];

const boundarySelectionSchema = z.object({
  provider: z.string().trim().min(1),
  unitCode: z.string().trim().min(1),
  unitName: z.string().trim().min(1),
  fullName: z.string().nullable(),
  level: z.enum(['province', 'district', 'ward']),
  parentCode: z.string().nullable(),
});

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

export const getZoneTypeLabel = (zoneType: VehicleZoneType | null | undefined) => {
  if (zoneType === 'administrative_boundary') {
    return 'Địa lý hành chính';
  }

  return 'Bán kính';
};

export const formatBoundarySelectionLabel = (selection: Pick<ZoneBoundarySelection, 'fullName' | 'unitName'>) =>
  selection.fullName?.trim() || selection.unitName;

export const describeBoundarySelections = (
  selections: ZoneBoundarySelection[] | null | undefined,
) => {
  const normalizedSelections = Array.isArray(selections) ? selections : [];
  if (normalizedSelections.length === 0) {
    return 'Chưa chọn địa giới';
  }

  if (normalizedSelections.length === 1) {
    return formatBoundarySelectionLabel(normalizedSelections[0]);
  }

  return `${formatBoundarySelectionLabel(normalizedSelections[0])} +${normalizedSelections.length - 1}`;
};

export const allowedZoneFormSchema = z
  .object({
    zoneType: z.enum(allowedZoneTypeValues),
    centerSource: z.enum(allowedZoneCenterSourceValues),
    centerLatitude: z.number().min(-90).max(90).nullable(),
    centerLongitude: z.number().min(-180).max(180).nullable(),
    radiusMeters: z
      .number()
      .int()
      .min(ALLOWED_ZONE_MIN_RADIUS_METERS)
      .max(ALLOWED_ZONE_MAX_RADIUS_METERS),
    boundarySelections: z.array(boundarySelectionSchema).max(100),
    alertMode: z.enum(allowedZoneAlertModeValues),
    cooldownSec: z.number().int().min(0).max(86_400),
  })
  .superRefine((value, ctx) => {
    if (value.zoneType === 'circle' && value.centerSource === 'map_pick' && value.centerLatitude === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['centerLatitude'],
        message: 'Hãy chọn tâm vùng trên bản đồ hoặc nhập vĩ độ.',
      });
    }

    if (value.zoneType === 'circle' && value.centerSource === 'map_pick' && value.centerLongitude === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['centerLongitude'],
        message: 'Hãy chọn tâm vùng trên bản đồ hoặc nhập kinh độ.',
      });
    }

    if (value.zoneType === 'administrative_boundary' && value.boundarySelections.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['boundarySelections'],
        message: 'Hãy chọn ít nhất một đơn vị hành chính.',
      });
    }
  });

export type AllowedZoneFormValues = z.infer<typeof allowedZoneFormSchema>;

export const createAllowedZoneFormDefaults = (
  zone: VehicleZone | null | undefined,
  preview: VehicleZonePreviewCircleCenter | null | undefined,
): AllowedZoneFormValues => ({
  zoneType: zone?.zoneType ?? 'circle',
  centerSource: zone?.centerSource ?? 'vehicle_position',
  centerLatitude:
    zone?.zoneType === 'circle'
      ? zone.centerSource === 'map_pick'
        ? zone.circleCenterLatitude
        : preview?.circleCenterLatitude ?? zone.circleCenterLatitude ?? null
      : null,
  centerLongitude:
    zone?.zoneType === 'circle'
      ? zone.centerSource === 'map_pick'
        ? zone.circleCenterLongitude
        : preview?.circleCenterLongitude ?? zone.circleCenterLongitude ?? null
      : null,
  radiusMeters: clampAllowedZoneRadiusMeters(zone?.radiusMeters ?? ALLOWED_ZONE_MIN_RADIUS_METERS),
  boundarySelections: zone?.zoneType === 'administrative_boundary' ? zone.boundarySelections : [],
  alertMode: zone?.alertMode ?? 'transition_only',
  cooldownSec: zone?.cooldownSec ?? 600,
});

export const toAllowedZonePayload = (
  values: AllowedZoneFormValues,
): UpsertVehicleZonePayload => {
  if (values.zoneType === 'administrative_boundary') {
    return {
      zoneType: 'administrative_boundary',
      boundarySelections: values.boundarySelections.map((selection) => ({
        provider: selection.provider,
        unitCode: selection.unitCode,
      })),
      alertMode: values.alertMode,
      cooldownSec: Math.round(values.cooldownSec),
    };
  }

  return {
    zoneType: 'circle',
    centerSource: values.centerSource,
    circleCenterLatitude:
      values.centerSource === 'map_pick' ? values.centerLatitude ?? undefined : undefined,
    circleCenterLongitude:
      values.centerSource === 'map_pick' ? values.centerLongitude ?? undefined : undefined,
    radiusMeters: clampAllowedZoneRadiusMeters(values.radiusMeters),
    alertMode: values.alertMode,
    cooldownSec: Math.round(values.cooldownSec),
  };
};
