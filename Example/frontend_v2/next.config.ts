import type { NextConfig } from 'next';

const normalizeUrl = (url?: string) => url?.trim().replace(/\/$/, '') ?? '';

const resolveApiBaseUrl = () => {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_API_BASE_URL;
  if (apiBase && apiBase.trim()) return normalizeUrl(apiBase);
  return normalizeUrl('http://localhost:3000');
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com'
      }
    ]
  },
  transpilePackages: ['geist'],
  async rewrites() {
    const apiBase = resolveApiBaseUrl();
    if (!apiBase) return [];

    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      }
    ];
  }
};

export default nextConfig;
