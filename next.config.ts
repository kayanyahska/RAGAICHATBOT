import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        pg: require.resolve('pg'),
        'pg/lib/utils': require.resolve('pg/lib/utils'),
      };
    }

    // Add fallback for pg/lib/utils
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pg/lib/utils': require.resolve('pg/lib/utils'),
    };

    return config;
  },
};

export default nextConfig;
