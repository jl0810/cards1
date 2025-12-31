/** @type {import('next').NextConfig} */
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  transpilePackages: ["lucide-react"],
  serverExternalPackages: ["pg"],
  experimental: {
    optimizePackageImports: ["lucide-react", "@mantine/core", "framer-motion"],
  },

  // Production optimizations
  productionBrowserSourceMaps: true, // Enable for source map upload
  compress: true,
  poweredByHeader: false,

  // Better caching
  generateEtags: true,

  // Performance: Remove console logs in production
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.logo.dev",
      },
    ],
  },

  // Note: Security headers are handled in middleware.ts for proper auth security
  async redirects() {
    return [
      {
        source: "/register",
        destination: "/signup",
        permanent: true,
      },
    ];
  },
};

const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG || "default",
  project: process.env.SENTRY_PROJECT || "cards",
  sentryUrl: process.env.GLITCHTIP_URL || "https://errors.raydoug.com",
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
