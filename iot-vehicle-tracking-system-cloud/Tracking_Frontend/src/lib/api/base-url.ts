import { isLoopbackHostname } from '@/lib/runtime/public-origin';

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/u, '');

export const normalizeDirectApiBase = (rawValue: string | undefined): string | null => {
  const value = String(rawValue ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/gu, '');

  if (!value) return null;

  const normalized = trimTrailingSlash(value);

  if (normalized.endsWith('/api/v1')) {
    return normalized;
  }

  if (normalized.endsWith('/api')) {
    return `${normalized}/v1`;
  }

  return `${normalized}/api/v1`;
};

const resolveApiBaseUrl = (): string => {
  const fromEnv = normalizeDirectApiBase(process.env.NEXT_PUBLIC_API_DIRECT_URL);
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (isLoopbackHostname(host)) {
      return 'http://localhost:4000/api/v1';
    }
  }

  return '/api/v1';
};

export const API_BASE_URL = resolveApiBaseUrl();

export const toApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
