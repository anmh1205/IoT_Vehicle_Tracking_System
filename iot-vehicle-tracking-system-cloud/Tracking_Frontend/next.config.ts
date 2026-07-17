import type { NextConfig } from 'next';

const INTERNAL_API_BASE = 'http://tracking-backend:4000';

export const normalizeApiBaseForRewrite = (rawValue: string | undefined): string => {
  const value = String(rawValue ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '');

  if (!value) return INTERNAL_API_BASE;
  if (value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://')) return value;

  return `https://${value}`;
};

const isPublicThingdockApi = (value: string): boolean => {
  try {
    return new URL(value).hostname === 'api.thingdock.dev';
  } catch {
    return false;
  }
};

export const resolveApiBaseForRewrite = (): string => {
  const serverApiBase =
    process.env.NEXT_SERVER_API_URL ||
    process.env.NEXT_INTERNAL_API_URL ||
    process.env.API_INTERNAL_URL;

  if (serverApiBase) {
    return normalizeApiBaseForRewrite(serverApiBase);
  }

  const publicApiBase = normalizeApiBaseForRewrite(
    process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL,
  );

  return isPublicThingdockApi(publicApiBase) ? INTERNAL_API_BASE : publicApiBase;
};

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: '*.localhost' },
      { protocol: 'https', hostname: 'tracking.local' },
      { protocol: 'https', hostname: '*.tracking.local' },
    ],
  },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/dashboard/command', permanent: false },
      { source: '/dashboard/map', destination: '/dashboard/operations/map', permanent: false },
      { source: '/dashboard/trips', destination: '/dashboard/operations/trips', permanent: false },
      { source: '/dashboard/trips/:id', destination: '/dashboard/operations/trips/:id', permanent: false },
      { source: '/dashboard/geofences', destination: '/dashboard/zones', permanent: false },
      { source: '/dashboard/geofences/:id', destination: '/dashboard/zones', permanent: false },
      { source: '/dashboard/operations/geofences', destination: '/dashboard/zones', permanent: false },
      { source: '/dashboard/operations/geofences/:id', destination: '/dashboard/zones', permanent: false },
      { source: '/dashboard/devices', destination: '/dashboard/fleet/devices', permanent: false },
      { source: '/dashboard/devices/:id', destination: '/dashboard/fleet/devices/:id', permanent: false },
      { source: '/dashboard/vehicles', destination: '/dashboard/fleet/vehicles', permanent: false },
      { source: '/dashboard/vehicles/:id', destination: '/dashboard/fleet/vehicles/:id', permanent: false },
      { source: '/dashboard/drivers', destination: '/dashboard/fleet/drivers', permanent: false },
      { source: '/dashboard/customers', destination: '/dashboard/fleet/customers', permanent: false },
      { source: '/dashboard/customers/:id', destination: '/dashboard/fleet/customers/:id', permanent: false },
      { source: '/dashboard/alerts', destination: '/dashboard/attention/queue', permanent: false },
      { source: '/dashboard/maintenance', destination: '/dashboard/attention/maintenance', permanent: false },
      { source: '/dashboard/maintenance/:id', destination: '/dashboard/attention/maintenance/:id', permanent: false },
      { source: '/dashboard/violations', destination: '/dashboard/attention/violations', permanent: false },
      { source: '/dashboard/notifications', destination: '/dashboard/attention/notifications', permanent: false },
      { source: '/dashboard/system-status', destination: '/dashboard/platform/system-status', permanent: false },
      { source: '/dashboard/admin/system-status', destination: '/dashboard/platform/system-status', permanent: false },
      { source: '/dashboard/firmware', destination: '/dashboard/platform/firmware', permanent: false },
      { source: '/dashboard/exports', destination: '/dashboard/platform/exports', permanent: false },
      { source: '/dashboard/simulator', destination: '/dashboard/platform/simulator', permanent: false },
      { source: '/dashboard/users', destination: '/dashboard/platform/users', permanent: false },
      { source: '/dashboard/admin/users', destination: '/dashboard/platform/users', permanent: false },
      { source: '/dashboard/system-admin', destination: '/dashboard/platform/system-admin', permanent: false },
      { source: '/dashboard/admin/system', destination: '/dashboard/platform/system-admin', permanent: false },
      { source: '/dashboard/settings', destination: '/dashboard/platform/my-settings', permanent: false },
    ];
  },
  async rewrites() {
    const apiBase = resolveApiBaseForRewrite();

    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
