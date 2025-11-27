import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { PostHogProvider } from "@/app/providers/posthog";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from '@clerk/themes';
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from '@vercel/speed-insights/next';

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PointMax Velocity",
  description: "Financial dashboard",
};

// Mobile optimization - moved to separate export per Next.js 15
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: { colorPrimary: '#6366f1' }
      }}
      // Performance: Reduce client-side redirects
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          {/* Preconnect to improve performance */}
          <link rel="preconnect" href="https://sought-spider-1.clerk.accounts.dev" />
          <link rel="preconnect" href="https://us-assets.i.posthog.com" />
          <link rel="dns-prefetch" href="https://sought-spider-1.clerk.accounts.dev" />
        </head>
        <body className={`${font.className} antialiased`}>
          <PostHogProvider>
            <ThemeProvider
              defaultTheme="dark"
              storageKey="ui-theme"
            >
              {children}
              <Toaster />
              <Analytics />
              <SpeedInsights />
            </ThemeProvider>
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
