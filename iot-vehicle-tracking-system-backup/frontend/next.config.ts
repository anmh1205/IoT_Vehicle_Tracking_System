import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.API_BASE_URL || 'http://localhost:4000/api/v1',
        NEXT_PUBLIC_WS_URL: process.env.WS_URL || 'http://localhost:4000',
    },
};

export default nextConfig;
