/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const nextConfig = {
  transpilePackages: ['lucide-react'],
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'prisma', 'pg'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.logo.dev',
      },
    ],
  },
}

module.exports = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
})
