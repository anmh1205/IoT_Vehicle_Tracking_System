import type { SystemAdminSetting, VmSettingResource } from '@/lib/api/system-admin';

export const VICTORIA_METRICS_GROUP = 'victoria_metrics';

export const formatSettingValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
};

export const parseSettingValue = (raw: string): unknown => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
};

export const inferVmSettingResource = (key: string): VmSettingResource => {
  const lowered = key.toLowerCase();

  if (lowered.includes('retention')) {
    return 'retention';
  }
  if (lowered.includes('tenant')) {
    return 'tenant';
  }
  if (lowered.includes('access') || lowered.includes('vmauth') || lowered.includes('auth')) {
    return 'access';
  }
  if (lowered.includes('rule') || lowered.includes('alert') || lowered.includes('recording')) {
    return 'rule';
  }
  if (lowered.includes('template') || lowered.includes('query')) {
    return 'query-template';
  }

  return 'datasource';
};

export const isVictoriaMetricsSetting = (setting: SystemAdminSetting): boolean =>
  setting.groupName === VICTORIA_METRICS_GROUP;
