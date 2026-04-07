import type { NextConfig } from 'next';

const normalizeApiBaseForRewrite = (rawValue: string | undefined): string => {
  const value = String(rawValue ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '');

  if (!value) return 'http://tracking-backend:4000';
  if (value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://')) return value;

  return `https://${value}`;
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
  async rewrites() {
    const apiBase = normalizeApiBaseForRewrite(process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL);

    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
