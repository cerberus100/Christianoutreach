/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  images: {
    domains: ['localhost', 's3.amazonaws.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  env: {
    CUSTOM_KEY: 'health-screening-system',
    // Explicitly expose environment variables to serverless functions
    JWT_SECRET: process.env.JWT_SECRET,
    APP_AWS_REGION: process.env.APP_AWS_REGION,
    APP_ACCESS_KEY_ID: process.env.APP_ACCESS_KEY_ID, 
    APP_SECRET_ACCESS_KEY: process.env.APP_SECRET_ACCESS_KEY,
    APP_DYNAMODB_TABLE_NAME: process.env.APP_DYNAMODB_TABLE_NAME,
    APP_DYNAMODB_CHURCHES_TABLE: process.env.APP_DYNAMODB_CHURCHES_TABLE,
    APP_DYNAMODB_USERS_TABLE: process.env.APP_DYNAMODB_USERS_TABLE,
    APP_S3_BUCKET_NAME: process.env.APP_S3_BUCKET_NAME,
  },
  experimental: {
    serverComponentsExternalPackages: ['@aws-sdk'],
  },
  headers: async () => {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
    ];
  },
  // Bundle analyzer (only in development)
  ...(process.env.ANALYZE === 'true' && process.env.NODE_ENV !== 'production' && {
    webpack: (config) => {
      try {
        const { BundleAnalyzerPlugin } = require('@next/bundle-analyzer')({
          enabled: true,
        });
        config.plugins.push(new BundleAnalyzerPlugin());
      } catch (error) {
        console.warn('Bundle analyzer not available:', error.message);
      }
      return config;
    },
  }),
};

module.exports = nextConfig; 