import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { PostHogProvider } from "@/app/providers/posthog";
import { AuthProvider } from "@/app/providers/auth-provider";
import { Toaster } from "sonner";
import { SkipLink } from "@/components/shared/skip-link";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CardsGoneCrazy",
  description: "Financial dashboard",
};

// Mobile optimization - moved to separate export per Next.js 15
export const viewport = {
  width: "device-width",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to improve performance */}
        <link rel="preconnect" href="https://us-assets.i.posthog.com" />
      </head>
      <body className={`${font.className} antialiased`}>
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <AuthProvider>
          <PostHogProvider>
            <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
              {children}
              <Toaster />
            </ThemeProvider>
          </PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
