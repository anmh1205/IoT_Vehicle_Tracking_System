const OBD_SAMPLE_AGE_SENTINEL_MS = 0xffffffff;

export const normalizeObdSampleAgeMs = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed >= OBD_SAMPLE_AGE_SENTINEL_MS ? undefined : parsed;
};
