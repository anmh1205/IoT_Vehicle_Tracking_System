type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const firstText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstText(item);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      const message = firstText(item);
      if (message) {
        return message;
      }
    }
  }

  return null;
};

const getErrorPayload = (error: unknown): UnknownRecord | null => {
  const response = (error as { response?: { data?: unknown } })?.response?.data;
  if (!isRecord(response)) {
    return null;
  }

  if (isRecord(response.error)) {
    return response.error;
  }

  return response;
};

const unwrapDetails = (value: unknown): unknown => {
  if (!isRecord(value)) {
    return value;
  }

  if ('details' in value) {
    return unwrapDetails(value.details);
  }

  return value;
};

export const getApiFieldErrors = (error: unknown): Record<string, string> => {
  const payload = getErrorPayload(error);
  const errors = payload?.errors;

  if (Array.isArray(errors)) {
    const output: Record<string, string> = {};
    for (const item of errors) {
      if (!isRecord(item)) {
        continue;
      }

      const field = firstText(item.field) ?? 'general';
      const message = firstText(item.message);
      if (!message || output[field]) {
        continue;
      }

      output[field] = message;
    }

    if (Object.keys(output).length > 0) {
      return output;
    }
  }

  const details = unwrapDetails(payload?.details);
  if (!isRecord(details)) {
    return {};
  }

  const output: Record<string, string> = {};
  for (const [field, value] of Object.entries(details)) {
    const message = firstText(value);
    if (message) {
      output[field] = message;
    }
  }

  return output;
};

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const fieldErrors = getApiFieldErrors(error);
  const firstFieldError = Object.values(fieldErrors)[0];
  if (firstFieldError) {
    return firstFieldError;
  }

  const payload = getErrorPayload(error);
  const message =
    firstText(payload?.detail) ??
    firstText(payload?.message) ??
    firstText((error as { message?: unknown })?.message);

  return message ?? fallback;
};

export const getApiErrorDescription = (error: unknown, maxItems = 3): string | undefined => {
  const fieldErrors = getApiFieldErrors(error);
  const entries = Object.entries(fieldErrors);

  if (entries.length === 0) {
    return undefined;
  }

  return entries
    .slice(0, maxItems)
    .map(([field, message]) => `${field}: ${message}`)
    .join(' · ');
};
