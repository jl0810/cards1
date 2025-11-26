/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const nextConfig = {
  transpilePackages: ['lucide-react'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'prisma', 'pg'],
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  
  // Better caching
  generateEtags: true,
  
  // Performance: Modern JavaScript output
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Performance: Optimize bundles
  experimental: {
    optimizePackageImports: ['lucide-react', '@mantine/core', 'framer-motion'],
    // Modern output for better performance
    modernBuild: true,
  },
  
  // Reduce bundle size - target modern browsers
  browserslist: [
    'last 2 Chrome versions',
    'last 2 Firefox versions',
    'last 2 Safari versions',
    'last 2 Edge versions',
  ],
  
  // Optimize images  
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.logo.dev',
      },
    ],
  },
  
  // Note: Security headers are handled in middleware.ts (needed for Clerk auth)
}

module.exports = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
})
