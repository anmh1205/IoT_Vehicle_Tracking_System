const normalizeQueryValue = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export const buildAlertQueueHref = ({
  deviceId,
  vehicleId,
  status = 'active',
  source,
}: {
  deviceId?: string | null;
  vehicleId?: string | null;
  status?: string | null;
  source?: 'obd' | 'system' | null;
}) => {
  const normalizedDeviceId = normalizeQueryValue(deviceId);
  const normalizedVehicleId = normalizeQueryValue(vehicleId);
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (normalizedDeviceId) {
    params.set('deviceId', normalizedDeviceId);
  } else if (normalizedVehicleId) {
    params.set('vehicleId', normalizedVehicleId);
  }

  if (source) {
    params.set('source', source);
  }

  const query = params.toString();
  return query ? `/dashboard/attention/queue?${query}` : '/dashboard/attention/queue';
};
