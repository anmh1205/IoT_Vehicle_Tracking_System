import type { NextConfig } from 'next';

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
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://tracking-backend:3000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
