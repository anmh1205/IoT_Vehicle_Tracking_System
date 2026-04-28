export const VIOLATION_TYPE_LABELS: Record<string, string> = {
  speeding: 'Vượt tốc độ',
  harsh_braking: 'Phanh gấp',
  idle_too_long: 'Dừng quá lâu',
  geofence_enter: 'Vào vùng',
  geofence_exit: 'Rời vùng',
  zone_enter: 'Vào vùng',
  zone_exit: 'Rời vùng',
  zone_outside_periodic: 'Đang ở ngoài vùng',
  policy_radius_exit: 'Rời bán kính giám sát',
  policy_radius_outside: 'Ra ngoài bán kính giám sát',
  policy_admin_boundary_outside: 'Ra ngoài ranh giới quản trị',
  policy_distance_quota_near_limit: 'Sắp chạm hạn mức quãng đường',
  policy_distance_quota_exceeded: 'Vượt hạn mức quãng đường',
};

export const getViolationTypeLabel = (value: string | null | undefined): string => {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return 'Chưa xác định';
  }

  return (
    VIOLATION_TYPE_LABELS[normalized] ??
    normalized
      .replace(/^policy_/u, '')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
};
