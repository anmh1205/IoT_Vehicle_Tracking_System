export interface BrowserLocationLike {
  hostname: string;
  origin: string;
  protocol: string;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const readBrowserLocation = (): BrowserLocationLike | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location;
};

export const isLoopbackHostname = (hostname: string | null | undefined): boolean =>
  LOOPBACK_HOSTS.has(String(hostname ?? '').trim().toLowerCase());

export const normalizePublicOrigin = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\/+$/g, '');

  return normalized || null;
};

const isLoopbackOrigin = (value: string): boolean => {
  try {
    return isLoopbackHostname(new URL(value).hostname);
  } catch {
    return false;
  }
};

export const resolvePublicApiOrigin = (
  rawValue: string | null | undefined,
  browserLocation: BrowserLocationLike | null = readBrowserLocation(),
): string | null => {
  const normalized = normalizePublicOrigin(rawValue);

  if (normalized) {
    if (!browserLocation) {
      return normalized;
    }

    if (!isLoopbackOrigin(normalized) || isLoopbackHostname(browserLocation.hostname)) {
      return normalized;
    }
  }

  if (!browserLocation) {
    return null;
  }

  if (
    browserLocation.hostname === 'thingdock.dev' ||
    browserLocation.hostname.endsWith('.thingdock.dev')
  ) {
    return `${browserLocation.protocol}//api.thingdock.dev`;
  }

  if (isLoopbackHostname(browserLocation.hostname)) {
    return 'http://localhost:4000';
  }

  return browserLocation.origin;
};
